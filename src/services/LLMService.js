/**
 * LLM Service for Dynamic Story Generation
 *
 * This service handles communication with Google Gemini API
 * for generating dynamic story content after Chapter 1.
 *
 * Supports two modes:
 * 1. Proxy mode (secure): Calls your Cloudflare Worker proxy
 * 2. Direct mode (dev): Calls Gemini API directly with embedded key
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';
import { llmTrace } from '../utils/llmTrace';

const LLM_CONFIG_KEY = 'dead_letters_llm_config';
const OFFLINE_QUEUE_KEY = 'dead_letters_offline_queue';
const CACHE_STORAGE_KEY = 'dead_letters_llm_caches';

// Get configuration from environment (baked in at build time)
const ENV_API_KEY = Constants.expoConfig?.extra?.geminiApiKey || null;
const ENV_PROXY_URL = Constants.expoConfig?.extra?.geminiProxyUrl || null;
const ENV_APP_TOKEN = Constants.expoConfig?.extra?.appToken || null;

// DEBUG: Log what was loaded from environment
console.log('[LLMService] Environment loaded:', {
  hasProxyUrl: !!ENV_PROXY_URL,
  proxyUrl: ENV_PROXY_URL,
  hasApiKey: !!ENV_API_KEY,
});

// Default configuration - using Gemini 3 Flash
const DEFAULT_CONFIG = {
  provider: 'gemini',
  model: 'gemini-3-flash-preview', // Gemini 3 Flash (latest)
  apiKey: ENV_API_KEY, // Only used in direct mode (dev)
  proxyUrl: ENV_PROXY_URL, // Cloudflare Worker URL (production)
  appToken: ENV_APP_TOKEN, // Optional auth token for proxy
  baseUrl: null, // For custom endpoints (direct mode only)
  maxRetries: 3, // 3 retries for network issues (root cause fixes reduce need for more)
  timeout: 300000, // 300 seconds (5 min) - matches Vercel maxDuration for long generations
};

class LLMService {
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.initialized = false;

    // ========== RATE LIMITING ==========
    // Prevents burst requests from overwhelming the API during preloading
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.lastRequestTime = 0;
    this.minRequestInterval = 500; // Minimum 500ms between requests
    this.maxConcurrentRequests = 2; // Max concurrent API calls
    this.activeRequests = 0;

    // ========== OFFLINE HANDLING ==========
    this.isOnline = true;
    this.offlineQueue = []; // Queue of requests to retry when back online
    this.offlineListeners = new Set(); // Callbacks for offline/online state changes
    // Callbacks cannot be persisted; keep a best-effort in-memory registry for this session.
    this.offlineCallbackRegistry = new Map(); // callbackId -> function
    this.networkUnsubscribe = null;
    this._setupNetworkListener();

    // ========== CONTEXT CACHING ==========
    // Explicit context caching for cost optimization
    this.caches = new Map(); // In-memory cache registry: cacheKey -> { name, expireTime, metadata }
    this.cacheInitialized = false;
  }

  /**
   * Setup network state listener for offline handling
   */
  _setupNetworkListener() {
    try {
      this.networkUnsubscribe = NetInfo.addEventListener(state => {
        const wasOnline = this.isOnline;
        this.isOnline = state.isConnected && state.isInternetReachable !== false;

        console.log(`[LLMService] Network state changed: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}`);

        // Notify listeners of state change
        this.offlineListeners.forEach(listener => {
          try {
            listener(this.isOnline);
          } catch (e) {
            console.warn('[LLMService] Error in offline listener:', e);
          }
        });

        // Process offline queue when coming back online
        if (!wasOnline && this.isOnline) {
          console.log('[LLMService] Back online, processing offline queue...');
          this._processOfflineQueue();
        }
      });
    } catch (error) {
      console.warn('[LLMService] Failed to setup network listener:', error);
      // Assume online if we can't detect network state
      this.isOnline = true;
    }
  }

  /**
   * Subscribe to offline/online state changes
   * @param {Function} callback - Called with (isOnline: boolean)
   * @returns {Function} Unsubscribe function
   */
  onNetworkStateChange(callback) {
    this.offlineListeners.add(callback);
    // Immediately call with current state
    callback(this.isOnline);
    return () => this.offlineListeners.delete(callback);
  }

  /**
   * Check if device is currently online
   */
  async checkOnline() {
    try {
      const state = await NetInfo.fetch();
      this.isOnline = state.isConnected && state.isInternetReachable !== false;
      return this.isOnline;
    } catch {
      return this.isOnline;
    }
  }

  /**
   * Add a request to the offline queue for later processing
   */
  async _queueOfflineRequest(requestData) {
    // Never persist function references (AsyncStorage JSON cannot serialize them).
    const safeData = { ...(requestData || {}) };
    if (typeof safeData.callback === 'function') {
      // Register callback for this session and persist only an id.
      const callbackId = safeData.callbackId || `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      this.offlineCallbackRegistry.set(callbackId, safeData.callback);
      safeData.callbackId = callbackId;
      delete safeData.callback;
    } else if (safeData.callback) {
      // If something non-function was provided, drop it (avoid persisting junk).
      delete safeData.callback;
    }

    const queueItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      data: safeData,
      retryCount: 0,
    };

    this.offlineQueue.push(queueItem);

    // Persist queue to storage
    try {
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.warn('[LLMService] Failed to persist offline queue:', error);
    }

    console.log(`[LLMService] Request queued for offline retry (${this.offlineQueue.length} items in queue)`);
    return queueItem.id;
  }

  /**
   * Load offline queue from storage on init
   */
  async _loadOfflineQueue() {
    try {
      const saved = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      if (saved) {
        this.offlineQueue = JSON.parse(saved);
        // Filter out stale requests (older than 24 hours)
        const cutoff = Date.now() - (24 * 60 * 60 * 1000);
        this.offlineQueue = this.offlineQueue.filter(item => item.timestamp > cutoff);
        console.log(`[LLMService] Loaded ${this.offlineQueue.length} items from offline queue`);
      }
    } catch (error) {
      console.warn('[LLMService] Failed to load offline queue:', error);
      this.offlineQueue = [];
    }
  }

  /**
   * Process offline queue when back online
   */
  async _processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;

    console.log(`[LLMService] Processing ${this.offlineQueue.length} queued offline requests...`);

    const itemsToProcess = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const item of itemsToProcess) {
      if (!this.isOnline) {
        // Went offline again, re-queue remaining items
        this.offlineQueue.push(item);
        continue;
      }

      try {
        // Attempt to process the queued request
        // Note: callbacks are best-effort and only available within the same app session.
        const callbackId = item?.data?.callbackId;
        if (callbackId) {
          const cb = this.offlineCallbackRegistry.get(callbackId);
          if (typeof cb === 'function') {
            await cb();
            // Callback succeeded; remove it so we don't repeat work.
            this.offlineCallbackRegistry.delete(callbackId);
          } else {
            console.warn('[LLMService] Offline queue item has callbackId but no in-memory callback (likely app restart). Dropping item.');
          }
        }
      } catch (error) {
        console.warn(`[LLMService] Failed to process offline queue item:`, error);
        // Re-queue if still has retries left
        if (item.retryCount < 3) {
          item.retryCount++;
          this.offlineQueue.push(item);
        }
      }
    }

    // Update persisted queue
    try {
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.warn('[LLMService] Failed to update offline queue:', error);
    }
  }

  /**
   * Get current offline queue status
   */
  getOfflineQueueStatus() {
    return {
      isOnline: this.isOnline,
      queuedRequests: this.offlineQueue.length,
      oldestRequest: this.offlineQueue.length > 0
        ? new Date(this.offlineQueue[0].timestamp).toISOString()
        : null,
    };
  }

  /**
   * Clear the offline queue
   */
  async clearOfflineQueue() {
    this.offlineQueue = [];
    this.offlineCallbackRegistry.clear();
    try {
      await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
    } catch (error) {
      console.warn('[LLMService] Failed to clear offline queue:', error);
    }
  }

  /**
   * Cleanup on service destruction
   */
  destroy() {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }
    this.offlineListeners.clear();
    this.offlineCallbackRegistry.clear();
  }

  /**
   * Rate-limited request wrapper
   * Ensures requests are spaced out to avoid 429 errors during preloading bursts
   */
  async _rateLimitedRequest(requestFn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ requestFn, resolve, reject });
      this._processQueue();
    });
  }

  /**
   * Process the request queue with rate limiting
   */
  async _processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      // Wait if we're at max concurrent requests
      if (this.activeRequests >= this.maxConcurrentRequests) {
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }

      // Enforce minimum interval between requests
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.minRequestInterval) {
        await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
      }

      const { requestFn, resolve, reject } = this.requestQueue.shift();
      this.activeRequests++;
      this.lastRequestTime = Date.now();

      // Execute the request
      requestFn()
        .then(result => {
          this.activeRequests--;
          resolve(result);
        })
        .catch(error => {
          this.activeRequests--;
          reject(error);
        });
    }

    this.isProcessingQueue = false;
  }

  /**
   * Initialize the service with saved configuration
   */
  async init() {
    if (this.initialized) return;

    try {
      const savedConfig = await AsyncStorage.getItem(LLM_CONFIG_KEY);
      if (savedConfig) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) };
      }

      // Enforce Gemini-only configuration for this app.
      if (this.config.provider !== 'gemini') {
        console.warn('[LLMService] Non-gemini provider found in saved config. Forcing provider="gemini".');
        this.config.provider = 'gemini';
      }
      if (typeof this.config.model !== 'string' || !this.config.model.toLowerCase().includes('gemini')) {
        this.config.model = DEFAULT_CONFIG.model;
      }

      // Load any persisted offline queue
      await this._loadOfflineQueue();

      // Check initial network state
      await this.checkOnline();

      this.initialized = true;
    } catch (error) {
      console.warn('[LLMService] Failed to load config:', error);
      this.initialized = true;
    }
  }

  /**
   * Update configuration
   */
  async setConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    try {
      // Don't persist the API key in plain text - in production use secure storage
      const configToSave = { ...this.config };
      await AsyncStorage.setItem(LLM_CONFIG_KEY, JSON.stringify(configToSave));
    } catch (error) {
      console.warn('[LLMService] Failed to save config:', error);
    }
  }

  /**
   * Set API key
   */
  setApiKey(apiKey) {
    this.config.apiKey = apiKey;
  }

  /**
   * Check if service is configured and ready
   */
  isConfigured() {
    // Proxy mode (production) does not require an API key on-device.
    // Direct mode requires a key.
    return !!this.config.proxyUrl || !!this.config.apiKey;
  }

  /**
   * Make a completion request to the LLM
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Generation options
   * @param {number} options.temperature - Sampling temperature (0-1)
   * @param {number} options.maxTokens - Maximum tokens to generate
   * @param {string} options.systemPrompt - System prompt to prepend
   * @param {Object} options.responseSchema - JSON schema for structured output (Gemini)
   */
  async complete(messages, options = {}) {
    await this.init();

    if (!this.isConfigured()) {
      throw new Error('LLM Service not configured. Please set a Gemini API key.');
    }

    // Check network connectivity before attempting request
    const isOnline = await this.checkOnline();
    if (!isOnline) {
      const error = new Error('OFFLINE: No internet connection. Story generation requires network access. Please check your connection and try again.');
      error.isOffline = true;
      error.canRetry = true;

      // Optionally queue the request for later if a callback is provided
      if (options.offlineCallback) {
        await this._queueOfflineRequest({
          callback: options.offlineCallback,
          chapter: options.chapter,
          subchapter: options.subchapter,
        });
        error.queued = true;
        error.message = 'OFFLINE: Request queued. Will automatically retry when back online.';
      }

      throw error;
    }

    const {
      temperature = 0.8,
      maxTokens = null,  // null = let Gemini decide based on prompt instructions
      systemPrompt = null,
      responseSchema = null,
      traceId = null,
      requestContext = null,
    } = options;

    if (this.config.provider === 'gemini') {
      // Use rate-limited request wrapper to prevent API overload during preloading bursts
      return this._rateLimitedRequest(() =>
        this._geminiComplete(messages, { temperature, maxTokens, systemPrompt, responseSchema, traceId, requestContext })
      );
    }

    throw new Error(`Unknown LLM provider: ${this.config.provider}`);
  }

  /**
   * Google Gemini API completion
   * Supports structured output via responseSchema for guaranteed valid JSON responses
   * Special handling for Gemini 3 models (temperature=1.0, thinkingConfig)
   *
   * Routes through proxy if configured (production), otherwise direct API (dev)
   */
  async _geminiComplete(messages, { temperature, maxTokens, systemPrompt, responseSchema, traceId, requestContext }) {
    const model = this.config.model || 'gemini-3-flash-preview';

    // DEBUG: Log config to see what mode we're in
    console.log('[LLMService] Config:', {
      proxyUrl: this.config.proxyUrl,
      hasApiKey: !!this.config.apiKey,
      model,
    });

    // Check if using Gemini 3 model
    const isGemini3 = model.includes('gemini-3');

    // Determine effective temperature.
    // Per Gemini guidance for these models, temperature must be 1.0.
    // We force it here so callers can't accidentally send lower values.
    const effectiveTemperature = 1.0;

    // ========== PROXY MODE (Production - Secure) ==========
    if (this.config.proxyUrl) {
      return this._callViaProxy(messages, {
        model,
        temperature: effectiveTemperature,
        maxTokens,
        systemPrompt,
        responseSchema,
        traceId,
        requestContext,
      });
    }

    // ========== DIRECT MODE (Development) ==========
    // Gemini API endpoint
    const baseUrl = this.config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';

    // Convert messages to Gemini format
    const contents = this._convertToGeminiFormat(messages, systemPrompt);

    // Build generation config
    const generationConfig = {
      temperature: effectiveTemperature,
      maxOutputTokens: maxTokens,
      topP: 0.95,
      topK: 40,
    };

    // Add thinking configuration for Gemini 3
    if (isGemini3) {
      generationConfig.thinkingConfig = {
        thinkingLevel: 'medium', // Balance quality with speed
      };
    }

    // Add structured output configuration if schema provided
    if (responseSchema) {
      generationConfig.responseMimeType = 'application/json';
      generationConfig.responseSchema = responseSchema;
    }

    if (traceId) {
      llmTrace('LLMService', traceId, 'llm.direct.request.plan', {
        provider: 'gemini',
        mode: 'direct',
        model,
        messageCount: messages?.length || 0,
        maxTokens,
        hasSchema: !!responseSchema,
        temperature: effectiveTemperature,
        requestContext,
      }, 'debug');
    }

    let lastError = null;
    const MAX_RATE_LIMIT_WAITS = 3; // Maximum times we'll wait for rate limits before failing
    let rateLimitWaitCount = 0;
    let attempt = 0;

    // Use while loop to avoid infinite loop from attempt-- going negative
    while (attempt < this.config.maxRetries) {
      let controller;
      let timeoutId;
      try {
        controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(
          `${baseUrl}/models/${model}:generateContent?key=${this.config.apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents,
              generationConfig,
              safetySettings: [
                {
                  category: 'HARM_CATEGORY_HARASSMENT',
                  threshold: 'BLOCK_ONLY_HIGH',
                },
                {
                  category: 'HARM_CATEGORY_HATE_SPEECH',
                  threshold: 'BLOCK_ONLY_HIGH',
                },
                {
                  category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                  threshold: 'BLOCK_ONLY_HIGH',
                },
                {
                  category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                  threshold: 'BLOCK_ONLY_HIGH',
                },
              ],
            }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        // Handle rate limiting specifically (429 errors)
        // Rate limit waits don't count toward retry limit, but have their own cap
        if (response.status === 429) {
          rateLimitWaitCount++;
          if (rateLimitWaitCount > MAX_RATE_LIMIT_WAITS) {
            throw new Error(`API rate limit exceeded after ${MAX_RATE_LIMIT_WAITS} waits. Please try again later or check your API quota.`);
          }
          const retryAfterHeader = response.headers.get('Retry-After');
          const retryAfter = Math.min(parseInt(retryAfterHeader || '60', 10), 120); // Cap at 2 minutes
          console.warn(`[LLMService] Rate limited (429), waiting ${retryAfter}s before retry (${rateLimitWaitCount}/${MAX_RATE_LIMIT_WAITS})...`);
          await this._sleep(retryAfter * 1000);
          // Don't increment attempt - rate limit waits are separate from retries
          continue;
        }

        // Handle quota exhaustion (403 with quota message)
        if (response.status === 403) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error?.message || '';
          if (errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('limit')) {
            rateLimitWaitCount++;
            if (rateLimitWaitCount > MAX_RATE_LIMIT_WAITS) {
              throw new Error(`API quota exhausted after ${MAX_RATE_LIMIT_WAITS} waits. Please check your API quota and try again later.`);
            }
            console.warn(`[LLMService] API quota exhausted, waiting 60s before retry (${rateLimitWaitCount}/${MAX_RATE_LIMIT_WAITS})...`);
            await this._sleep(60000);
            // Don't increment attempt - quota waits are separate from retries
            continue;
          }
          throw new Error(`Gemini API access denied: ${errorMessage}`);
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
          throw new Error(`Gemini API error: ${errorMessage}`);
        }

        const data = await response.json();

        // Check for blocked content
        if (data.promptFeedback?.blockReason) {
          throw new Error(`Content blocked: ${data.promptFeedback.blockReason}`);
        }

        // Extract the generated text
        const candidate = data.candidates?.[0];
        if (!candidate) {
          throw new Error('No response generated');
        }

        if (candidate.finishReason === 'SAFETY') {
          throw new Error('Response blocked due to safety filters');
        }

        // Check for truncated responses - this is critical for JSON responses
        const finishReason = candidate.finishReason;
        const isTruncated = finishReason === 'MAX_TOKENS' ||
                           finishReason === 'LENGTH' ||
                           finishReason === 'RECITATION';

        let content = candidate.content?.parts?.[0]?.text || '';

        // If response was truncated and we expect JSON, try to repair it
        if (isTruncated && responseSchema) {
          console.warn(`[LLMService] Response truncated (${finishReason}), attempting JSON repair...`);
          content = this._repairTruncatedJson(content);
        }

        if (traceId) {
          llmTrace('LLMService', traceId, 'llm.direct.response.ok', {
            model,
            finishReason,
            isTruncated,
            contentLength: content?.length || 0,
            usage: {
              promptTokens: data.usageMetadata?.promptTokenCount,
              completionTokens: data.usageMetadata?.candidatesTokenCount,
              totalTokens: data.usageMetadata?.totalTokenCount,
            },
            requestContext,
          }, 'debug');
        }

        return {
          content,
          usage: {
            promptTokens: data.usageMetadata?.promptTokenCount,
            completionTokens: data.usageMetadata?.candidatesTokenCount,
            totalTokens: data.usageMetadata?.totalTokenCount,
          },
          model,
          finishReason,
          isTruncated,
        };
      } catch (error) {
        // Always clean up timeout to prevent accumulation
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        lastError = error;
        if (traceId) {
          llmTrace('LLMService', traceId, 'llm.direct.response.error', {
            model,
            attempt,
            error: error?.message,
            name: error?.name,
            requestContext,
          }, 'warn');
        }
        if (error.name === 'AbortError') {
          throw new Error('Request timed out');
        }
        // Increment attempt counter for actual failures (not rate limits)
        attempt++;
        // Exponential backoff before next retry
        if (attempt < this.config.maxRetries) {
          await this._sleep(Math.pow(2, attempt - 1) * 1000);
        }
      }
    }

    throw lastError || new Error('Failed to complete request');
  }

  /**
   * Call Gemini API via secure Cloudflare Worker proxy
   * Used in production to keep API key secure
   *
   * Uses NDJSON streaming with heartbeats to prevent mobile network timeouts.
   * Mobile networks often kill idle connections after 30-40 seconds,
   * but Gemini's "thinking" phase can take 20-60 seconds.
   */
  async _callViaProxy(messages, { model, temperature, maxTokens, systemPrompt, responseSchema, traceId, requestContext, cachedContent }) {
    let lastError = null;
    let attempt = 0;
    const operationStart = Date.now();
    const localRequestId = `llm_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`;

    console.log(`[LLMService] [${localRequestId}] Starting: ${model}, ${messages.length} msgs${responseSchema ? ', structured' : ''}`);

    if (traceId) {
      llmTrace('LLMService', traceId, 'llm.proxy.request.plan', {
        provider: 'gemini',
        mode: 'proxy',
        model,
        messageCount: messages?.length || 0,
        maxTokens,
        hasSchema: !!responseSchema,
        temperature,
        localRequestId,
        requestContext,
      }, 'debug');
    }

    while (attempt < this.config.maxRetries) {
      let controller;
      let timeoutId;
      const attemptStart = Date.now();

      try {
        controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        // Build request headers
        const headers = {
          'Content-Type': 'application/json',
        };

        // Add app token for extra security if configured
        if (this.config.appToken) {
          headers['X-App-Token'] = this.config.appToken;
        }

        if (attempt > 0) {
          console.log(`[LLMService] [${localRequestId}] Retry ${attempt + 1}/${this.config.maxRetries}...`);
        }

        if (traceId) {
          llmTrace('LLMService', traceId, 'llm.proxy.request.start', {
            attempt: attempt + 1,
            maxRetries: this.config.maxRetries,
            proxyUrl: this.config.proxyUrl,
            timeout: this.config.timeout,
            localRequestId,
            streaming: true,
          }, 'info');
        }

        const response = await fetch(this.config.proxyUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            messages: messages.map(m => ({
              role: m.role,
              content: m.content,
            })),
            model,
            temperature,
            maxTokens,
            systemPrompt,
            responseSchema,
            cachedContent, // Optional: cached content reference for context caching
            stream: true, // Enable streaming with heartbeats to prevent mobile timeouts
            clientTraceId: traceId || null,
            clientRequestContext: requestContext || null,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // For streaming responses, we need to read the full body as text and parse NDJSON
        // Add a timeout for body reading since the fetch signal only applies to the initial request
        const bodyReadStart = Date.now();
        const bodyReadTimeout = 180000; // 3 minutes for body read (proxy timeout is 2 min)

        let responseText;
        try {
          responseText = await Promise.race([
            response.text(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Response body read timeout')), bodyReadTimeout)
            )
          ]);
        } catch (bodyError) {
          const bodyReadTime = Date.now() - bodyReadStart;
          console.error(`[LLMService] [${localRequestId}] Body read failed after ${bodyReadTime}ms: ${bodyError.message}`);
          throw bodyError;
        }

        const networkTime = Date.now() - attemptStart;

        // Parse NDJSON - split by newlines and parse each line
        const lines = responseText.split('\n').filter(line => line.trim());
        let data = null;
        let heartbeatCount = 0;

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === 'heartbeat') {
              heartbeatCount++;
              // Heartbeats just keep connection alive, ignore them
              continue;
            } else if (parsed.type === 'error') {
              // Error response from proxy
              console.error(`[LLMService] [${localRequestId}] Proxy stream error: ${parsed.error}`);
              throw new Error(parsed.error || 'Proxy returned error in stream');
            } else if (parsed.type === 'response') {
              // This is the actual response
              data = parsed;
              break;
            } else if (parsed.success !== undefined) {
              // Non-streaming fallback format (backwards compatibility)
              data = parsed;
              break;
            }
          } catch (parseErr) {
            console.warn(`[LLMService] [${localRequestId}] Failed to parse NDJSON line: ${line.substring(0, 100)}`);
          }
        }

        // Handle rate limiting (from non-streaming error path)
        if (response.status === 429) {
          const retryAfter = Math.min(data?.retryAfter || 60, 120);
          console.warn(`[LLMService] [${localRequestId}] Rate limited (429), waiting ${retryAfter}s before retry...`);
          if (traceId) {
            llmTrace('LLMService', traceId, 'llm.proxy.rate_limited', {
              retryAfter,
              attempt: attempt + 1,
              localRequestId,
            }, 'warn');
          }
          await this._sleep(retryAfter * 1000);
          continue;
        }

        // Handle other HTTP errors
        if (!response.ok) {
          const errorMsg = data?.error || `Proxy error: ${response.status}`;
          const proxyRequestId = data?.requestId || 'unknown';
          console.error(`[LLMService] [${localRequestId}] Proxy error: ${errorMsg} (proxy requestId: ${proxyRequestId})`);
          if (traceId) {
            llmTrace('LLMService', traceId, 'llm.proxy.error', {
              status: response.status,
              error: errorMsg,
              proxyRequestId,
              attempt: attempt + 1,
              localRequestId,
            }, 'error');
          }
          throw new Error(errorMsg);
        }

        // Validate we got actual data
        if (!data || !data.success) {
          console.error(`[LLMService] [${localRequestId}] No valid response in stream`);
          throw new Error(data?.error || 'No valid response received from proxy');
        }

        // Check for truncated responses
        const isTruncated = data.finishReason === 'MAX_TOKENS' ||
                           data.finishReason === 'LENGTH';

        let content = data.content || '';
        const contentLength = content.length;

        // If response was truncated and we expect JSON, try to repair it
        if (isTruncated && responseSchema) {
          console.warn(`[LLMService] [${localRequestId}] Truncated response, repairing JSON...`);
          content = this._repairTruncatedJson(content);
        }

        // Validate JSON if schema was provided
        let jsonValid = true;
        if (responseSchema && content) {
          try {
            JSON.parse(content);
          } catch (parseErr) {
            jsonValid = false;
            console.warn(`[LLMService] [${localRequestId}] JSON invalid - StoryGenerationService will repair`);
          }
        }

        const totalTime = Date.now() - operationStart;
        // Single consolidated success log
        console.log(`[LLMService] [${localRequestId}] Complete: ${totalTime}ms, ${contentLength} chars${heartbeatCount > 0 ? `, ${heartbeatCount} heartbeats` : ''}${!jsonValid ? ' (needs repair)' : ''}`);

        if (traceId) {
          llmTrace('LLMService', traceId, 'llm.proxy.response.ok', {
            model,
            finishReason: data.finishReason || 'STOP',
            isTruncated,
            contentLength: content?.length || 0,
            proxyRequestId: data.requestId,
            timing: data.timing,
            totalTimeMs: totalTime,
            attempt: attempt + 1,
            localRequestId,
            heartbeatCount,
            requestContext,
          }, 'debug');
        }

        return {
          content,
          usage: data.usage || {},
          model,
          finishReason: data.finishReason || 'STOP',
          isTruncated,
          requestId: data.requestId,
          timing: data.timing,
        };

      } catch (error) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        lastError = error;
        const attemptTime = Date.now() - attemptStart;

        if (traceId) {
          llmTrace('LLMService', traceId, 'llm.proxy.response.error', {
            model,
            attempt: attempt + 1,
            attemptTimeMs: attemptTime,
            error: error?.message,
            name: error?.name,
            localRequestId,
            requestContext,
          }, 'warn');
        }

        if (error.name === 'AbortError') {
          console.error(`[LLMService] [${localRequestId}] Request timed out after ${attemptTime}ms (timeout: ${this.config.timeout}ms)`);
          if (traceId) {
            llmTrace('LLMService', traceId, 'llm.proxy.timeout', {
              timeoutMs: this.config.timeout,
              attemptTimeMs: attemptTime,
              attempt: attempt + 1,
              localRequestId,
            }, 'error');
          }
          throw new Error('Request timed out');
        }

        attempt++;
        if (attempt < this.config.maxRetries) {
          const backoffDelay = Math.pow(2, attempt - 1) * 1000;
          console.warn(`[LLMService] [${localRequestId}] Attempt ${attempt} failed after ${attemptTime}ms: ${error.message}. Retrying in ${backoffDelay/1000}s...`);
          if (traceId) {
            llmTrace('LLMService', traceId, 'llm.proxy.retry', {
              attempt: attempt + 1,
              maxRetries: this.config.maxRetries,
              backoffMs: backoffDelay,
              previousError: error.message,
              localRequestId,
            }, 'warn');
          }
          await this._sleep(backoffDelay);
        } else {
          console.error(`[LLMService] [${localRequestId}] All ${this.config.maxRetries} attempts failed. Last error: ${error.message}`);
          if (traceId) {
            llmTrace('LLMService', traceId, 'llm.proxy.all_retries_exhausted', {
              totalAttempts: this.config.maxRetries,
              lastError: error.message,
              localRequestId,
            }, 'error');
          }
        }
      }
    }

    const totalTime = Date.now() - operationStart;
    console.error(`[LLMService] [${localRequestId}] Request failed after ${totalTime}ms and ${this.config.maxRetries} attempts`);
    throw lastError || new Error('Failed to complete proxy request');
  }

  /**
   * Convert standard messages format to Gemini format
   */
  _convertToGeminiFormat(messages, systemPrompt) {
    const contents = [];

    // Gemini handles system prompts by prepending to the first user message
    // or using a special system instruction format
    let systemInstruction = systemPrompt || '';

    // Extract any system messages from the messages array
    const nonSystemMessages = messages.filter(m => {
      if (m.role === 'system') {
        systemInstruction = systemInstruction
          ? `${systemInstruction}\n\n${m.content}`
          : m.content;
        return false;
      }
      return true;
    });

    // Build the contents array
    for (let i = 0; i < nonSystemMessages.length; i++) {
      const msg = nonSystemMessages[i];
      let text = msg.content;

      // Prepend system instruction to the first user message
      if (i === 0 && systemInstruction && msg.role === 'user') {
        text = `${systemInstruction}\n\n---\n\n${text}`;
      }

      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text }],
      });
    }

    // If no messages but we have a system prompt, create a user message
    if (contents.length === 0 && systemInstruction) {
      contents.push({
        role: 'user',
        parts: [{ text: systemInstruction }],
      });
    }

    return contents;
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Attempt to repair truncated JSON responses
   * This is critical for handling Gemini responses that exceed token limits
   */
  _repairTruncatedJson(content) {
    if (!content || typeof content !== 'string') {
      return content;
    }

    let json = content.trim();

    // If it's already valid JSON, return as-is
    try {
      JSON.parse(json);
      return json;
    } catch {
      // Continue with repair
    }

    // Count open/close brackets to determine what's missing
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < json.length; i++) {
      const char = json[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') openBraces++;
        else if (char === '}') openBraces--;
        else if (char === '[') openBrackets++;
        else if (char === ']') openBrackets--;
      }
    }

    // If we're inside a string, try to close it
    if (inString) {
      // Find the last quote and see if we can salvage the content
      const lastQuoteIndex = json.lastIndexOf('"');
      if (lastQuoteIndex > 0) {
        // Check if the content before the last quote looks like a complete value
        const beforeQuote = json.substring(0, lastQuoteIndex);
        // Truncate to the last complete sentence or word
        const truncatedNarrative = this._truncateToLastSentence(json.substring(json.lastIndexOf('narrative') + 12, lastQuoteIndex));
        if (truncatedNarrative.length > 100) {
          // Reconstruct with truncated narrative
          const narrativeStart = json.lastIndexOf('"narrative"');
          if (narrativeStart > 0) {
            const narrativeValueStart = json.indexOf('"', narrativeStart + 11);
            if (narrativeValueStart > 0) {
              json = json.substring(0, narrativeValueStart + 1) + truncatedNarrative + '"';
            }
          }
        } else {
          json += '"';
        }
      } else {
        json += '"';
      }
      inString = false;
    }

    // Remove any trailing commas before closing brackets
    json = json.replace(/,\s*$/, '');

    // Close any unclosed arrays and objects
    // First, add any missing array closures
    for (let i = 0; i < openBrackets; i++) {
      // Check if we need to add empty array content
      if (json.endsWith('[') || json.endsWith(',')) {
        json = json.replace(/,\s*$/, '');
      }
      json += ']';
    }

    // Then close any unclosed objects
    for (let i = 0; i < openBraces; i++) {
      // Check if we need to clean up incomplete properties
      if (json.endsWith(':') || json.endsWith(',')) {
        json = json.replace(/[:,]\s*$/, '');
      }
      json += '}';
    }

    // Final cleanup: remove trailing commas before closing brackets/braces
    json = json.replace(/,(\s*[\]}])/g, '$1');

    // Verify the repaired JSON is valid and has required content
    try {
      const parsed = JSON.parse(json);

      // Validate required fields exist and have meaningful content
      const validationIssues = [];

      // Check for narrative field (most critical)
      if (!parsed.narrative) {
        validationIssues.push('Missing narrative field');
      } else if (typeof parsed.narrative === 'string' && parsed.narrative.length < 200) {
        validationIssues.push(`Narrative too short after repair: ${parsed.narrative.length} chars`);
      }

      // Check for title field
      if (!parsed.title || parsed.title.length < 3) {
        validationIssues.push('Missing or invalid title field');
      }

      // If this appears to be a decision point, check decision structure
      // Decision points have stricter requirements - truncation here is critical
      if (parsed.decision) {
        if (!parsed.decision.intro) {
          validationIssues.push('Decision missing intro');
          // Try to add a placeholder intro if missing
          parsed.decision.intro = 'A critical choice lies ahead.';
        }
        if (!parsed.decision.optionA?.title) {
          validationIssues.push('Decision missing optionA title');
          // Create placeholder optionA if missing
          if (!parsed.decision.optionA) parsed.decision.optionA = {};
          parsed.decision.optionA.key = 'A';
          parsed.decision.optionA.title = 'Take direct action';
          parsed.decision.optionA.focus = 'Prioritizes immediate resolution. Risks escalation.';
        }
        if (!parsed.decision.optionA?.focus) {
          validationIssues.push('Decision optionA missing focus');
          parsed.decision.optionA.focus = 'Prioritizes decisive action. Risks unforeseen consequences.';
        }
        if (!parsed.decision.optionB?.title) {
          validationIssues.push('Decision missing optionB title');
          // Create placeholder optionB if missing
          if (!parsed.decision.optionB) parsed.decision.optionB = {};
          parsed.decision.optionB.key = 'B';
          parsed.decision.optionB.title = 'Proceed with caution';
          parsed.decision.optionB.focus = 'Prioritizes careful approach. Risks losing momentum.';
        }
        if (!parsed.decision.optionB?.focus) {
          validationIssues.push('Decision optionB missing focus');
          parsed.decision.optionB.focus = 'Prioritizes careful analysis. Risks delay.';
        }
        // Re-serialize with repaired decision
        json = JSON.stringify(parsed);
      }

      // Log any validation issues as warnings (don't fail the repair)
      if (validationIssues.length > 0) {
        console.warn('[LLMService] JSON repair succeeded but with issues:', validationIssues);
      } else {
        console.log('[LLMService] JSON repair successful with all required fields');
      }

      return json;
    } catch (error) {
      console.warn('[LLMService] JSON repair failed, returning original:', error.message);
      // Return original content and let the parser handle the fallback
      return content;
    }
  }

  /**
   * Truncate text to the last complete sentence
   */
  _truncateToLastSentence(text) {
    if (!text) return '';

    // Find the last sentence-ending punctuation
    const lastPeriod = text.lastIndexOf('.');
    const lastExclamation = text.lastIndexOf('!');
    const lastQuestion = text.lastIndexOf('?');

    const lastEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);

    if (lastEnd > text.length * 0.5) {
      // Only truncate if we're keeping at least half the content
      return text.substring(0, lastEnd + 1);
    }

    return text;
  }

  // ========== CONTEXT CACHING METHODS ==========

  /**
   * Initialize cache storage (load existing caches from AsyncStorage)
   */
  async _initializeCacheStorage() {
    if (this.cacheInitialized) return;

    try {
      const stored = await AsyncStorage.getItem(CACHE_STORAGE_KEY);
      if (stored) {
        const cacheData = JSON.parse(stored);
        // Only restore non-expired caches
        const now = Date.now();
        for (const [key, value] of Object.entries(cacheData)) {
          const expireTime = new Date(value.expireTime).getTime();
          if (expireTime > now) {
            this.caches.set(key, value);
          } else {
            console.log(`[LLMService] Cache expired: ${key}`);
          }
        }
        console.log(`[LLMService] Loaded ${this.caches.size} active caches from storage`);
      }
    } catch (error) {
      console.warn('[LLMService] Failed to load cache storage:', error);
    }

    this.cacheInitialized = true;
  }

  /**
   * Save cache registry to AsyncStorage
   */
  async _saveCacheStorage() {
    try {
      const cacheData = Object.fromEntries(this.caches);
      await AsyncStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('[LLMService] Failed to save cache storage:', error);
    }
  }

  /**
   * Create a new cache for static content
   * @param {Object} config - Cache configuration
   * @param {string} config.key - Unique cache key
   * @param {string} config.model - Model to use
   * @param {string} config.systemInstruction - System prompt
   * @param {string} config.content - Static content to cache
   * @param {string} config.ttl - Time to live (e.g., '3600s' for 1 hour)
   * @param {Object} config.metadata - Optional metadata for cache identification
   * @returns {Promise<Object>} Cache object with name and expireTime
   */
  async createCache({ key, model, systemInstruction, content, ttl = '3600s', metadata = {} }) {
    await this._initializeCacheStorage();

    // Check if cache already exists and is valid
    const existing = this.caches.get(key);
    if (existing) {
      const expireTime = new Date(existing.expireTime).getTime();
      if (expireTime > Date.now()) {
        console.log(`[LLMService] ♻️ Reusing existing cache: ${key} (expires: ${existing.expireTime})`);
        return existing;
      } else {
        console.log(`[LLMService] Cache expired, creating new: ${key}`);
      }
    }

    console.log(`[LLMService] 🔧 Creating new cache: ${key} (ttl: ${ttl})`);

    try {
      let cache;

      // Use proxy if configured (production), otherwise direct API (dev)
      if (this.config.proxyUrl) {
        console.log('[LLMService] Creating cache via proxy');

        const headers = {
          'Content-Type': 'application/json',
        };

        if (this.config.appToken) {
          headers['X-App-Token'] = this.config.appToken;
        }

        const response = await fetch(this.config.proxyUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            operation: 'createCache',
            cacheKey: key,
            model,
            systemInstruction,
            content,
            ttl,
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(`Cache creation failed: ${response.status} - ${error.error || error.details || 'Unknown error'}`);
        }

        const result = await response.json();
        cache = result.cache;

      } else {
        console.log('[LLMService] Creating cache via direct API');

        // Use the v1alpha endpoint for caching
        const baseUrl = this.config.baseUrl || 'https://generativelanguage.googleapis.com/v1alpha';

        const response = await fetch(`${baseUrl}/cachedContents`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.config.apiKey,
          },
          body: JSON.stringify({
            model: `models/${model}`,
            system_instruction: {
              parts: [{ text: systemInstruction }],
            },
            contents: [
              {
                role: 'user',
                parts: [{ text: content }],
              },
            ],
            ttl,
            display_name: key,
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(`Cache creation failed: ${response.status} - ${error.error?.message || 'Unknown error'}`);
        }

        cache = await response.json();
      }

      // Store cache info
      const cacheInfo = {
        name: cache.name,
        expireTime: cache.expireTime,
        createTime: cache.createTime,
        updateTime: cache.updateTime,
        key,
        model,
        metadata,
      };

      this.caches.set(key, cacheInfo);
      await this._saveCacheStorage();

      console.log(`[LLMService] ✅ Cache created: ${cache.name}`);
      console.log(`[LLMService]    Expires: ${cache.expireTime}`);
      console.log(`[LLMService]    Token count: ${cache.usageMetadata?.totalTokenCount || 'unknown'}`);

      return cacheInfo;
    } catch (error) {
      console.error('[LLMService] Failed to create cache:', error);
      throw error;
    }
  }

  /**
   * Get cache by key
   * @param {string} key - Cache key
   * @returns {Object|null} Cache info or null if not found/expired
   */
  async getCache(key) {
    await this._initializeCacheStorage();

    const cache = this.caches.get(key);
    if (!cache) return null;

    const expireTime = new Date(cache.expireTime).getTime();
    if (expireTime <= Date.now()) {
      console.log(`[LLMService] Cache expired: ${key}`);
      this.caches.delete(key);
      await this._saveCacheStorage();
      return null;
    }

    return cache;
  }

  /**
   * Update cache TTL
   * @param {string} key - Cache key
   * @param {string} ttl - New TTL (e.g., '3600s')
   */
  async updateCache(key, ttl) {
    await this._initializeCacheStorage();

    const cache = this.caches.get(key);
    if (!cache) {
      throw new Error(`Cache not found: ${key}`);
    }

    const baseUrl = this.config.baseUrl || 'https://generativelanguage.googleapis.com/v1alpha';

    try {
      const response = await fetch(`${baseUrl}/${cache.name}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.config.apiKey,
        },
        body: JSON.stringify({ ttl }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`Cache update failed: ${response.status} - ${error.error?.message || 'Unknown error'}`);
      }

      const updated = await response.json();
      cache.expireTime = updated.expireTime;
      cache.updateTime = updated.updateTime;

      this.caches.set(key, cache);
      await this._saveCacheStorage();

      console.log(`[LLMService] ✅ Cache updated: ${cache.name}, new expiry: ${cache.expireTime}`);
    } catch (error) {
      console.error('[LLMService] Failed to update cache:', error);
      throw error;
    }
  }

  /**
   * Delete cache
   * @param {string} key - Cache key
   */
  async deleteCache(key) {
    await this._initializeCacheStorage();

    const cache = this.caches.get(key);
    if (!cache) {
      console.warn(`[LLMService] Cache not found for deletion: ${key}`);
      return;
    }

    const baseUrl = this.config.baseUrl || 'https://generativelanguage.googleapis.com/v1alpha';

    try {
      const response = await fetch(`${baseUrl}/${cache.name}`, {
        method: 'DELETE',
        headers: {
          'x-goog-api-key': this.config.apiKey,
        },
      });

      if (!response.ok && response.status !== 404) {
        const error = await response.json().catch(() => ({}));
        console.warn(`[LLMService] Cache deletion warning: ${response.status} - ${error.error?.message || 'Unknown error'}`);
      }

      this.caches.delete(key);
      await this._saveCacheStorage();

      console.log(`[LLMService] ✅ Cache deleted: ${key}`);
    } catch (error) {
      console.error('[LLMService] Failed to delete cache:', error);
    }
  }

  /**
   * List all active caches
   */
  async listCaches() {
    await this._initializeCacheStorage();
    return Array.from(this.caches.values());
  }

  /**
   * Clean up expired caches
   */
  async cleanExpiredCaches() {
    await this._initializeCacheStorage();

    const now = Date.now();
    const expired = [];

    for (const [key, cache] of this.caches.entries()) {
      const expireTime = new Date(cache.expireTime).getTime();
      if (expireTime <= now) {
        expired.push(key);
      }
    }

    for (const key of expired) {
      await this.deleteCache(key);
    }

    console.log(`[LLMService] Cleaned ${expired.length} expired caches`);
  }

  /**
   * Generate content using cached context
   * @param {Object} params - Generation parameters
   * @param {string} params.cacheKey - Cache key to use
   * @param {string} params.dynamicPrompt - Dynamic prompt to append to cached content
   * @param {Object} params.options - Standard generation options
   * @returns {Promise<Object>} Generation response with usage metadata
   */
  async completeWithCache({ cacheKey, dynamicPrompt, options = {} }) {
    await this._initializeCacheStorage();

    const cache = await this.getCache(cacheKey);
    if (!cache) {
      throw new Error(`Cache not found or expired: ${cacheKey}`);
    }

    const model = options.model || cache.model || this.config.model;

    console.log(`[LLMService] 🎯 Generating with cache: ${cacheKey}`);

    // Use proxy mode if configured (production), otherwise direct API call (dev)
    if (this.config.proxyUrl) {
      console.log('[LLMService] Using proxy mode for cached generation');

      // Call via proxy with cachedContent parameter
      const response = await this._callViaProxy(
        [{ role: 'user', content: dynamicPrompt }],
        {
          model,
          temperature: 1.0, // Forced for Gemini 3
          maxTokens: options.maxTokens || 8192,
          systemPrompt: null, // System prompt is in cache
          responseSchema: options.responseSchema,
          cachedContent: cache.name,
          traceId: options.traceId,
          requestContext: options.requestContext,
        }
      );

      // Log token usage with cache metrics
      this._logCachedTokenUsage({
        promptTokenCount: response.usage.promptTokens,
        cachedContentTokenCount: response.usage.cachedTokens,
        candidatesTokenCount: response.usage.completionTokens,
        totalTokenCount: response.usage.totalTokens,
      }, cacheKey);

      return response;
    }

    // Direct mode (dev) - call Gemini API directly
    console.log('[LLMService] Using direct mode for cached generation');

    const isGemini3 = model.includes('gemini-3');

    // Build generation config
    const generationConfig = {
      temperature: 1.0, // Forced for Gemini 3
      maxOutputTokens: options.maxTokens || 8192,
      topP: 0.95,
      topK: 40,
    };

    // Add thinking configuration for Gemini 3
    if (isGemini3) {
      generationConfig.thinkingConfig = {
        thinkingLevel: options.thinkingLevel || 'medium',
      };
    }

    // Add structured output configuration if schema provided
    if (options.responseSchema) {
      generationConfig.responseMimeType = 'application/json';
      generationConfig.responseSchema = options.responseSchema;
    }

    const baseUrl = this.config.baseUrl || 'https://generativelanguage.googleapis.com/v1alpha';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(
        `${baseUrl}/models/${model}:generateContent?key=${this.config.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cached_content: cache.name,
            contents: [
              {
                role: 'user',
                parts: [{ text: dynamicPrompt }],
              },
            ],
            generationConfig,
            safetySettings: [
              {
                category: 'HARM_CATEGORY_HARASSMENT',
                threshold: 'BLOCK_ONLY_HIGH',
              },
              {
                category: 'HARM_CATEGORY_HATE_SPEECH',
                threshold: 'BLOCK_ONLY_HIGH',
              },
              {
                category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                threshold: 'BLOCK_ONLY_HIGH',
              },
              {
                category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                threshold: 'BLOCK_ONLY_HIGH',
              },
            ],
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`Generation failed: ${response.status} - ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();

      // Extract content
      const candidate = data.candidates?.[0];
      if (!candidate) {
        throw new Error('No candidate in response');
      }

      const content = candidate.content?.parts?.[0]?.text || '';
      const usage = data.usageMetadata || {};

      // Log token usage with cache metrics
      this._logCachedTokenUsage(usage, cacheKey);

      return {
        content,
        model: data.modelVersion || model,
        finishReason: candidate.finishReason,
        isTruncated: candidate.finishReason === 'MAX_TOKENS',
        usage: {
          promptTokens: usage.promptTokenCount || 0,
          cachedTokens: usage.cachedContentTokenCount || 0,
          completionTokens: usage.candidatesTokenCount || 0,
          totalTokens: usage.totalTokenCount || 0,
        },
      };
    } catch (error) {
      console.error('[LLMService] Cached generation failed:', error);
      throw error;
    }
  }

  /**
   * Log token usage with cache metrics
   */
  _logCachedTokenUsage(usage, cacheKey) {
    const promptTokens = usage.promptTokenCount || 0;
    const cachedTokens = usage.cachedContentTokenCount || 0;
    const newTokens = promptTokens - cachedTokens;
    const outputTokens = usage.candidatesTokenCount || 0;
    const totalTokens = usage.totalTokenCount || 0;

    const cacheHitRate = promptTokens > 0 ? ((cachedTokens / promptTokens) * 100).toFixed(1) : '0.0';

    // Calculate costs (Gemini 3 Flash pricing)
    const INPUT_RATE = 0.50 / 1_000_000;  // $0.50 per 1M tokens
    const CACHED_RATE = INPUT_RATE * 0.25; // 75% discount estimate
    const OUTPUT_RATE = 3.00 / 1_000_000;  // $3.00 per 1M tokens

    const newTokensCost = newTokens * INPUT_RATE;
    const cachedTokensCost = cachedTokens * CACHED_RATE;
    const outputTokensCost = outputTokens * OUTPUT_RATE;
    const totalCost = newTokensCost + cachedTokensCost + outputTokensCost;

    // Calculate what it would have cost without caching
    const noCacheCost = promptTokens * INPUT_RATE + outputTokensCost;
    const savings = noCacheCost - totalCost;
    const savingsPercent = noCacheCost > 0 ? ((savings / noCacheCost) * 100).toFixed(1) : '0.0';

    console.log(`[LLMService] 📊 Token Usage (Cache: ${cacheKey}):`);
    console.log(`  Input Tokens: ${promptTokens.toLocaleString()}`);
    console.log(`    ├─ Cached: ${cachedTokens.toLocaleString()} (${cacheHitRate}%)`);
    console.log(`    └─ New: ${newTokens.toLocaleString()}`);
    console.log(`  Output Tokens: ${outputTokens.toLocaleString()}`);
    console.log(`  Total: ${totalTokens.toLocaleString()}`);
    console.log(`  `);
    console.log(`  💰 Cost Breakdown:`);
    console.log(`    ├─ New tokens: $${newTokensCost.toFixed(6)}`);
    console.log(`    ├─ Cached tokens: $${cachedTokensCost.toFixed(6)}`);
    console.log(`    └─ Output tokens: $${outputTokensCost.toFixed(6)}`);
    console.log(`  Total: $${totalCost.toFixed(6)}`);
    console.log(`  `);
    console.log(`  💵 Savings: $${savings.toFixed(6)} (${savingsPercent}% reduction)`);
    console.log(`  Without cache: $${noCacheCost.toFixed(6)}`);
  }
}

// Singleton instance
export const llmService = new LLMService();
export default llmService;
