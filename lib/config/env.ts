/**
 * Central place to read operator-supplied configuration (Constitution
 * Principle VIII: credentials belong to the operator, supplied at runtime).
 * Nothing in this module holds a credential on anyone's behalf — it only
 * reads what the process was started with.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getDatabaseUrl(): string {
  return required("DATABASE_URL");
}

export function getGitHubToken(): string {
  return required("GITHUB_TOKEN");
}

export type LlmProviderName = "openai" | "anthropic" | "openai-compatible";

export interface LlmConfig {
  provider: LlmProviderName;
  model: string;
  apiKey: string;
  /** Only meaningful for "openai-compatible" (e.g. a self-hosted server). */
  baseUrl?: string;
}

/**
 * Reads the operator's chosen LLM provider/model/credential. Which vendor
 * is used is a config decision, never a code-level one (Constitution
 * Principle VII, NON-NEGOTIABLE) — see lib/assessment/provider.ts, which is
 * the only module that turns this config into an actual SDK provider
 * instance.
 */
export function getLlmConfig(): LlmConfig {
  const provider = required("LLM_PROVIDER") as LlmProviderName;
  const model = required("LLM_MODEL");
  const apiKey = required("LLM_API_KEY");
  const baseUrl = process.env.LLM_BASE_URL;

  if (provider === "openai-compatible" && !baseUrl) {
    throw new Error(
      "LLM_BASE_URL is required when LLM_PROVIDER=openai-compatible",
    );
  }

  return { provider, model, apiKey, baseUrl };
}
