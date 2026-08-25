/**
 * EREBUS ARC Input Validation
 *
 * All user input is validated and sanitized server-side before being
 * passed to the AI model. This prevents:
 * - Prompt injection attacks
 * - Overly long inputs that inflate API costs
 * - Malformed or unexpected data shapes
 * - XSS payloads reaching the AI context
 */

import { z } from "zod";

// ─── Constants ────────────────────────────────────────────────────────────────

const TARGET_MIN_LENGTH = 2;
const TARGET_MAX_LENGTH = 200;

// Allowed characters: alphanumeric, spaces, dots, hyphens, underscores,
// slashes (for URLs), colons (for URLs), and @ symbols (for packages)
const SAFE_TARGET_PATTERN = /^[a-zA-Z0-9\s\.\-\_\/\:\@\#\+]+$/;

// Block obvious prompt injection attempts
const INJECTION_PATTERNS = [
  /ignore\s+(previous|above|prior)\s+instructions/i,
  /system\s*prompt/i,
  /you\s+are\s+now/i,
  /forget\s+everything/i,
  /<\s*script/i,
  /javascript\s*:/i,
  /\beval\s*\(/i,
  /\bexec\s*\(/i,
];

// ─── Schema ───────────────────────────────────────────────────────────────────

export const scanRequestSchema = z.object({
  target: z
    .string()
    .trim()
    .min(TARGET_MIN_LENGTH, `Target must be at least ${TARGET_MIN_LENGTH} characters`)
    .max(TARGET_MAX_LENGTH, `Target must be at most ${TARGET_MAX_LENGTH} characters`)
    .refine(
      (val) => SAFE_TARGET_PATTERN.test(val),
      "Target contains invalid characters. Use alphanumeric characters, dots, hyphens, or a valid URL."
    )
    .refine(
      (val) => !INJECTION_PATTERNS.some((pattern) => pattern.test(val)),
      "Target contains disallowed content."
    ),
});

// ─── Sanitizer ────────────────────────────────────────────────────────────────

/**
 * Strips any HTML/script tags from a string as a secondary defense layer.
 * Validation above should catch these, but defense-in-depth matters.
 */
export function sanitizeString(str) {
  return str
    .replace(/<[^>]*>/g, "")         // strip HTML tags
    .replace(/[<>'"]/g, "")          // strip remaining angle brackets and quotes
    .trim();
}

/**
 * Validates and sanitizes the scan request body.
 * Returns { success, data, errors }
 */
export function validateScanRequest(body) {
  const result = scanRequestSchema.safeParse(body);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.errors.map((e) => e.message),
    };
  }

  return {
    success: true,
    data: {
      target: sanitizeString(result.data.target),
    },
  };
}
