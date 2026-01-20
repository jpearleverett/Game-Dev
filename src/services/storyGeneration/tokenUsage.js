import { log } from '../../utils/llmTrace';

// ==========================================================================
// TOKEN USAGE TRACKING - Monitor costs and efficiency
// ==========================================================================

/**
 * Log and track token usage from an LLM response
 * Provides prominent console logging and cumulative tracking for cost visibility
 * @param {Object} usage - Token usage object from LLM response
 * @param {string} context - Context string for the log (e.g., "Chapter 2.A")
 */
function _trackTokenUsage(usage, context) {
  if (!usage) return;

  const promptTokens = usage.promptTokens || 0;
  const cachedTokens = usage.cachedTokens || 0;
  const completionTokens = usage.completionTokens || 0;
  const totalTokens = usage.totalTokens || (promptTokens + completionTokens);

  // Update cumulative totals
  this.tokenUsage.totalPromptTokens += promptTokens;
  this.tokenUsage.totalCachedTokens += cachedTokens;
  this.tokenUsage.totalCompletionTokens += completionTokens;
  this.tokenUsage.totalTokens += totalTokens;
  this.tokenUsage.callCount += 1;

  // Calculate cache efficiency (percentage of prompt tokens that were cached)
  const cacheEfficiency = promptTokens > 0 ? Math.round((cachedTokens / promptTokens) * 100) : 0;

  // Estimate cost (Gemini 3 Flash pricing: $0.10/1M input, $0.40/1M output, 50% discount on cached)
  // Source: https://ai.google.dev/pricing
  const inputCost = ((promptTokens - cachedTokens) * 0.10 / 1000000) + (cachedTokens * 0.05 / 1000000);
  const outputCost = completionTokens * 0.40 / 1000000;
  const callCost = inputCost + outputCost;

  // Cumulative cost
  const cumulativeInputCost = ((this.tokenUsage.totalPromptTokens - this.tokenUsage.totalCachedTokens) * 0.10 / 1000000) +
                              (this.tokenUsage.totalCachedTokens * 0.05 / 1000000);
  const cumulativeOutputCost = this.tokenUsage.totalCompletionTokens * 0.40 / 1000000;
  const cumulativeCost = cumulativeInputCost + cumulativeOutputCost;

  // Session duration
  const sessionMinutes = Math.round((Date.now() - this.tokenUsage.sessionStart) / 60000);

  // Token usage logging - only in verbose mode
  log.debug('StoryGen', `📊 ${context}: ${promptTokens.toLocaleString()} in (${cacheEfficiency}% cached), ${completionTokens.toLocaleString()} out, $${callCost.toFixed(4)}`);
}

/**
 * Get current token usage statistics
 * @returns {Object} Token usage stats with cost estimates
 */
function getTokenUsageStats() {
  const cumulativeInputCost = ((this.tokenUsage.totalPromptTokens - this.tokenUsage.totalCachedTokens) * 0.10 / 1000000) +
                              (this.tokenUsage.totalCachedTokens * 0.05 / 1000000);
  const cumulativeOutputCost = this.tokenUsage.totalCompletionTokens * 0.40 / 1000000;
  const sessionMinutes = Math.round((Date.now() - this.tokenUsage.sessionStart) / 60000);

  return {
    ...this.tokenUsage,
    estimatedCost: cumulativeInputCost + cumulativeOutputCost,
    cacheEfficiency: this.tokenUsage.totalPromptTokens > 0
      ? Math.round((this.tokenUsage.totalCachedTokens / this.tokenUsage.totalPromptTokens) * 100)
      : 0,
    sessionDurationMinutes: sessionMinutes,
  };
}

export const tokenUsageMethods = {
  _trackTokenUsage,
  getTokenUsageStats,
};
