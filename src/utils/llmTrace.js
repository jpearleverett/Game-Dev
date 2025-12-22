/**
 * llmTrace
 *
 * Extremely verbose, structured logging for story generation.
 * - Adds correlation IDs (traceId) so you can follow a single generation end-to-end
 * - Keeps logs readable and grep-friendly
 * - Supports subscribers for in-app verbose mode display
 *
 * NOTE: This intentionally logs to console. If you later want persistence,
 * we can extend this to write to AsyncStorage with a bounded ring buffer.
 */

// =============================================================================
// VERBOSE MODE SUBSCRIBER SYSTEM
// =============================================================================

const MAX_LOG_BUFFER = 100; // Keep last 100 logs in memory
const logBuffer = [];
const subscribers = new Set();
let verboseModeEnabled = false;

/**
 * Enable or disable verbose mode
 * When enabled, subscribers receive real-time log updates
 */
export function setVerboseMode(enabled) {
  verboseModeEnabled = enabled;
  if (!enabled) {
    logBuffer.length = 0; // Clear buffer when disabled to save memory
  }
}

/**
 * Check if verbose mode is enabled
 */
export function isVerboseMode() {
  return verboseModeEnabled;
}

/**
 * Subscribe to log events (for UI display)
 * @param {function} callback - Called with (logEntry) on each new log
 * @returns {function} Unsubscribe function
 */
export function subscribeToLogs(callback) {
  subscribers.add(callback);
  // Send existing buffer to new subscriber
  logBuffer.forEach(entry => callback(entry));
  return () => subscribers.delete(callback);
}

/**
 * Get current log buffer
 */
export function getLogBuffer() {
  return [...logBuffer];
}

/**
 * Clear the log buffer
 */
export function clearLogBuffer() {
  logBuffer.length = 0;
  subscribers.forEach(cb => cb({ type: 'clear' }));
}

// =============================================================================
// CORE TRACE FUNCTIONS
// =============================================================================

function nowIso() {
  try {
    return new Date().toISOString();
  } catch {
    return String(Date.now());
  }
}

function safeJson(value) {
  try {
    return JSON.stringify(value);
  } catch (e) {
    return JSON.stringify({ __stringifyError: e?.message, type: typeof value });
  }
}

export function createTraceId(prefix = 'trace') {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${ts}_${rand}`;
}

/**
 * Structured trace log.
 * @param {string} scope - subsystem name, e.g. "StoryGenerationService"
 * @param {string} traceId - correlation id
 * @param {string} event - event name, e.g. "llm.request.start"
 * @param {object} data - payload (kept small)
 * @param {"debug"|"info"|"warn"|"error"} level
 */
export function llmTrace(scope, traceId, event, data = {}, level = 'info') {
  const timestamp = nowIso();
  const prefix = `[LLMTRACE] [${scope}] [${traceId}] ${event}`;
  const payload = data && Object.keys(data).length ? ` ${safeJson(data)}` : '';
  const line = `${prefix} @ ${timestamp}${payload}`;

  // Always log to console
  // eslint-disable-next-line no-console
  if (level === 'error') console.error(line);
  // eslint-disable-next-line no-console
  else if (level === 'warn') console.warn(line);
  // eslint-disable-next-line no-console
  else if (level === 'debug') console.log(line);
  // eslint-disable-next-line no-console
  else console.log(line);

  // If verbose mode is enabled, also push to buffer and notify subscribers
  if (verboseModeEnabled) {
    const entry = {
      type: 'log',
      id: `${traceId}_${Date.now()}`,
      scope,
      traceId,
      event,
      data,
      level,
      timestamp,
      // Human-readable summary for display
      summary: formatEventSummary(scope, event, data, level),
    };

    logBuffer.push(entry);
    // Trim buffer if too large
    while (logBuffer.length > MAX_LOG_BUFFER) {
      logBuffer.shift();
    }

    // Notify subscribers
    subscribers.forEach(cb => {
      try {
        cb(entry);
      } catch (e) {
        // Ignore subscriber errors
      }
    });
  }
}

/**
 * Format a human-readable summary for display in the debug overlay
 */
function formatEventSummary(scope, event, data, level) {
  // Extract key info based on event type
  const shortScope = scope.replace('Service', '').replace('Context', '');

  // Common event patterns
  if (event.includes('generation.start')) {
    return `Starting generation for ${data.caseNumber || 'unknown'}`;
  }
  if (event.includes('generation.complete')) {
    return `Completed ${data.caseNumber || ''} (${data.wordCount || 0} words)${data.isFallback ? ' [FALLBACK]' : ''}`;
  }
  if (event.includes('generation.error')) {
    return `ERROR: ${data.error || 'Unknown error'}`;
  }
  if (event.includes('generation.dedupe')) {
    if (event.includes('stale')) {
      return `Stale promise detected for ${data.generationKey} - retrying`;
    }
    return `Reusing in-flight generation for ${data.generationKey}`;
  }
  if (event.includes('llm.request') || event.includes('llm.proxy')) {
    if (event.includes('request.start')) {
      return `Sending LLM request (attempt ${data.attempt || 1}/${data.maxRetries || 3})`;
    }
    if (event.includes('response.ok')) {
      const tokens = data.usage?.totalTokens || data.contentLength || '?';
      return `LLM SUCCESS in ${data.totalTimeMs || '?'}ms (${tokens} tokens)`;
    }
    if (event.includes('rate_limited')) {
      return `RATE LIMITED - waiting ${data.retryAfter}s`;
    }
    if (event.includes('timeout')) {
      return `TIMEOUT after ${Math.round((data.attemptTimeMs || data.timeoutMs) / 1000)}s`;
    }
    if (event.includes('all_retries_exhausted')) {
      return `FAILED after ${data.totalAttempts} attempts: ${data.lastError}`;
    }
    if (event.includes('retry')) {
      return `Retrying in ${(data.backoffMs || 0) / 1000}s (attempt ${data.attempt}/${data.maxRetries})`;
    }
    if (event.includes('error')) {
      return `LLM ERROR: ${data.error || data.message || 'Request failed'}`;
    }
    if (event.includes('plan')) {
      return `Planning LLM call: ${data.model || 'gemini'} (${data.messageCount || 1} msgs)`;
    }
  }
  if (event.includes('prefetch')) {
    if (event.includes('start')) {
      return `Prefetching ${data.key || data.nextCaseNumber || 'next chapter'}`;
    }
    if (event.includes('complete')) {
      return `Prefetch complete: ${data.key || ''}`;
    }
    if (event.includes('skip')) {
      return `Skipping prefetch (${event.includes('cached') ? 'cached' : 'in-flight'})`;
    }
  }
  if (event.includes('quality') || event.includes('validation')) {
    return `Quality check: ${data.valid ? 'PASS' : 'FAIL'} - ${data.reason || ''}`;
  }
  if (event.includes('consistency')) {
    return `Consistency: ${data.valid ? 'OK' : 'VIOLATION'} - ${data.issues?.length || 0} issues`;
  }
  if (event.includes('decision')) {
    if (data.optionA || data.optionB) {
      return `Decision: "${data.optionA?.title}" vs "${data.optionB?.title}"`;
    }
    return `Decision event: ${event}`;
  }
  if (event.includes('storage') || event.includes('cache')) {
    return `${event.includes('save') ? 'Saved' : 'Loaded'} ${data.caseNumber || data.key || ''}`;
  }
  if (event.includes('timeout')) {
    return `TIMEOUT: ${data.generationKey || data.key || 'request'}`;
  }

  // Default: show event name
  const levelIcon = level === 'error' ? '!' : level === 'warn' ? '?' : '';
  return `${levelIcon}[${shortScope}] ${event}`;
}

