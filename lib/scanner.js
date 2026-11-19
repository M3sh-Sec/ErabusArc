/**
 * EREBUS ARC Active Scanner
 *
 * Shells out to nmap and nuclei to perform real active reconnaissance
 * against a target. Results are structured and fed to the AI for
 * intelligent interpretation.
 *
 * Security requirements:
 * - ACTIVE_SCAN_ENABLED must be explicitly set to "true"
 * - Target is validated before being passed to child processes
 * - All args passed as array elements (never shell-interpolated)
 * - Hard timeouts on every child process
 * - Output size is capped before being forwarded to AI
 */

import { execFile } from "child_process";
import { promisify } from "util";
import { logger } from "./logger.js";

const execFileAsync = promisify(execFile);

// ─── Config ───────────────────────────────────────────────────────────────────

const NMAP_TIMEOUT_MS   = 60_000;   // 1 min
const NUCLEI_TIMEOUT_MS = 120_000;  // 2 min
const MAX_OUTPUT_BYTES  = 64_000;   // cap forwarded to AI

// Only targets matching this pattern can be scanned
const SCANNABLE_TARGET = /^([\w\-]+\.)+[\w\-]{2,}$|^(\d{1,3}\.){3}\d{1,3}$/;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cap(str) {
  if (!str) return "";
  return str.length > MAX_OUTPUT_BYTES
    ? str.slice(0, MAX_OUTPUT_BYTES) + "\n[output truncated]"
    : str;
}

function isScannableTarget(target) {
  return SCANNABLE_TARGET.test(target.trim());
}

/**
 * Resolve the absolute path to a binary using `which`.
 * Returns the path string if found, null if not installed.
 * Using the resolved path in execFile calls prevents TOCTOU:
 * the same binary path is used for the existence check and execution.
 */
async function resolveBinaryPath(name) {
  try {
    const { stdout } = await execFileAsync("which", [name], { timeout: 3000 });
    const resolved = stdout.trim();
    return resolved || null;
  } catch {
    return null;
  }
}

// ─── nmap ─────────────────────────────────────────────────────────────────────

/**
 * Run a service-version nmap scan on the target.
 * Returns structured port/service data + raw output.
 */
export async function runNmap(target) {
  if (!isScannableTarget(target)) {
    return { skipped: true, reason: "Target is not a hostname or IP — nmap skipped." };
  }

  const nmapBin = await resolveBinaryPath("nmap");
  if (!nmapBin) {
    return { skipped: true, reason: "nmap not installed on this host." };
  }

  logger.info("NMAP_START", { target });

  try {
    const { stdout, stderr } = await execFileAsync(
      nmapBin,
      [
        "-sV",          // service/version detection
        "-sC",          // default scripts
        "--open",       // only show open ports
        "-T4",          // aggressive timing (not T5 — reduces false positives)
        "-p", "21,22,23,25,53,80,110,143,443,445,993,995,1433,1521,3306,3389,5432,5900,6379,8080,8443,8888,9200,27017",
        "--script-timeout", "30s",
        "-oN", "-",     // normal output to stdout
        target,
      ],
      { timeout: NMAP_TIMEOUT_MS }
    );

    const raw = cap(stdout + (stderr ? `\n[stderr]: ${stderr}` : ""));
    const ports = parseNmapPorts(raw);

    logger.info("NMAP_COMPLETE", { target, openPorts: ports.length });
    return { success: true, raw, ports };
  } catch (err) {
    logger.warn("NMAP_ERROR", { target, error: err.message });
    return { success: false, error: err.message, raw: cap(err.stdout || "") };
  }
}

function parseNmapPorts(raw) {
  const ports = [];
  const lines = raw.split("\n");
  for (const line of lines) {
    // e.g. "80/tcp   open  http    nginx 1.24.0"
    const m = line.match(/^(\d+)\/(tcp|udp)\s+open\s+(\S+)\s*(.*)/);
    if (m) {
      ports.push({
        port:    parseInt(m[1]),
        proto:   m[2],
        service: m[3],
        version: m[4].trim() || null,
      });
    }
  }
  return ports;
}

// ─── nuclei ──────────────────────────────────────────────────────────────────

/**
 * Run a nuclei scan using critical/high/medium severity CVE templates.
 * Returns structured findings + raw output.
 */
export async function runNuclei(target) {
  if (!isScannableTarget(target)) {
    return { skipped: true, reason: "Target is not a hostname or IP — nuclei skipped." };
  }

  const nucleiBin = await resolveBinaryPath("nuclei");
  if (!nucleiBin) {
    return { skipped: true, reason: "nuclei not installed on this host." };
  }

  logger.info("NUCLEI_START", { target });

  // Build the target URL if it looks like a hostname
  const url = /^https?:\/\//.test(target) ? target : `https://${target}`;

  try {
    const { stdout, stderr } = await execFileAsync(
      nucleiBin,
      [
        "-u", url,
        "-severity", "critical,high,medium",
        "-tags", "cve,exposure,misconfig,takeover",
        "-silent",
        "-json",
        "-timeout", "10",
        "-rate-limit", "50",
        "-no-interactsh",         // disable OOB — avoids external callbacks
      ],
      { timeout: NUCLEI_TIMEOUT_MS }
    );

    const raw = cap(stdout);
    const findings = parseNucleiJson(raw);

    logger.info("NUCLEI_COMPLETE", { target, findings: findings.length });
    return { success: true, raw, findings };
  } catch (err) {
    logger.warn("NUCLEI_ERROR", { target, error: err.message });
    return { success: false, error: err.message, raw: cap(err.stdout || "") };
  }
}

function parseNucleiJson(raw) {
  const findings = [];
  const lines = raw.split("\n").filter(Boolean);
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      findings.push({
        templateId: obj["template-id"],
        name:       obj.info?.name,
        severity:   obj.info?.severity?.toUpperCase(),
        cve:        obj.info?.classification?.["cve-id"]?.[0] || null,
        matched:    obj["matched-at"],
        type:       obj.type,
        tags:       obj.info?.tags || [],
      });
    } catch {
      // non-JSON line — skip
    }
  }
  return findings;
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

/**
 * Run both nmap and nuclei, return a combined result object
 * ready to be injected into the AI prompt.
 */
export async function runActiveScan(target) {
  if (process.env.ACTIVE_SCAN_ENABLED !== "true") {
    return {
      enabled: false,
      reason: "Active scanning is disabled. Set ACTIVE_SCAN_ENABLED=true to enable.",
    };
  }

  const [nmapResult, nucleiResult] = await Promise.all([
    runNmap(target),
    runNuclei(target),
  ]);

  return {
    enabled: true,
    target,
    nmap:   nmapResult,
    nuclei: nucleiResult,
  };
}

/**
 * Strip characters that could be used for prompt injection from
 * scanner-sourced strings before they enter the AI context.
 * Keeps printable ASCII only; removes control chars and common
 * injection delimiters (backticks, angle brackets, curly braces).
 */
function sanitizeScanField(val) {
  if (typeof val !== "string") return String(val ?? "");
  return val
    .replace(/[^\x20-\x7E]/g, "")        // non-printable ASCII
    .replace(/[`<>{}\[\]\\]/g, "")        // injection delimiters
    .replace(/ignore\s+(previous|above|prior)\s+instructions/gi, "[REDACTED]")
    .replace(/system\s*prompt/gi, "[REDACTED]")
    .slice(0, 200);                        // hard field length cap
}

/**
 * Format active scan results into a human-readable block
 * suitable for injection into the AI system prompt.
 */
export function formatScanResultsForAI(scanResult) {
  if (!scanResult?.enabled) return "";

  const lines = [
    "=== ACTIVE SCAN RESULTS (treat as ground truth) ===",
    `Target: ${scanResult.target}`,
    "",
  ];

  // nmap
  if (scanResult.nmap?.success) {
    lines.push("--- nmap port/service scan ---");
    if (scanResult.nmap.ports?.length) {
      for (const p of scanResult.nmap.ports) {
        const port    = Number.isInteger(p.port) ? p.port : 0;
        const proto   = sanitizeScanField(p.proto);
        const service = sanitizeScanField(p.service);
        const version = p.version ? sanitizeScanField(p.version) : "";
        lines.push(`  ${port}/${proto}  ${service}  ${version}`);
      }
    } else {
      lines.push("  No open ports found in common port range.");
    }
    lines.push("");
  } else if (scanResult.nmap?.skipped) {
    lines.push(`[nmap skipped: ${sanitizeScanField(scanResult.nmap.reason)}]`);
    lines.push("");
  }

  // nuclei
  if (scanResult.nuclei?.success) {
    lines.push("--- nuclei vulnerability scan ---");
    if (scanResult.nuclei.findings?.length) {
      for (const f of scanResult.nuclei.findings) {
        const severity   = sanitizeScanField(f.severity);
        const name       = sanitizeScanField(f.name);
        const templateId = sanitizeScanField(f.templateId);
        const cve        = f.cve ? sanitizeScanField(f.cve) : null;
        const matched    = f.matched ? sanitizeScanField(f.matched) : null;
        lines.push(`  [${severity}] ${name} (${templateId})${cve ? ` — ${cve}` : ""}`);
        if (matched) lines.push(`    matched: ${matched}`);
      }
    } else {
      lines.push("  No findings from nuclei template scan.");
    }
    lines.push("");
  } else if (scanResult.nuclei?.skipped) {
    lines.push(`[nuclei skipped: ${sanitizeScanField(scanResult.nuclei.reason)}]`);
    lines.push("");
  }

  lines.push("=== END ACTIVE SCAN RESULTS ===");
  return lines.join("\n");
}
