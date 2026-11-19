/**
 * GET /api/providers
 *
 * Returns the list of AI providers and whether each one is configured
 * (i.e. its API key is set in the environment). This is safe to call
 * from the client because it never reveals the key values themselves.
 */

import { requireAuth } from "../../lib/session.js";
import { getAvailableProviders } from "../../lib/aiProvider.js";
import { ROLES } from "../../lib/db.js";

const PROVIDER_LABELS = {
  anthropic: "Claude (Anthropic)",
  openai:    "GPT-4o (OpenAI)",
  google:    "Gemini (Google)",
  mistral:   "Mistral AI",
  local:     "Local Model (Ollama / LM Studio)",
};

const PROVIDER_MODELS = {
  anthropic: [
    { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4.5" },
    { id: "claude-opus-4-5",          label: "Claude Opus 4.5" },
    { id: "claude-haiku-4-5",         label: "Claude Haiku 4.5" },
  ],
  openai: [
    { id: "gpt-4o",        label: "GPT-4o" },
    { id: "gpt-4o-mini",   label: "GPT-4o Mini" },
    { id: "gpt-4-turbo",   label: "GPT-4 Turbo" },
    { id: "o1",            label: "o1" },
    { id: "o3-mini",       label: "o3-mini" },
  ],
  google: [
    { id: "gemini-2.5-flash",  label: "Gemini 2.5 Flash" },
    { id: "gemini-2.5-pro",    label: "Gemini 2.5 Pro" },
    { id: "gemini-2.0-flash",  label: "Gemini 2.0 Flash" },
  ],
  mistral: [
    { id: "mistral-large-latest",   label: "Mistral Large" },
    { id: "mistral-medium-latest",  label: "Mistral Medium" },
    { id: "mistral-small-latest",   label: "Mistral Small" },
  ],
  local: [
    { id: "llama3",         label: "Llama 3" },
    { id: "llama3:8b",      label: "Llama 3 8B" },
    { id: "llama3:70b",     label: "Llama 3 70B" },
    { id: "mistral",        label: "Mistral 7B" },
    { id: "mixtral",        label: "Mixtral 8x7B" },
    { id: "phi3",           label: "Phi-3" },
    { id: "gemma3",         label: "Gemma 3" },
    { id: "qwen2.5",        label: "Qwen 2.5" },
  ],
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ctx = await requireAuth(req, res, { role: ROLES.ANALYST });
  if (!ctx) return;

  const providers = getAvailableProviders().map((p) => ({
    id: p.id,
    label: PROVIDER_LABELS[p.id] || p.id,
    configured: p.configured,
    models: PROVIDER_MODELS[p.id] || [],
    defaultModel: p.defaultModel,
  }));

  return res.status(200).json({ providers, activeProvider: process.env.AI_PROVIDER || "anthropic" });
}
