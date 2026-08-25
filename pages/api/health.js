/**
 * EREBUS ARC Health Check Endpoint
 * GET /api/health
 *
 * Used by load balancers, monitoring systems (Datadog, UptimeRobot, etc.)
 * to verify the service is alive and configured correctly.
 *
 * Security:
 * - Returns NO sensitive configuration details
 * - Does NOT confirm whether ANTHROPIC_API_KEY is valid (just present)
 * - Aggregate scan stats included (no per-user data)
 * - Response cached for 10 seconds to prevent flooding
 */

import { getAggregateStats } from "../../lib/scanHistory";

const START_TIME = Date.now();

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const stats = getAggregateStats();
  const uptimeSeconds = Math.floor((Date.now() - START_TIME) / 1000);

  // Light cache — health checks shouldn't hammer the server
  res.setHeader("Cache-Control", "public, max-age=10");

  return res.status(200).json({
    status: "ok",
    service: "erebus-arc",
    version: "1.0.0",
    uptime: uptimeSeconds,
    environment: process.env.NODE_ENV || "unknown",
    configuration: {
      apiKeyConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
      authEnabled: Boolean(process.env.EREBUS_ARC_API_KEY_HASH),
      redisEnabled: Boolean(process.env.REDIS_URL),
      rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "10", 10),
      rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
    },
    stats: {
      totalScans: stats.totalScans,
      activeIPs: stats.activeIPs,
    },
    timestamp: new Date().toISOString(),
  });
}
