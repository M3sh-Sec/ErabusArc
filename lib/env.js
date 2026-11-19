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

// Determine which provider is active (default: anthropic)
const _provider = process.env.AI_PROVIDER || "anthropic";

// ANTHROPIC_API_KEY is only required when provider is anthropic (the default)
const REQUIRED_SERVER_VARS = _provider === "anthropic"
  ? [
      {
        key: "ANTHROPIC_API_KEY",
        validate: (v) => v.startsWith("sk-ant-"),
        hint: "Must start with 'sk-ant-'. Get yours at https://console.anthropic.com/",
      },
    ]
  : [];

const OPTIONAL_SERVER_VARS = [
  {
    key: "AI_PROVIDER",
    validate: (v) => ["anthropic", "openai", "google", "mistral", "local"].includes(v),
    hint: "Must be one of: anthropic, openai, google, mistral, local (default: anthropic)",
    default: "anthropic",
  },
  {
    key: "OPENAI_API_KEY",
    validate: (v) => v.length > 10,
    hint: "Required when AI_PROVIDER=openai. Get yours at https://platform.openai.com/",
    default: null,
  },
  {
    key: "GOOGLE_API_KEY",
    validate: (v) => v.length > 10,
    hint: "Required when AI_PROVIDER=google. Get yours at https://aistudio.google.com/",
    default: null,
  },
  {
    key: "MISTRAL_API_KEY",
    validate: (v) => v.length > 10,
    hint: "Required when AI_PROVIDER=mistral. Get yours at https://console.mistral.ai/",
    default: null,
  },
  {
    key: "LOCAL_MODEL_URL",
    validate: (v) => v.startsWith("http://") || v.startsWith("https://"),
    hint: "Optional. Base URL for local model (Ollama/LM Studio). Default: http://localhost:11434/v1",
    default: null,
  },
  {
    key: "LOCAL_MODEL_NAME",
    validate: (v) => v.length > 0,
    hint: "Optional. Model name for local provider (e.g. llama3, mistral). Default: llama3",
    default: null,
  },
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
  {
    key: "ACTIVE_SCAN_ENABLED",
    validate: (v) => v === "true" || v === "false",
    hint: "Optional. Set to 'true' to enable active scanning with nmap + nuclei. Requires both tools installed. Default: false",
    default: "false",
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
