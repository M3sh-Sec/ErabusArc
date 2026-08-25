/**
 * EREBUS ARC Scan History Store
 *
 * Server-side in-memory store for recent scan results, keyed by IP.
 * Each IP gets its own isolated history — users cannot see each other's scans.
 *
 * Security properties:
 * - Per-IP isolation: no cross-user data leakage
 * - TTL-based expiry: entries auto-delete after HISTORY_TTL_MS
 * - Max entries per IP: prevents unbounded memory growth
 * - No PII stored: only target name, risk score, timestamp, CVE count
 *
 * Production note: Replace with Redis or a database for persistence
 * across server restarts and multi-instance deployments.
 */

const HISTORY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_ENTRIES_PER_IP = 20;

// Map<ip, Array<HistoryEntry>>
const store = new Map();

/**
 * @typedef {Object} HistoryEntry
 * @property {string} id         - Unique scan ID
 * @property {string} target     - Scanned target (truncated for safety)
 * @property {string} targetType - Type of target
 * @property {number} riskScore  - 0–100
 * @property {string} riskLevel  - CRITICAL | HIGH | MEDIUM | LOW | MINIMAL
 * @property {number} totalVulns - Total CVE count
 * @property {number} criticalCount
 * @property {number} highCount
 * @property {string} scannedAt  - ISO timestamp
 * @property {number} expiresAt  - Unix ms timestamp
 */

/**
 * Prunes expired entries from an IP's history array.
 */
function pruneExpired(entries) {
  const now = Date.now();
  return entries.filter((e) => e.expiresAt > now);
}

/**
 * Adds a scan result to the history for a given IP.
 */
export function addToHistory(ip, target, analysisResult) {
  const now = Date.now();

  const entry = {
    id: Math.random().toString(36).slice(2, 10).toUpperCase(),
    target: String(target).slice(0, 80), // truncate long targets
    targetType: analysisResult.meta?.targetType || "unknown",
    riskScore: analysisResult.riskProfile?.overallScore ?? 0,
    riskLevel: analysisResult.riskProfile?.riskLevel || "UNKNOWN",
    totalVulns: analysisResult.reportSummary?.totalVulns ?? 0,
    criticalCount: analysisResult.reportSummary?.criticalCount ?? 0,
    highCount: analysisResult.reportSummary?.highCount ?? 0,
    scannedAt: new Date(now).toISOString(),
    expiresAt: now + HISTORY_TTL_MS,
  };

  const existing = store.get(ip) || [];
  const pruned = pruneExpired(existing);

  // Enforce max entries — remove oldest if at limit
  const trimmed = pruned.length >= MAX_ENTRIES_PER_IP
    ? pruned.slice(pruned.length - MAX_ENTRIES_PER_IP + 1)
    : pruned;

  trimmed.push(entry);
  store.set(ip, trimmed);

  return entry;
}

/**
 * Returns the scan history for a given IP, newest first.
 * Expired entries are automatically pruned.
 */
export function getHistory(ip) {
  const entries = store.get(ip) || [];
  const pruned = pruneExpired(entries);
  store.set(ip, pruned);
  return [...pruned].reverse(); // newest first
}

/**
 * Clears all history for an IP (e.g. on user request).
 */
export function clearHistory(ip) {
  store.delete(ip);
}

/**
 * Returns aggregate stats across all IPs (for /api/health, admin only).
 * Does NOT return per-IP data to avoid cross-user info leakage.
 */
export function getAggregateStats() {
  let totalScans = 0;
  let activeIPs = 0;
  const now = Date.now();

  for (const [, entries] of store) {
    const live = entries.filter((e) => e.expiresAt > now);
    if (live.length > 0) {
      activeIPs++;
      totalScans += live.length;
    }
  }

  return { totalScans, activeIPs };
}
