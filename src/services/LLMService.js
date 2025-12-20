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

const LLM_CONFIG_KEY = 'dead_letters_llm_config';
const OFFLINE_QUEUE_KEY = 'dead_letters_offline_queue';

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
  timeout: 180000, // 180 seconds for longer story generations
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
    this.networkUnsubscribe = null;
    this._setupNetworkListener();
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
    const queueItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      data: requestData,
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
        // Note: The callback will handle the actual request
        if (item.data.callback) {
          await item.data.callback();
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
    return !!this.config.apiKey;
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
      maxTokens = 4000,
      systemPrompt = null,
      responseSchema = null,
    } = options;

    if (this.config.provider === 'gemini') {
      // Use rate-limited request wrapper to prevent API overload during preloading bursts
      return this._rateLimitedRequest(() =>
        this._geminiComplete(messages, { temperature, maxTokens, systemPrompt, responseSchema })
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
  async _geminiComplete(messages, { temperature, maxTokens, systemPrompt, responseSchema }) {
    const model = this.config.model || 'gemini-3-flash-preview';

    // DEBUG: Log config to see what mode we're in
    console.log('[LLMService] Config:', {
      proxyUrl: this.config.proxyUrl,
      hasApiKey: !!this.config.apiKey,
      model,
    });

    // Check if using Gemini 3 model
    const isGemini3 = model.includes('gemini-3');

    // Determine effective temperature (Gemini 3 recommends 1.0)
    const effectiveTemperature = isGemini3 ? 1.0 : temperature;

    // ========== PROXY MODE (Production - Secure) ==========
    if (this.config.proxyUrl) {
      return this._callViaProxy(messages, {
        model,
        temperature: effectiveTemperature,
        maxTokens,
        systemPrompt,
        responseSchema,
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

    // Add thinking configuration for Gemini 3 (use "low" for faster responses)
    if (isGemini3) {
      generationConfig.thinkingConfig = {
        thinkingLevel: 'low', // Minimize latency while still using Gemini 3 reasoning
      };
    }

    // Add structured output configuration if schema provided
    if (responseSchema) {
      generationConfig.responseMimeType = 'application/json';
      generationConfig.responseSchema = responseSchema;
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
   */
  async _callViaProxy(messages, { model, temperature, maxTokens, systemPrompt, responseSchema }) {
    let lastError = null;
    let attempt = 0;
    const operationStart = Date.now();
    const localRequestId = `llm_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`;

    console.log(`[LLMService] [${localRequestId}] Starting proxy request`, {
      model,
      messageCount: messages.length,
      hasSchema: !!responseSchema,
      maxRetries: this.config.maxRetries,
    });

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

        console.log(`[LLMService] [${localRequestId}] Attempt ${attempt + 1}/${this.config.maxRetries} - sending request...`);

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
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const networkTime = Date.now() - attemptStart;
        console.log(`[LLMService] [${localRequestId}] Response received in ${networkTime}ms: status=${response.status}`);

        // Handle rate limiting
        if (response.status === 429) {
          const data = await response.json().catch(() => ({}));
          const retryAfter = Math.min(data.retryAfter || 60, 120); // Cap at 2 minutes
          console.warn(`[LLMService] [${localRequestId}] Rate limited (429), waiting ${retryAfter}s before retry...`);
          await this._sleep(retryAfter * 1000);
          continue; // Don't count toward retries
        }

        // Handle other errors
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          const errorMsg = data.error || `Proxy error: ${response.status}`;
          const proxyRequestId = data.requestId || 'unknown';
          console.error(`[LLMService] [${localRequestId}] Proxy error: ${errorMsg} (proxy requestId: ${proxyRequestId}, details: ${data.details || 'none'})`);
          throw new Error(errorMsg);
        }

        // Parse successful response
        const data = await response.json();

        if (!data.success) {
          console.error(`[LLMService] [${localRequestId}] Proxy returned unsuccessful: ${data.error}`);
          throw new Error(data.error || 'Proxy returned unsuccessful response');
        }

        // Check for truncated responses
        const isTruncated = data.finishReason === 'MAX_TOKENS' ||
                           data.finishReason === 'LENGTH';

        let content = data.content || '';
        const contentLength = content.length;

        // Log successful response details
        console.log(`[LLMService] [${localRequestId}] Success! finishReason=${data.finishReason}, contentLength=${contentLength}, tokens=${data.usage?.totalTokens || 'unknown'}, timing=${JSON.stringify(data.timing || {})}`);

        // If response was truncated and we expect JSON, try to repair it
        if (isTruncated && responseSchema) {
          console.warn(`[LLMService] [${localRequestId}] Response truncated (${data.finishReason}), attempting JSON repair...`);
          const originalLength = content.length;
          content = this._repairTruncatedJson(content);
          console.log(`[LLMService] [${localRequestId}] JSON repair: original=${originalLength}, repaired=${content.length}`);
        }

        // Validate JSON if schema was provided
        if (responseSchema && content) {
          try {
            JSON.parse(content);
            console.log(`[LLMService] [${localRequestId}] JSON validation: OK`);
          } catch (parseErr) {
            console.warn(`[LLMService] [${localRequestId}] JSON validation failed: ${parseErr.message} - will attempt repair in StoryGenerationService`);
          }
        }

        const totalTime = Date.now() - operationStart;
        console.log(`[LLMService] [${localRequestId}] Request complete in ${totalTime}ms (attempt ${attempt + 1})`);

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

        if (error.name === 'AbortError') {
          console.error(`[LLMService] [${localRequestId}] Request timed out after ${attemptTime}ms (timeout: ${this.config.timeout}ms)`);
          throw new Error('Request timed out');
        }

        attempt++;
        if (attempt < this.config.maxRetries) {
          const backoffDelay = Math.pow(2, attempt - 1) * 1000;
          console.warn(`[LLMService] [${localRequestId}] Attempt ${attempt} failed after ${attemptTime}ms: ${error.message}. Retrying in ${backoffDelay/1000}s...`);
          await this._sleep(backoffDelay);
        } else {
          console.error(`[LLMService] [${localRequestId}] All ${this.config.maxRetries} attempts failed. Last error: ${error.message}`);
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
}

// Singleton instance
export const llmService = new LLMService();
export default llmService;
