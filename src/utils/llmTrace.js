/**
 * llmTrace
 *
 * Extremely verbose, structured logging for story generation.
 * - Adds correlation IDs (traceId) so you can follow a single generation end-to-end
 * - Keeps logs readable and grep-friendly
 *
 * NOTE: This intentionally logs to console. If you later want persistence,
 * we can extend this to write to AsyncStorage with a bounded ring buffer.
 */
 
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
  const prefix = `[LLMTRACE] [${scope}] [${traceId}] ${event}`;
  const payload = data && Object.keys(data).length ? ` ${safeJson(data)}` : '';
  const line = `${prefix} @ ${nowIso()}${payload}`;

  // Always log; caller controls verbosity by what they pass in data.
  // eslint-disable-next-line no-console
  if (level === 'error') console.error(line);
  // eslint-disable-next-line no-console
  else if (level === 'warn') console.warn(line);
  // eslint-disable-next-line no-console
  else if (level === 'debug') console.log(line);
  // eslint-disable-next-line no-console
  else console.log(line);
}

