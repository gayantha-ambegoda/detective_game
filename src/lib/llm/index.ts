import "server-only";
import { AnthropicProvider } from "@/lib/llm/providers/anthropic";
import { LlmUnavailableError, type LlmProvider } from "@/lib/llm/types";

export * from "@/lib/llm/types";

// What the model is used for. Each purpose can run on its own provider and model.
export type LlmPurpose = "witness" | "grader";

// Add a provider here and set LLM_PROVIDER (or LLM_<PURPOSE>_PROVIDER) to its name.
const providers: Record<string, (model: string) => LlmProvider> = {
  anthropic: (model) => new AnthropicProvider(model),
};

const defaultModels: Record<string, Record<LlmPurpose, string>> = {
  anthropic: { witness: "claude-haiku-5-5", grader: "claude-haiku-5-5" },
};

const cache = new Map<string, LlmProvider>();

// Reads, for example, LLM_WITNESS_PROVIDER, then LLM_PROVIDER, then the default.
function setting(purpose: LlmPurpose, key: "PROVIDER" | "MODEL") {
  return process.env[`LLM_${purpose.toUpperCase()}_${key}`] || (key === "PROVIDER" ? process.env.LLM_PROVIDER : undefined);
}

export function getLlm(purpose: LlmPurpose): LlmProvider {
  const name = (setting(purpose, "PROVIDER") || "anthropic").toLowerCase();
  const create = providers[name];
  if (!create) {
    throw new LlmUnavailableError(`Unknown LLM provider "${name}" for ${purpose}.`);
  }
  const model = setting(purpose, "MODEL") || defaultModels[name]?.[purpose];
  if (!model) {
    throw new LlmUnavailableError(`No model set for ${purpose}: set LLM_${purpose.toUpperCase()}_MODEL.`);
  }

  const key = `${name}:${model}`;
  let provider = cache.get(key);
  if (!provider) {
    provider = create(model);
    cache.set(key, provider);
  }
  return provider;
}
