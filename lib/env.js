/**
 * EREBUS ARC Environment Validation
 *
 * Validates all required environment variables at startup.
 * If any required variable is missing or invalid, the process exits immediately
 * rather than running in a broken/insecure state.
 *
 * SDL principle: Fail secure — don't start if the configuration is unsafe.
 *
 * Call this once at the top of any server-side module that needs env vars.
 * In Next.js, import it in next.config.js or at the top of your API routes.
 */

const REQUIRED_SERVER_VARS = [
  {
    key: "ANTHROPIC_API_KEY",
    validate: (v) => v.startsWith("sk-ant-"),
    hint: "Must start with 'sk-ant-'. Get yours at https://console.anthropic.com/",
  },
];

const OPTIONAL_SERVER_VARS = [
  {
    key: "RATE_LIMIT_MAX",
    validate: (v) => !isNaN(parseInt(v, 10)) && parseInt(v, 10) > 0,
    hint: "Must be a positive integer (default: 10)",
    default: "10",
  },
  {
    key: "RATE_LIMIT_WINDOW_MS",
    validate: (v) => !isNaN(parseInt(v, 10)) && parseInt(v, 10) >= 1000,
    hint: "Must be >= 1000 milliseconds (default: 60000)",
    default: "60000",
  },
  {
    key: "REDIS_URL",
    validate: (v) => v.startsWith("redis://") || v.startsWith("rediss://"),
    hint: "Optional. Redis URL for distributed rate limiting. Format: redis://host:port",
    default: null,
  },
  {
    key: "AUTH_SECRET",
    validate: (v) => v.length >= 32,
    hint: "Optional. Must be at least 32 characters for HMAC signing. Generate with: openssl rand -hex 32",
    default: null,
  },
];

let validated = false;

export function validateEnv() {
  // Only validate once per process
  if (validated) return;

  // Skip validation in test environments
  if (process.env.NODE_ENV === "test") {
    validated = true;
    return;
  }

  const errors = [];
  const warnings = [];

  // Check required vars
  for (const { key, validate, hint } of REQUIRED_SERVER_VARS) {
    const value = process.env[key];
    if (!value) {
      errors.push(`  ✗ ${key} is not set. ${hint}`);
    } else if (!validate(value)) {
      errors.push(`  ✗ ${key} is set but invalid. ${hint}`);
    }
  }

  // Check optional vars — warn if set but invalid, apply defaults if missing
  for (const { key, validate, hint, default: defaultVal } of OPTIONAL_SERVER_VARS) {
    const value = process.env[key];
    if (value && !validate(value)) {
      warnings.push(`  ⚠ ${key} is set but invalid. ${hint}`);
    }
    if (!value && defaultVal !== null) {
      process.env[key] = defaultVal;
    }
  }

  // Security warnings
  if (!process.env.AUTH_SECRET) {
    warnings.push("  ⚠ AUTH_SECRET not set — API key auth is disabled. Set it in production.");
  }
  if (!process.env.REDIS_URL) {
    warnings.push("  ⚠ REDIS_URL not set — using in-memory rate limiting. Not suitable for multi-instance deployments.");
  }

  // Print warnings (non-fatal)
  if (warnings.length > 0) {
    console.warn("\n[EREBUS ARC] Configuration warnings:");
    warnings.forEach((w) => console.warn(w));
  }

  // Hard fail on missing required vars
  if (errors.length > 0) {
    console.error("\n[EREBUS ARC] FATAL — Missing or invalid required environment variables:");
    errors.forEach((e) => console.error(e));
    console.error("\nCopy .env.example to .env.local and fill in your values.\n");
    process.exit(1);
  }

  validated = true;
  console.log("[EREBUS ARC] Environment validated ✓");
}
