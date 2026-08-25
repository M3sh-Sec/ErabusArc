/**
 * EREBUS ARC Audit Logger
 *
 * Server-side only structured logger for security audit trails.
 * Logs all scan requests, rate limit events, validation failures,
 * and errors — without logging sensitive data.
 *
 * In production, pipe stdout to a log aggregator (Datadog, Splunk, CloudWatch).
 */

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const CURRENT_LEVEL = process.env.NODE_ENV === "production" ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;

function formatLog(level, event, data = {}) {
  return JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    service: "erebus-arc",
    version: "1.0.0",
    ...data,
  });
}

function log(level, event, data) {
  if (LOG_LEVELS[level] >= CURRENT_LEVEL) {
    const line = formatLog(level, event, data);
    if (level === "ERROR" || level === "WARN") {
      console.error(line);
    } else {
      console.log(line);
    }
  }
}

export const logger = {
  debug: (event, data) => log("DEBUG", event, data),
  info:  (event, data) => log("INFO",  event, data),
  warn:  (event, data) => log("WARN",  event, data),
  error: (event, data) => log("ERROR", event, data),

  // Convenience audit events
  scanRequest:      (ip, target) => log("INFO",  "SCAN_REQUEST",       { ip, target: target.slice(0, 60) }),
  scanComplete:     (ip, ms)     => log("INFO",  "SCAN_COMPLETE",      { ip, durationMs: ms }),
  scanError:        (ip, err)    => log("ERROR", "SCAN_ERROR",         { ip, error: err?.message || String(err) }),
  rateLimited:      (ip)         => log("WARN",  "RATE_LIMITED",       { ip }),
  validationFailed: (ip, errors) => log("WARN",  "VALIDATION_FAILED",  { ip, errors }),
  invalidMethod:    (ip, method) => log("WARN",  "INVALID_METHOD",     { ip, method }),
};
