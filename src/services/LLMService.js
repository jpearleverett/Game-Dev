/**
 * LLM Service for Dynamic Story Generation
 *
 * This service handles communication with Google Gemini API
 * for generating dynamic story content after Chapter 1.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const LLM_CONFIG_KEY = 'detective_portrait_llm_config';

// Default configuration - using Gemini
const DEFAULT_CONFIG = {
  provider: 'gemini',
  model: 'gemini-2.5-flash-preview-09-2025', // Gemini 2.5 Flash
  apiKey: null,
  baseUrl: null, // For custom endpoints
  maxRetries: 3,
  timeout: 180000, // 180 seconds for longer story generations
};

class LLMService {
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.initialized = false;
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

    const {
      temperature = 0.8,
      maxTokens = 4000,
      systemPrompt = null,
      responseSchema = null,
    } = options;

    if (this.config.provider === 'gemini') {
      return this._geminiComplete(messages, { temperature, maxTokens, systemPrompt, responseSchema });
    }

    throw new Error(`Unknown LLM provider: ${this.config.provider}`);
  }

  /**
   * Google Gemini API completion
   * Supports structured output via responseSchema for guaranteed valid JSON responses
   * Special handling for Gemini 3 models (temperature=1.0, thinkingConfig)
   */
  async _geminiComplete(messages, { temperature, maxTokens, systemPrompt, responseSchema }) {
    // Gemini API endpoint
    const baseUrl = this.config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    const model = this.config.model || 'gemini-2.5-flash-preview-05-20';

    // Check if using Gemini 3 model
    const isGemini3 = model.includes('gemini-3');

    // Convert messages to Gemini format
    const contents = this._convertToGeminiFormat(messages, systemPrompt);

    // Build generation config
    // For Gemini 3: Google strongly recommends temperature=1.0 to avoid looping/degraded performance
    const generationConfig = {
      temperature: isGemini3 ? 1.0 : temperature,
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
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
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
        if (response.status === 429) {
          const retryAfterHeader = response.headers.get('Retry-After');
          const retryAfter = parseInt(retryAfterHeader || '60', 10);
          console.warn(`[LLMService] Rate limited (429), waiting ${retryAfter}s before retry...`);
          await this._sleep(retryAfter * 1000);
          // Don't count this toward retry limit - continue the loop
          attempt--; // Decrement to not count this attempt
          continue;
        }

        // Handle quota exhaustion (403 with quota message)
        if (response.status === 403) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error?.message || '';
          if (errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('limit')) {
            console.warn('[LLMService] API quota exhausted, waiting 60s before retry...');
            await this._sleep(60000);
            attempt--; // Don't count toward retry limit
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
        lastError = error;
        if (error.name === 'AbortError') {
          throw new Error('Request timed out');
        }
        // Exponential backoff
        if (attempt < this.config.maxRetries - 1) {
          await this._sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError || new Error('Failed to complete request');
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
      if (parsed.decision) {
        if (!parsed.decision.intro) {
          validationIssues.push('Decision missing intro');
        }
        if (!parsed.decision.optionA?.title || !parsed.decision.optionB?.title) {
          validationIssues.push('Decision missing option titles');
        }
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
