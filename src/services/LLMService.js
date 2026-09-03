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
import { fetch as expoFetch } from 'expo/fetch';
import EventSource from 'react-native-sse';
import {
  GEMINI_API_BASE,
  GEMINI_MODEL,
  clampMaxOutputTokens,
  isGemini3Model,
  normalizeThinkingLevel,
} from '../constants/gemini';
import { llmTrace, log } from '../utils/llmTrace';

const LLM_CONFIG_KEY = 'dead_letters_llm_config';
const OFFLINE_QUEUE_KEY = 'dead_letters_offline_queue';
const CACHE_STORAGE_KEY = 'dead_letters_llm_caches';

// Get configuration from environment (baked in at build time).
// Coerced to a non-empty string, never merely truthy: Expo's config
// normalization used to serialize an unset `extra` value as `{}`, which is
// truthy, so `|| null` kept it and `X-App-Token` went out as
// "[object Object]" on every request. app.config.js now omits unset keys;
// this is the second line of defense, since a manifest cached by an older
// build can still carry the old shape.
const envString = (value) => (typeof value === 'string' && value.trim().length ? value.trim() : null);
const ENV_API_KEY = envString(Constants.expoConfig?.extra?.geminiApiKey);
const ENV_PROXY_URL = envString(Constants.expoConfig?.extra?.geminiProxyUrl);
const ENV_APP_TOKEN = envString(Constants.expoConfig?.extra?.appToken);

// Default configuration - model id lives in src/constants/gemini.js
const DEFAULT_CONFIG = {
  provider: 'gemini',
  model: GEMINI_MODEL, // See src/constants/gemini.js for the model contract
  apiKey: ENV_API_KEY, // Only used in direct mode (dev)
  proxyUrl: ENV_PROXY_URL, // Cloudflare Worker URL (production)
  appToken: ENV_APP_TOKEN, // Optional auth token for proxy
  baseUrl: null, // For custom endpoints (direct mode only)
  maxRetries: 4, // 4 retries for mobile network resilience
  timeout: 300000, // 300 seconds (5 min) - matches Vercel maxDuration for long generations
};

/**
 * HTTP statuses worth retrying. Everything else from the API is deterministic:
 * a bad model id, an unsupported thinkingLevel, a deprecated generationConfig
 * field or a malformed schema will fail identically on every attempt, so
 * retrying one turns a single 400 into a dozen full requests, minutes of
 * backoff, and a burned rate-limit budget before the player sees the failure.
 */
const RETRYABLE_HTTP_STATUSES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

function isPermanentApiStatus(status) {
  return typeof status === 'number' && status >= 400 && status < 600 && !RETRYABLE_HTTP_STATUSES.has(status);
}

/** +/-25% so concurrent retries spread out instead of synchronizing. */
const withJitter = (ms) => Math.round(ms * (0.75 + Math.random() * 0.5));

/** Tag an error with the API status so the retry loop can stop on permanent failures. */
function applicationError(message, { status = null, details = null, permanent = null } = {}) {
  const err = new Error(message || 'Server returned error');
  err.isApplicationError = true;
  if (status != null) err.geminiStatus = status;
  if (details) err.details = details;
  // `permanent` lets the server mark a refusal that carries a 200: a safety or
  // recitation block is the model's answer, and retrying the same prompt only
  // buys the same refusal again.
  err.isPermanent = permanent === true || isPermanentApiStatus(status);
  return err;
}

/**
 * Join the answer text across every part of a candidate.
 *
 * A thinking model can return the answer split over several text parts, and can
 * put a thought part first. Reading parts[0].text alone therefore yields either
 * a fragment or an empty string — and a truncated fragment only gets JSON repair
 * when finishReason says MAX_TOKENS, so the loss is silent. Thought parts are
 * skipped; the thought signature is taken from whichever part carries one.
 */
function extractCandidateContent(candidate) {
  const parts = candidate?.content?.parts;
  if (!Array.isArray(parts) || parts.length === 0) {
    return { content: '', thoughtSignature: null };
  }
  const content = parts
    .filter((p) => p && p.thought !== true && typeof p.text === 'string')
    .map((p) => p.text)
    .join('');
  const withSignature = parts.find((p) => p && p.thoughtSignature);
  return { content, thoughtSignature: withSignature ? withSignature.thoughtSignature : null };
}

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

    // Bounded. Nothing ever trimmed this: a long offline stretch pushed an entry
    // per attempt and persisted the whole array to AsyncStorage each time, so the
    // write cost grew with the queue and the oldest requests (least likely to
    // still be wanted) were the ones kept.
    const MAX_OFFLINE_QUEUE = 20;
    this.offlineQueue.push(queueItem);
    if (this.offlineQueue.length > MAX_OFFLINE_QUEUE) {
      this.offlineQueue = this.offlineQueue.slice(-MAX_OFFLINE_QUEUE);
    }

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
      // The model id is owned by src/constants/gemini.js, not by the save file.
      // A persisted id from a previous build would otherwise outlive a model
      // upgrade and split the app across two models — the uncached calls on the
      // stale one, the cached ones on the new one.
      if (this.config.model !== GEMINI_MODEL) {
        if (this.config.model) {
          console.warn(`[LLMService] Persisted model "${this.config.model}" != "${GEMINI_MODEL}"; using the current model.`);
        }
        this.config.model = GEMINI_MODEL;
      }

      // Load any persisted offline queue
      await this._loadOfflineQueue();

      // Check initial network state
      await this.checkOnline();

      this.initialized = true;

      // Sweep the local cache registry. Nothing called this, so the persisted
      // map of context caches only ever grew: entries whose remote cache expired
      // hours ago stayed on disk and were still offered to completeWithCache,
      // which then had to discover the 404 the slow way.
      this.cleanExpiredCaches().catch((e) => {
        log.debug('LLMService', `Cache sweep skipped: ${e?.message}`);
      });
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
    // The model id is owned by src/constants/gemini.js. init() enforces this
    // against the save file, but setConfig could put any id straight on the
    // wire AND persist it, which is how a stale id would survive the next
    // upgrade. Same rule, both doors.
    if (this.config.model !== GEMINI_MODEL) {
      if (newConfig && 'model' in newConfig) {
        console.warn(`[LLMService] Ignoring model override "${newConfig.model}"; the model is pinned to "${GEMINI_MODEL}".`);
      }
      this.config.model = GEMINI_MODEL;
    }
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
   * @param {number} options.maxTokens - Maximum tokens to generate
   * @param {string} options.systemPrompt - System prompt to prepend
   * @param {Object} options.responseSchema - JSON schema for structured output (Gemini)
   * @param {('low'|'medium'|'high')} [options.thinkingLevel] - Reasoning depth; omit for Gemini's 'medium' default
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
      maxTokens = null,  // null = let Gemini decide based on prompt instructions
      systemPrompt = null,
      responseSchema = null,
      traceId = null,
      requestContext = null,
      thinkingLevel: requestedThinkingLevel = null,  // null = use Gemini's default ('medium'); override per-task when needed
    } = options;

    // Gemini 3.8 Flash accepts only low|medium|high. Anything else (notably
    // 'minimal', which older Gemini 3 models allowed) is a hard API validation
    // error, so fold it into the nearest supported level instead of failing.
    const thinkingLevel = normalizeThinkingLevel(requestedThinkingLevel);

    if (this.config.provider === 'gemini') {
      // Use rate-limited request wrapper to prevent API overload during preloading bursts
      return this._rateLimitedRequest(() =>
        this._geminiComplete(messages, { maxTokens, systemPrompt, responseSchema, traceId, requestContext, thinkingLevel })
      );
    }

    throw new Error(`Unknown LLM provider: ${this.config.provider}`);
  }

  /**
   * Google Gemini API completion
   * Supports structured output via responseSchema for guaranteed valid JSON responses
   * Per Gemini 3.x guidance we do not set sampling params (temperature/topP/topK/
   * candidateCount) — they are deprecated for this model family and lowering
   * temperature degrades reasoning. thinkingConfig is only sent when a task
   * explicitly requests a level (else Gemini's own 'medium' default applies).
   *
   * Routes through proxy if configured (production), otherwise direct API (dev)
   */
  async _geminiComplete(messages, { maxTokens, systemPrompt, responseSchema, traceId, requestContext, thinkingLevel }) {
    const model = this.config.model || GEMINI_MODEL;

    // Deliberately does not print the proxy URL. This was an unconditional
    // console.log at module scope and again per generation, so release builds
    // wrote the backend endpoint into device logs before the app had done
    // anything at all.
    log.debug('LLMService', `mode=${this.config.proxyUrl ? 'proxy' : 'direct'} model=${model}`);

    // Check if using Gemini 3 model
    const isGemini3 = isGemini3Model(model);

    // ========== PROXY MODE (Production - Secure) ==========
    if (this.config.proxyUrl) {
      return this._callViaProxy(messages, {
        model,
        maxTokens,
        systemPrompt,
        responseSchema,
        traceId,
        requestContext,
        thinkingLevel,  // Pass through for proxy to use (omitted => Gemini 'medium' default)
      });
    }

    // ========== DIRECT MODE (Development) ==========
    // Gemini API endpoint
    const baseUrl = this.config.baseUrl || GEMINI_API_BASE;

    // Convert messages to Gemini format
    const contents = this._convertToGeminiFormat(messages, systemPrompt);

    // Build generation config.
    // Per Gemini 3.x guidance, sampling params (temperature/topP/topK/candidateCount)
    // are deprecated and omitted so the model uses its tuned defaults.
    // maxOutputTokens is omitted entirely when unset — sending an explicit null
    // is rejected by the API — and clamped to the model's output ceiling.
    const clampedMaxTokens = clampMaxOutputTokens(maxTokens);
    const generationConfig = {
      ...(clampedMaxTokens != null && { maxOutputTokens: clampedMaxTokens }),
    };

    // Thinking configuration: only set when a task explicitly requests a level.
    // When omitted, Gemini applies its own 'medium' default.
    if (isGemini3 && thinkingLevel) {
      generationConfig.thinkingConfig = { thinkingLevel };
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
        thinkingLevel: thinkingLevel || 'medium',
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

        const extracted = extractCandidateContent(candidate);
        let content = extracted.content;
        // Capture thought signature for multi-call reasoning continuity (Gemini 3)
        const thoughtSignature = extracted.thoughtSignature;

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
            hasThoughtSignature: !!thoughtSignature,
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
          // Include thought signature for multi-call reasoning continuity (Gemini 3)
          thoughtSignature,
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
        // Exponential backoff before next retry - longer for mobile resilience: 2s, 4s, 8s, 16s
        if (attempt < this.config.maxRetries) {
          // Jittered: without it every concurrent caller woke at the same
          // instant and hit the same limit together, on every attempt.
          await this._sleep(withJitter(Math.pow(2, attempt - 1) * 2000));
        }
      }
    }

    throw lastError || new Error('Failed to complete request');
  }

  /**
   * Try SSE streaming using react-native-sse (XMLHttpRequest-based)
   * More reliable on Android than fetch-based streaming
   */
  async _trySSEStreaming(url, requestBody, headers, localRequestId, bodyReadStart, overallTimeoutMs = null) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      let heartbeatCount = 0;
      let hasCompleted = false;
      let lastDataTime = Date.now();

      console.log(`[LLMService] [${localRequestId}] Starting SSE stream (react-native-sse)...`);

      const bodyStr = typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody);

      // react-native-sse supports POST with body via options
      const es = new EventSource(url, {
        method: 'POST',
        headers: {
          ...headers,
          'Accept': 'text/event-stream',
        },
        body: bodyStr,
        pollingInterval: 0, // Disable auto-reconnect - we handle retries ourselves
      });

      // Timeout if no data received for 45 seconds (longer than heartbeat interval)
      const dataTimeout = setInterval(() => {
        const timeSinceData = Date.now() - lastDataTime;
        if (timeSinceData > 45000 && !hasCompleted) {
          console.error(`[LLMService] [${localRequestId}] SSE timeout: no data for ${Math.round(timeSinceData/1000)}s`);
          cleanup();
          reject(new Error('SSE stream timeout: no data received for 45 seconds'));
        }
      }, 5000);

      // Overall deadline. The AbortController the caller sets up is never wired
      // into react-native-sse (it takes no signal and defaults its own timeout to
      // 0), and the only other guard is the 45s idle timer, which the proxy's
      // 10s heartbeats keep resetting forever. Without this a single stuck
      // generation could hold the player past the proxy's whole budget.
      const deadline = Number.isFinite(overallTimeoutMs) && overallTimeoutMs > 0
        ? setTimeout(() => {
            if (hasCompleted) return;
            console.error(`[LLMService] [${localRequestId}] SSE deadline reached after ${Math.round(overallTimeoutMs / 1000)}s`);
            cleanup();
            reject(new Error('Request timed out'));
          }, overallTimeoutMs)
        : null;

      const cleanupHooks = [];
      const cleanup = () => {
        if (!hasCompleted) {
          hasCompleted = true;
          clearInterval(dataTimeout);
          if (deadline) clearTimeout(deadline);
          cleanupHooks.forEach((fn) => { try { fn(); } catch (_e) { /* best effort */ } });
          try {
            es.close();
          } catch (e) {
            // Ignore close errors
          }
        }
      };

      es.addEventListener('open', () => {
        console.log(`[LLMService] [${localRequestId}] SSE connection opened`);
        lastDataTime = Date.now();
      });

      es.addEventListener('message', (event) => {
        lastDataTime = Date.now();
        const data = event.data;

        if (!data) return;

        chunks.push(data);

        try {
          const parsed = JSON.parse(data);

          if (parsed.type === 'heartbeat') {
            heartbeatCount++;
            // Heartbeat logging is very spammy - only in verbose mode
            log.debug('LLMService', `[${localRequestId}] Heartbeat via SSE (${heartbeatCount})`);
          } else if (parsed.type === 'response' || parsed.success !== undefined) {
            // This is the actual response - resolve immediately!
            const elapsed = Date.now() - bodyReadStart;
            console.log(`[LLMService] [${localRequestId}] SSE response received at ${elapsed}ms, completing stream`);

            cleanup();

            // Build response text from all chunks including this one
            const responseText = chunks.join('\n');

            resolve({
              responseText,
              heartbeatCount,
              streamingMethod: 'sse',
              response: null,
            });
          } else if (parsed.type === 'error') {
            console.error(`[LLMService] [${localRequestId}] SSE error event: ${parsed.error}`);
            cleanup();
            reject(applicationError(parsed.error, {
              status: parsed.geminiStatus ?? null,
              details: parsed.details ?? null,
              permanent: parsed.permanent === true,
            }));
          }
        } catch (parseErr) {
          // Not JSON, just collect it - only log in verbose mode
          log.debug('LLMService', `[${localRequestId}] SSE raw data: ${data.substring(0, 100)}`);
        }
      });

      es.addEventListener('error', (event) => {
        if (hasCompleted) return;

        const elapsed = Date.now() - bodyReadStart;
        console.error(`[LLMService] [${localRequestId}] SSE error at ${elapsed}ms:`, event.message || event);

        cleanup();

        // react-native-sse surfaces any HTTP status >= 400 as an 'error' event
        // carrying xhrStatus and the response body. Rejecting with a plain Error
        // threw that away, so a 401 from a bad app token or a 400 from a bad
        // request looked like a dropped connection: replayed across all three
        // transports and every retry.
        const status = event?.xhrStatus;
        if (typeof status === 'number' && status >= 400) {
          let parsed = null;
          try { parsed = JSON.parse(event.message); } catch (_e) { /* not JSON */ }
          reject(applicationError(parsed?.error || `Proxy HTTP ${status}`, {
            status: parsed?.geminiStatus ?? status,
            details: parsed?.details ?? (typeof event.message === 'string' ? event.message.slice(0, 200) : null),
          }));
          return;
        }

        reject(new Error(event.message || 'SSE connection error'));
      });

      // A stream that ENDS without a terminal frame (the proxy dying mid-generation,
      // an upstream abort, a truncated body) used to be invisible here.
      // react-native-sse dispatches 'close' only from its own close() method, which
      // this code calls exclusively from cleanup(), after hasCompleted is already
      // set, so the listener that was supposed to catch this could never run. The
      // only remaining guard was the 45s idle timer, which meant a dead stream cost
      // three quarters of a minute and then a full re-generation on the next
      // transport. Watch the underlying request instead: with pollingInterval 0 the
      // library does not reopen after DONE, so loadend IS the end of the stream.
      let xhrWatch = setInterval(() => {
        const xhr = es?._xhr;
        if (!xhr) return;
        clearInterval(xhrWatch);
        xhrWatch = null;
        const onEnd = () => {
          if (hasCompleted) return;
          const elapsed = Date.now() - bodyReadStart;
          console.log(`[LLMService] [${localRequestId}] SSE stream ended at ${elapsed}ms without a response frame, ${heartbeatCount} heartbeats`);
          cleanup();
          const responseText = chunks.join('\n');
          // Heartbeats alone are not a response; failing fast here lets the next
          // transport start now instead of after the idle timeout.
          if (!responseText.trim()) {
            reject(new Error('SSE stream ended without a response'));
            return;
          }
          resolve({
            responseText,
            heartbeatCount,
            streamingMethod: 'sse',
            response: null, // No Response object with SSE
          });
        };
        try {
          xhr.addEventListener('loadend', onEnd);
        } catch (_e) {
          // Older XHR shims expose only the handler property.
          const prior = xhr.onloadend;
          xhr.onloadend = (...args) => { try { prior?.(...args); } finally { onEnd(); } };
        }
      }, 100);
      const clearXhrWatch = () => { if (xhrWatch) { clearInterval(xhrWatch); xhrWatch = null; } };
      cleanupHooks.push(clearXhrWatch);
    });
  }

  /**
   * Try to read response body using expo/fetch streaming
   * Expo SDK 52+ has native streaming support
   */
  async _tryExpoFetchStreaming(url, requestBody, headers, signal, localRequestId, bodyReadStart) {
    console.log(`[LLMService] [${localRequestId}] Trying expo/fetch streaming...`);

    const bodyStr = typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody);

    // Use Headers object for cross-platform compatibility (Android and iOS)
    const headersObj = new Headers(headers);

    const response = await expoFetch(url, {
      method: 'POST',
      headers: headersObj,
      body: bodyStr,
      signal,
    });

    // Check if streaming is available
    const reader = response.body?.getReader?.();
    if (!reader) {
      throw new Error('expo/fetch does not support streaming on this platform');
    }

    console.log(`[LLMService] [${localRequestId}] expo/fetch streaming available, reading...`);

    const chunks = [];
    const decoder = new TextDecoder();
    let heartbeatCount = 0;
    const chunkTimeout = 30000; // 30s without data = timeout

    try {
      while (true) {
        // Race between reading next chunk and timeout
        let timeoutHandle;
        const readPromise = reader.read();
        const timeoutPromise = new Promise((_, reject) => {
          timeoutHandle = setTimeout(() => reject(new Error('No data received for 30 seconds')), chunkTimeout);
        });

        let result;
        try {
          result = await Promise.race([readPromise, timeoutPromise]);
        } finally {
          clearTimeout(timeoutHandle);
        }

        const { done, value } = result;
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        chunks.push(text);

        // Count heartbeats as they arrive (only log in verbose mode)
        if (text.includes('"type":"heartbeat"')) {
          heartbeatCount++;
          log.debug('LLMService', `[${localRequestId}] Heartbeat via expo/fetch (${heartbeatCount})`);
        }
      }

      const elapsed = Date.now() - bodyReadStart;
      log.debug('LLMService', `[${localRequestId}] expo/fetch complete: ${chunks.length} chunks, ${heartbeatCount} heartbeats in ${elapsed}ms`);

      return {
        responseText: chunks.join(''),
        heartbeatCount,
        streamingMethod: 'expoFetch',
        response,
      };
    } catch (streamError) {
      reader.cancel().catch(() => {});
      throw streamError;
    }
  }

  /**
   * Call Gemini API via secure Cloudflare Worker proxy
   * Used in production to keep API key secure
   *
   * Uses SSE (Server-Sent Events) streaming with heartbeats to prevent mobile network timeouts.
   * Mobile networks often kill idle connections after 30-40 seconds,
   * but Gemini's "thinking" phase can take 20-60 seconds.
   *
   * Streaming priority:
   * 1. react-native-sse (XMLHttpRequest-based) - most reliable on Android
   * 2. expo/fetch with ReadableStream - Expo SDK 52+ native streaming
   * 3. expo/fetch with response.text() - fallback when streaming unavailable
   *
   * Supports both SSE format (data: {...}\n\n) and legacy NDJSON ({...}\n) for backwards compatibility.
   */
  async _callViaProxy(messages, { model, maxTokens, systemPrompt, responseSchema, traceId, requestContext, cachedContent, thinkingLevel }) {
    let lastError = null;
    let attempt = 0;
    const MAX_RATE_LIMIT_WAITS = 3;
    let rateLimitWaits = 0;
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
        thinkingLevel: thinkingLevel || 'medium',
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
          'Connection': 'keep-alive',
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
            // Host only: the full endpoint does not belong in device logs.
            proxyHost: (() => { try { return new URL(this.config.proxyUrl).host; } catch (_e) { return 'unknown'; } })(),
            timeout: this.config.timeout,
            localRequestId,
            streaming: true,
          }, 'info');
        }

        // Build request body for logging
        // The model contract is applied here, at the single egress, rather than
        // only in complete(): completeWithCache reaches _callViaProxy directly,
        // and the proxy is deployed separately so it may be older than this app.
        const requestBody = {
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          model,
          maxTokens: clampMaxOutputTokens(maxTokens) ?? undefined,
          systemPrompt,
          responseSchema,
          cachedContent, // Optional: cached content reference for context caching
          thinkingLevel: normalizeThinkingLevel(thinkingLevel) ?? undefined, // omitted => Gemini 'medium' default
          stream: true, // Enable streaming with heartbeats to prevent mobile timeouts
          clientTraceId: traceId || null,
          clientRequestContext: requestContext || null,
        };

        // Log request details for debugging (verbose mode only)
        const requestBodyStr = JSON.stringify(requestBody);
        log.debug('LLMService', `[${localRequestId}] Request size: ${requestBodyStr.length} bytes, hasSchema: ${!!responseSchema}, hasCachedContent: ${!!cachedContent}`);

        // ========== STREAMING WITH HEARTBEATS ==========
        // Server sends SSE format with heartbeats every 10s to keep mobile connections alive.
        // Streaming priority:
        // 1. react-native-sse (XMLHttpRequest-based) - most reliable on Android
        // 2. expo/fetch streaming - Expo SDK 52+ native streaming
        // 3. response.text() fallback - for platforms without streaming support
        const bodyReadStart = Date.now();
        let responseText;
        let heartbeatCount = 0;
        let streamingMethod = 'unknown';
        let response = null;

        // Method 1: Try react-native-sse (XMLHttpRequest-based, most reliable on Android)
        try {
          const result = await this._trySSEStreaming(
            this.config.proxyUrl,
            requestBody,
            headers,
            localRequestId,
            bodyReadStart,
            this.config.timeout
          );
          responseText = result.responseText;
          heartbeatCount = result.heartbeatCount;
          streamingMethod = result.streamingMethod;
          response = result.response;
          clearTimeout(timeoutId);
        } catch (sseError) {
          // An application error is the server's verdict on this request, not a
          // transport failure: replaying it over two more transports just costs
          // the player three identical rejections instead of one.
          if (sseError.isApplicationError) {
            clearTimeout(timeoutId);
            throw sseError;
          }

          console.warn(`[LLMService] [${localRequestId}] SSE streaming failed: ${sseError.message}, trying expo/fetch...`);

          // Method 2: Try expo/fetch streaming (Expo SDK 52+ native)
          try {
            const result = await this._tryExpoFetchStreaming(
              this.config.proxyUrl,
              requestBody,
              headers,
              controller.signal,
              localRequestId,
              bodyReadStart
            );
            responseText = result.responseText;
            heartbeatCount = result.heartbeatCount;
            streamingMethod = result.streamingMethod;
            response = result.response;
            clearTimeout(timeoutId);
          } catch (expoError) {
            console.warn(`[LLMService] [${localRequestId}] expo/fetch streaming failed: ${expoError.message}, using response.text() fallback...`);

            // Method 3: Fallback to expoFetch with response.text()
            streamingMethod = 'expoFetch-text';

            const headersObj = new Headers(headers);
            response = await expoFetch(this.config.proxyUrl, {
              method: 'POST',
              headers: headersObj,
              body: requestBodyStr,
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              // Typed, so the retry loop can tell a permanent rejection from a
              // dropped connection. Throwing a plain Error here made both the
              // 429 handler and the permanent-status check below unreachable:
              // a rate limit was retried after 2s straight back into the limiter.
              const errBody = await response.json().catch(() => ({}));
              throw applicationError(errBody.error || `Proxy HTTP ${response.status}`, {
                status: errBody.geminiStatus ?? response.status,
                details: errBody.details ?? response.statusText ?? null,
              });
            }

            log.debug('LLMService', `[${localRequestId}] Response received (status=${response.status}), waiting for body...`);

            // Log progress while waiting for the full response (verbose mode only)
            const progressInterval = setInterval(() => {
              const elapsed = Date.now() - bodyReadStart;
              log.debug('LLMService', `[${localRequestId}] Still waiting for response body... (${Math.round(elapsed/1000)}s elapsed)`);
            }, 10000);

            try {
              responseText = await response.text();
            } finally {
              clearInterval(progressInterval);
            }
          }
        }

        const networkTime = Date.now() - attemptStart;
        log.debug('LLMService', `[${localRequestId}] Body read complete via ${streamingMethod}: ${responseText.length} bytes in ${networkTime}ms`);

        // Parse response - supports both SSE format (data: {...}\n\n) and NDJSON ({...}\n)
        let data = null;
        let parsedHeartbeatCount = 0;

        // Which framing this text uses. The react-native-sse transport hands back
        // payloads with the "data: " prefix ALREADY stripped, so its text is
        // NDJSON; only the raw-body transports carry SSE framing. This used to be
        // a substring test over the whole response, so a scene whose prose
        // happened to contain "data: " anywhere was parsed as SSE, every line
        // failed to match, and the whole generation came back empty. Decide from
        // the transport, and fall back to a line-anchored check.
        const isSSE = streamingMethod !== 'sse'
          && responseText.split('\n').some((line) => line.startsWith('data: '));

        if (isSSE) {
          // SSE format: split by double newlines, strip "data: " prefix
          const messages = responseText.split('\n\n').filter(msg => msg.trim());
          for (const msg of messages) {
            // Each SSE message may have multiple lines, find the data line
            const lines = msg.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.substring(6); // Remove "data: " prefix
                try {
                  const parsed = JSON.parse(jsonStr);
                  if (parsed.type === 'heartbeat') {
                    parsedHeartbeatCount++;
                    continue;
                  } else if (parsed.type === 'error') {
                    console.error(`[LLMService] [${localRequestId}] Proxy stream error: ${parsed.error}`);
                    throw new Error(parsed.error || 'Proxy returned error in stream');
                  } else if (parsed.type === 'response') {
                    data = parsed;
                    break;
                  } else if (parsed.success !== undefined) {
                    data = parsed;
                    break;
                  }
                } catch (parseErr) {
                  console.warn(`[LLMService] [${localRequestId}] Failed to parse SSE data: ${jsonStr.substring(0, 100)}`);
                }
              }
            }
            if (data) break;
          }
        } else {
          // NDJSON format (backwards compatibility): split by single newlines
          const lines = responseText.split('\n').filter(line => line.trim());
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.type === 'heartbeat') {
                parsedHeartbeatCount++;
                continue;
              } else if (parsed.type === 'error') {
                console.error(`[LLMService] [${localRequestId}] Proxy stream error: ${parsed.error}`);
                throw new Error(parsed.error || 'Proxy returned error in stream');
              } else if (parsed.type === 'response') {
                data = parsed;
                break;
              } else if (parsed.success !== undefined) {
                data = parsed;
                break;
              }
            } catch (parseErr) {
              console.warn(`[LLMService] [${localRequestId}] Failed to parse NDJSON line: ${line.substring(0, 100)}`);
            }
          }
        }

        // Use the higher count (streaming methods count in real-time, parsing counts after)
        if (parsedHeartbeatCount > heartbeatCount) {
          heartbeatCount = parsedHeartbeatCount;
        }

        // Handle rate limiting (check response status if available, or data.status)
        const httpStatus = response?.status || data?.httpStatus;
        if (httpStatus === 429) {
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

        // Handle other HTTP errors (only if we have a response object from fetch fallback)
        if (response && !response.ok) {
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
          throw applicationError(errorMsg, {
            status: data?.geminiStatus ?? response.status,
            details: data?.details ?? null,
          });
        }

        // Validate we got actual data. An empty content string with success:true
        // is not a usable answer: it parses to nothing and gets stored as a
        // broken chapter.
        if (data && data.success && !data.content) {
          throw applicationError(
            `Proxy returned an empty response (finishReason ${data.finishReason || 'unknown'})`,
            { status: data.geminiStatus ?? null },
          );
        }
        if (!data || !data.success) {
          console.error(`[LLMService] [${localRequestId}] No valid response in stream`);
          throw applicationError(data?.error || 'No valid response received from proxy', {
            status: data?.geminiStatus ?? null,
            details: data?.details ?? null,
          });
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
        // Capture thought signature for multi-call reasoning continuity (Gemini 3)
        const thoughtSignature = data.thoughtSignature || null;
        // Single consolidated success log with streaming method info
        console.log(`[LLMService] [${localRequestId}] Complete via ${streamingMethod}: ${totalTime}ms, ${contentLength} chars${heartbeatCount > 0 ? `, ${heartbeatCount} heartbeats` : ''}${!jsonValid ? ' (needs repair)' : ''}${thoughtSignature ? ' (has thought signature)' : ''}`);

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
            streamingMethod,
            hasThoughtSignature: !!thoughtSignature,
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
          // Include thought signature for multi-call reasoning continuity (Gemini 3)
          thoughtSignature,
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

        // A rate limit is retryable, but only after the server's own backoff.
        // The 429 branch further down never ran once the transports started
        // throwing, so this honours Retry-After here instead.
        if (error.isApplicationError && error.geminiStatus === 429) {
          rateLimitWaits += 1;
          if (rateLimitWaits > MAX_RATE_LIMIT_WAITS) {
            console.error(`[LLMService] [${localRequestId}] Rate limited ${rateLimitWaits} times; giving up.`);
            throw error;
          }
          const retryAfter = Math.min(Number(error.details?.retryAfter) || 60, 120);
          console.warn(`[LLMService] [${localRequestId}] Rate limited (429), waiting ${retryAfter}s (${rateLimitWaits}/${MAX_RATE_LIMIT_WAITS})...`);
          await this._sleep(retryAfter * 1000);
          continue;
        }

        // A permanent API rejection (bad model id, unsupported thinkingLevel,
        // deprecated field, malformed schema) fails identically every time.
        // Retrying it costs minutes of backoff and the rate-limit budget before
        // the player sees a failure that was decided on the first attempt.
        if (error.isPermanent) {
          console.error(`[LLMService] [${localRequestId}] Permanent API error (${error.geminiStatus}), not retrying: ${error.message}${error.details ? ` — ${error.details}` : ''}`);
          if (traceId) {
            llmTrace('LLMService', traceId, 'llm.proxy.permanent_error', {
              status: error.geminiStatus,
              error: error.message,
              details: error.details || null,
              localRequestId,
            }, 'error');
          }
          throw error;
        }

        attempt++;
        if (attempt < this.config.maxRetries) {
          // Longer backoff for mobile network resilience: 2s, 4s, 8s, 16s
          const backoffDelay = withJitter(Math.pow(2, attempt - 1) * 2000);
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

          // Re-check network connectivity before retry
          const isOnline = await this.checkOnline();
          if (!isOnline) {
            console.warn(`[LLMService] [${localRequestId}] Device offline before retry, waiting additional 5s...`);
            await this._sleep(5000);
          }
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

      // Build part with optional thought signature for reasoning continuity (Gemini 3)
      const part = { text };
      if (msg.thoughtSignature) {
        part.thoughtSignature = msg.thoughtSignature;
      }

      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [part],
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

      // Check for branchingNarrative field (most critical)
      if (!parsed.branchingNarrative?.opening?.text) {
        validationIssues.push('Missing branchingNarrative.opening.text field');
      } else if (parsed.branchingNarrative.opening.text.length < 200) {
        validationIssues.push(`Opening text too short after repair: ${parsed.branchingNarrative.opening.text.length} chars`);
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
            log.debug('LLMService', `Cache expired during load: ${key}`);
          }
        }
        log.debug('LLMService', `Loaded ${this.caches.size} active caches from storage`);
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
        log.debug('LLMService', `♻️ Reusing existing cache: ${key}`);
        return existing;
      } else {
        log.debug('LLMService', `Cache expired, creating new: ${key}`);
      }
    }

    log.debug('LLMService', `🔧 Creating new cache: ${key} (ttl: ${ttl})`);

    try {
      let cache;

      // Use proxy if configured (production), otherwise direct API (dev)
      if (this.config.proxyUrl) {
        log.debug('LLMService', 'Creating cache via proxy');

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
        log.debug('LLMService', 'Creating cache via direct API');

        const baseUrl = this.config.baseUrl || GEMINI_API_BASE;

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

      log.debug('LLMService', `✅ Cache created: ${cache.name} (expires: ${cache.expireTime}, tokens: ${cache.usageMetadata?.totalTokenCount || 'unknown'})`);

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
    // A generation takes tens of seconds, so a cache that merely has not expired
    // YET is not safe to start one with: Gemini rejects the call partway through
    // with "CachedContent not found", after the point where the caller can still
    // fall back to an uncached run.
    const CACHE_SAFETY_MARGIN_MS = 120000;
    if (expireTime - CACHE_SAFETY_MARGIN_MS <= Date.now()) {
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
  /**
   * Cache lifecycle (delete / TTL extension) against whichever surface this
   * client is configured for. In proxy mode there is no API key here, so these
   * used to hit Google unauthenticated: the delete failed and silently dropped
   * only the local record while the remote cache lived out its TTL, and the TTL
   * extension threw. Returns the updated cache resource for an update, null for
   * a delete.
   */
  async _cacheLifecycleRequest(operation, cache, ttl) {
    if (this.config.proxyUrl) {
      const headers = { 'Content-Type': 'application/json' };
      if (this.config.appToken) headers['X-App-Token'] = this.config.appToken;
      const response = await fetch(this.config.proxyUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ operation, name: cache.name, ...(ttl ? { ttl } : {}) }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`Cache ${operation} failed: ${response.status} - ${error.error || error.details || 'Unknown error'}`);
      }
      const result = await response.json().catch(() => ({}));
      return result?.cache || null;
    }

    const baseUrl = this.config.baseUrl || GEMINI_API_BASE;
    const isDelete = operation === 'deleteCache';
    const response = await fetch(`${baseUrl}/${cache.name}`, {
      method: isDelete ? 'DELETE' : 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.config.apiKey,
      },
      ...(isDelete ? {} : { body: JSON.stringify({ ttl }) }),
    });
    if (!response.ok && !(isDelete && response.status === 404)) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Cache ${operation} failed: ${response.status} - ${error.error?.message || 'Unknown error'}`);
    }
    return isDelete ? null : await response.json().catch(() => null);
  }

  async updateCache(key, ttl) {
    await this._initializeCacheStorage();

    const cache = this.caches.get(key);
    if (!cache) {
      throw new Error(`Cache not found: ${key}`);
    }

    try {
      const updated = await this._cacheLifecycleRequest('updateCache', cache, ttl);
      if (updated) {
        cache.expireTime = updated.expireTime;
        cache.updateTime = updated.updateTime;
      }

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

    try {
      await this._cacheLifecycleRequest('deleteCache', cache);
    } catch (error) {
      // A cache we cannot reach still has a TTL; dropping the local record is
      // the right outcome either way, so this is a warning, not a failure.
      console.warn('[LLMService] Cache deletion warning:', error.message);
    }

    this.caches.delete(key);
    await this._saveCacheStorage();
    console.log(`[LLMService] ✅ Cache deleted: ${key}`);
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
   * @param {Array} params.priorMessages - Optional prior messages with thought signatures for continuity
   * @returns {Promise<Object>} Generation response with usage metadata
   */
  async completeWithCache({ cacheKey, dynamicPrompt, options = {}, priorMessages = [] }) {
    await this._initializeCacheStorage();

    const cache = await this.getCache(cacheKey);
    if (!cache) {
      throw new Error(`Cache not found or expired: ${cacheKey}`);
    }

    // Never take the model from the (persisted) cache record: a cache written by
    // an earlier build would pin this call to a superseded model.
    const model = options.model || this.config.model || GEMINI_MODEL;

    log.debug('LLMService', `🎯 Generating with cache: ${cacheKey}`);

    // Use proxy mode if configured (production), otherwise direct API call (dev)
    if (this.config.proxyUrl) {
      log.debug('LLMService', 'Using proxy mode for cached generation');

      // Build messages with prior thought signatures if provided
      const messages = [...priorMessages, { role: 'user', content: dynamicPrompt }];

      // Through the same limiter as complete(). Going straight to the proxy meant
      // the CACHED path (which is most of them) was outside the interval and
      // concurrency budget entirely, so the two generation slots could put two
      // requests on the wire back to back and collect a 429 the budget exists to
      // avoid.
      const response = await this._rateLimitedRequest(() => this._callViaProxy(
        messages,
        {
          model,
          maxTokens: clampMaxOutputTokens(options.maxTokens) || 8192,
          systemPrompt: null, // System prompt is in cache
          responseSchema: options.responseSchema,
          cachedContent: cache.name,
          thinkingLevel: options.thinkingLevel, // Per-task level; omitted => Gemini 'medium' default
          traceId: options.traceId,
          requestContext: options.requestContext,
        }
      ));

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
    log.debug('LLMService', 'Using direct mode for cached generation');

    const isGemini3 = isGemini3Model(model);

    // Build generation config.
    // Per Gemini 3.x guidance, sampling params (temperature/topP/topK/candidateCount)
    // are deprecated and omitted so the model uses its tuned defaults.
    const generationConfig = {
      maxOutputTokens: clampMaxOutputTokens(options.maxTokens) || 8192,
    };

    // Thinking configuration: only set when a task explicitly requests a level.
    // When omitted, Gemini applies its own 'medium' default.
    const cachedThinkingLevel = normalizeThinkingLevel(options.thinkingLevel);
    if (isGemini3 && cachedThinkingLevel) {
      generationConfig.thinkingConfig = { thinkingLevel: cachedThinkingLevel };
    }

    // Add structured output configuration if schema provided
    if (options.responseSchema) {
      generationConfig.responseMimeType = 'application/json';
      generationConfig.responseSchema = options.responseSchema;
    }

    const baseUrl = this.config.baseUrl || GEMINI_API_BASE;

    // Build contents array with prior messages (thought signatures) if provided
    const contents = [];
    for (const msg of priorMessages) {
      const parts = [{ text: msg.content }];
      if (msg.thoughtSignature) {
        parts[0].thoughtSignature = msg.thoughtSignature;
      }
      contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts });
    }
    contents.push({ role: 'user', parts: [{ text: dynamicPrompt }] });

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

      const { content, thoughtSignature } = extractCandidateContent(candidate);
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
        // Include thought signature for multi-call reasoning continuity (Gemini 3)
        thoughtSignature,
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

    // Token usage details - only in verbose mode
    log.debug('LLMService', `📊 Token Usage (Cache: ${cacheKey}): ${totalTokens.toLocaleString()} total, ${cacheHitRate}% cached, $${totalCost.toFixed(4)} cost, $${savings.toFixed(4)} saved`);
  }
}

// Singleton instance
export const llmService = new LLMService();
export default llmService;
