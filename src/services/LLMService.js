/**
 * LLM Service for Dynamic Story Generation
 *
 * This service handles communication with LLM providers (OpenAI, Anthropic, etc.)
 * for generating dynamic story content after Chapter 1.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const LLM_CONFIG_KEY = 'detective_portrait_llm_config';

// Default configuration
const DEFAULT_CONFIG = {
  provider: 'openai', // 'openai' | 'anthropic'
  model: 'gpt-4o', // or 'claude-3-sonnet-20240229'
  apiKey: null,
  baseUrl: null, // For custom endpoints
  maxRetries: 3,
  timeout: 60000, // 60 seconds
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
   */
  async complete(messages, options = {}) {
    await this.init();

    if (!this.isConfigured()) {
      throw new Error('LLM Service not configured. Please set an API key.');
    }

    const {
      temperature = 0.8,
      maxTokens = 4000,
      systemPrompt = null
    } = options;

    const fullMessages = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    if (this.config.provider === 'openai') {
      return this._openAIComplete(fullMessages, { temperature, maxTokens });
    } else if (this.config.provider === 'anthropic') {
      return this._anthropicComplete(fullMessages, { temperature, maxTokens, systemPrompt });
    }

    throw new Error(`Unknown LLM provider: ${this.config.provider}`);
  }

  /**
   * OpenAI API completion
   */
  async _openAIComplete(messages, { temperature, maxTokens }) {
    const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1';

    let lastError = null;
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({
            model: this.config.model,
            messages,
            temperature,
            max_tokens: maxTokens,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        return {
          content: data.choices[0]?.message?.content || '',
          usage: data.usage,
          model: data.model,
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
   * Anthropic API completion
   */
  async _anthropicComplete(messages, { temperature, maxTokens, systemPrompt }) {
    const baseUrl = this.config.baseUrl || 'https://api.anthropic.com/v1';

    // Convert messages format for Anthropic
    const anthropicMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

    let lastError = null;
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(`${baseUrl}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.config.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: this.config.model,
            max_tokens: maxTokens,
            temperature,
            system: systemPrompt,
            messages: anthropicMessages,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Anthropic API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        return {
          content: data.content[0]?.text || '',
          usage: data.usage,
          model: data.model,
        };
      } catch (error) {
        lastError = error;
        if (error.name === 'AbortError') {
          throw new Error('Request timed out');
        }
        if (attempt < this.config.maxRetries - 1) {
          await this._sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError || new Error('Failed to complete request');
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const llmService = new LLMService();
export default llmService;
