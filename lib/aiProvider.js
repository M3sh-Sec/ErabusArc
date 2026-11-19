/**
 * EREBUS ARC AI Provider Abstraction
 *
 * Supports multiple AI providers through a unified interface:
 *   - anthropic  → Anthropic Claude (default)
 *   - openai     → OpenAI GPT-4o and other OpenAI models
 *   - google     → Google Gemini via OpenAI-compatible API
 *   - mistral    → Mistral AI via OpenAI-compatible API
 *   - local      → Local models via OpenAI-compatible API (Ollama, LM Studio)
 *
 * Server-side only — API keys are never sent to the browser.
 */

import Anthropic from "@anthropic-ai/sdk";

// Lazy-load OpenAI SDK to avoid import errors when it's not installed
let OpenAIClass = null;
async function getOpenAI() {
  if (!OpenAIClass) {
    try {
      const mod = await import("openai");
      OpenAIClass = mod.default || mod.OpenAI;
    } catch {
      throw new Error(
        "openai package not installed. Run: npm install openai"
      );
    }
  }
  return OpenAIClass;
}

/**
 * Provider configurations
 * Each provider maps to a base URL + environment variable for the API key.
 */
const PROVIDER_CONFIGS = {
  anthropic: {
    type: "anthropic",
    defaultModel: "claude-sonnet-4-20250514",
    envKey: "ANTHROPIC_API_KEY",
  },
  openai: {
    type: "openai",
    baseURL: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
    envKey: "OPENAI_API_KEY",
  },
  google: {
    type: "openai-compat",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.5-flash",
    envKey: "GOOGLE_API_KEY",
  },
  mistral: {
    type: "openai-compat",
    baseURL: "https://api.mistral.ai/v1",
    defaultModel: "mistral-large-latest",
    envKey: "MISTRAL_API_KEY",
  },
  local: {
    type: "openai-compat",
    // Default to Ollama; override with LOCAL_MODEL_URL env var
    baseURL: process.env.LOCAL_MODEL_URL || "http://localhost:11434/v1",
    defaultModel: process.env.LOCAL_MODEL_NAME || "llama3",
    envKey: null, // local models typically don't need an API key
  },
};

/**
 * Call an Anthropic model and return the response text.
 */
async function callAnthropic({ model, maxTokens, systemPrompt, userMessage }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set.");

  const client = new Anthropic({ apiKey, timeout: 120_000, maxRetries: 1 });
  const message = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });
  return message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
}

/**
 * Call an OpenAI-compatible model and return the response text.
 * Covers OpenAI, Google Gemini, Mistral, Ollama, LM Studio.
 */
async function callOpenAICompat({
  baseURL,
  apiKey,
  model,
  maxTokens,
  systemPrompt,
  userMessage,
}) {
  const OpenAI = await getOpenAI();
  const client = new OpenAI({
    apiKey: apiKey || "local", // Ollama/LM Studio don't require a real key
    baseURL,
    timeout: 120_000,
    maxRetries: 1,
  });

  const params = {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  };

  // max_tokens is widely supported; some providers call it max_completion_tokens
  if (maxTokens) params.max_tokens = maxTokens;

  const completion = await client.chat.completions.create(params);
  return completion.choices[0]?.message?.content || "";
}

/**
 * Main entry point.
 *
 * @param {object} options
 * @param {string} [options.provider]      - One of: anthropic, openai, google, mistral, local
 * @param {string} [options.model]         - Model identifier (overrides provider default)
 * @param {number} [options.maxTokens]     - Max output tokens (default: 8000)
 * @param {string} options.systemPrompt   - System prompt
 * @param {string} options.userMessage    - User message
 * @returns {Promise<string>}             - Raw text response from the model
 */
export async function callAI({
  provider = process.env.AI_PROVIDER || "anthropic",
  model,
  maxTokens = 8000,
  systemPrompt,
  userMessage,
}) {
  const cfg = PROVIDER_CONFIGS[provider];
  if (!cfg) {
    throw new Error(
      `Unknown provider "${provider}". Valid options: ${Object.keys(PROVIDER_CONFIGS).join(", ")}`
    );
  }

  // Resolve model: request → env override → provider default
  const resolvedModel =
    model ||
    (provider === "local" ? process.env.LOCAL_MODEL_NAME : null) ||
    cfg.defaultModel;

  // Check API key for providers that need one
  if (cfg.envKey) {
    const key = process.env[cfg.envKey];
    if (!key) {
      throw new Error(
        `${cfg.envKey} is not set. Required for provider "${provider}".`
      );
    }
  }

  if (cfg.type === "anthropic") {
    return callAnthropic({
      model: resolvedModel,
      maxTokens,
      systemPrompt,
      userMessage,
    });
  }

  // openai or openai-compat
  const apiKey = cfg.envKey ? process.env[cfg.envKey] : "local";
  const baseURL =
    provider === "local"
      ? process.env.LOCAL_MODEL_URL || cfg.baseURL
      : cfg.baseURL;

  return callOpenAICompat({
    baseURL,
    apiKey,
    model: resolvedModel,
    maxTokens,
    systemPrompt,
    userMessage,
  });
}

/**
 * Returns the list of available providers with their default models.
 * Used by the UI to populate the model selector.
 */
export function getAvailableProviders() {
  return Object.entries(PROVIDER_CONFIGS).map(([id, cfg]) => ({
    id,
    defaultModel: cfg.defaultModel,
    requiresKey: !!cfg.envKey,
    keyEnvVar: cfg.envKey,
    // A provider is "configured" if its API key is set (or it's local)
    configured:
      !cfg.envKey || !!process.env[cfg.envKey],
  }));
}

/**
 * Returns the default model for a provider.
 */
export function getDefaultModel(provider) {
  return PROVIDER_CONFIGS[provider]?.defaultModel ?? null;
}
