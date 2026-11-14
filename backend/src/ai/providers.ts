import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateObject } from "ai";
import { z } from "zod";
import { env } from "../env.js";

export class AiError extends Error {
  constructor(
    public readonly code:
      | "AI_NOT_CONFIGURED"
      | "AI_UNAVAILABLE"
      | "AI_DISABLED"
      | "AI_LIMIT_REACHED"
      | "AI_BUSY"
      | "AI_INVALID_OUTPUT"
      | "SECRET_FINDING"
      | "FILE_TOO_LARGE"
      | "FILE_NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "AiError";
  }
}

interface ProviderConfig {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
  model: string;
}

// In-memory circuit breaker state: cooldown 60s after 3 consecutive failures or any 429
interface CircuitState {
  failures: number;
  cooldownUntil: number;
}
const circuitBreakers = new Map<string, CircuitState>();

export function resetCircuitBreakers(): void {
  circuitBreakers.clear();
}

function getCircuitState(id: string): CircuitState {
  let s = circuitBreakers.get(id);
  if (!s) {
    s = { failures: 0, cooldownUntil: 0 };
    circuitBreakers.set(id, s);
  }
  return s;
}

function isProviderAvailable(id: string): boolean {
  const s = getCircuitState(id);
  return Date.now() >= s.cooldownUntil;
}

function recordSuccess(id: string): void {
  const s = getCircuitState(id);
  s.failures = 0;
  s.cooldownUntil = 0;
}

function recordFailure(id: string, isRateLimit: boolean): void {
  const s = getCircuitState(id);
  s.failures++;
  if (isRateLimit || s.failures >= 3) {
    s.cooldownUntil = Date.now() + 60_000; // 60s cooldown
  }
}

export function getEnabledProviders(): ProviderConfig[] {
  const providers: ProviderConfig[] = [];

  if (env.GROQ_API_KEY && env.AI_MODEL_GROQ) {
    providers.push({
      id: "groq",
      name: "Groq",
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: env.GROQ_API_KEY,
      model: env.AI_MODEL_GROQ,
    });
  }

  if (env.GEMINI_API_KEY && env.AI_MODEL_GEMINI) {
    providers.push({
      id: "gemini",
      name: "Gemini",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      apiKey: env.GEMINI_API_KEY,
      model: env.AI_MODEL_GEMINI,
    });
  }

  if (env.OPENROUTER_API_KEY && env.AI_MODEL_OPENROUTER) {
    providers.push({
      id: "openrouter",
      name: "OpenRouter",
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: env.OPENROUTER_API_KEY,
      model: env.AI_MODEL_OPENROUTER,
    });
  }

  // Sort according to AI_PROVIDER_ORDER
  const order = env.AI_PROVIDER_ORDER.split(",").map((s) => s.trim().toLowerCase());
  providers.sort((a, b) => {
    const idxA = order.indexOf(a.id);
    const idxB = order.indexOf(b.id);
    const posA = idxA === -1 ? 999 : idxA;
    const posB = idxB === -1 ? 999 : idxB;
    return posA - posB;
  });

  return providers;
}

export function logStartupProviders(logger: { info: (obj: any, msg: string) => void }): void {
  const enabled = getEnabledProviders().map((p) => p.id);
  for (const name of ["groq", "gemini", "openrouter"]) {
    logger.info(
      { provider: name, status: enabled.includes(name) ? "enabled" : "disabled" },
      `AI provider ${name} is ${enabled.includes(name) ? "enabled" : "disabled"}`,
    );
  }
}

export interface CallModelResult<T> {
  object: T;
  provider: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
}

export async function callModel<T>(options: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  signal?: AbortSignal;
}): Promise<CallModelResult<T>> {
  const providers = getEnabledProviders();
  if (providers.length === 0) {
    throw new AiError("AI_NOT_CONFIGURED", "No AI provider is configured");
  }

  const availableProviders = providers.filter((p) => isProviderAvailable(p.id));
  if (availableProviders.length === 0) {
    throw new AiError("AI_UNAVAILABLE", "All AI providers are temporarily in cooldown");
  }

  let lastError: Error | null = null;

  for (const p of availableProviders) {
    const client = createOpenAICompatible({
      name: p.id,
      baseURL: p.baseURL,
      apiKey: p.apiKey,
    });

    const modelInstance = client.chatModel(p.model);

    // AI_REQUEST_TIMEOUT_MS timeout combined with optional caller signal
    const timeoutSignal = AbortSignal.timeout(env.AI_REQUEST_TIMEOUT_MS);
    const combinedSignal = options.signal
      ? AbortSignal.any([options.signal, timeoutSignal])
      : timeoutSignal;

    // Try up to 2 attempts for this provider (original + 1 retry on validation error)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const userPrompt =
          attempt === 0
            ? options.user
            : `${options.user}\n\n[Previous response had schema validation errors. Please strictly follow the schema.]`;

        const result = await generateObject({
          model: modelInstance,
          schema: options.schema,
          system: options.system,
          prompt: userPrompt,
          abortSignal: combinedSignal,
        });

        recordSuccess(p.id);

        return {
          object: result.object,
          provider: p.id,
          model: p.model,
          usage: {
            promptTokens: (result.usage as any)?.promptTokens || (result.usage as any)?.inputTokens || 0,
            completionTokens: (result.usage as any)?.completionTokens || (result.usage as any)?.outputTokens || 0,
          },
        };
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const isRateLimit =
          err?.status === 429 || errMsg.includes("429") || errMsg.includes("rate limit");

        if (isRateLimit) {
          recordFailure(p.id, true);
          break; // move to next provider immediately
        }

        if (err?.name === "AbortError" || errMsg.includes("timeout")) {
          recordFailure(p.id, false);
          break; // move to next provider
        }

        // If it's a schema validation error, retry once
        if (attempt === 0 && (err?.name === "NoObjectGeneratedError" || errMsg.includes("validation"))) {
          continue;
        }

        recordFailure(p.id, false);
        break;
      }
    }
  }

  if (lastError?.name === "NoObjectGeneratedError") {
    throw new AiError("AI_INVALID_OUTPUT", "Failed to parse model structured output");
  }

  throw new AiError("AI_UNAVAILABLE", "All configured AI providers failed to fulfill the request");
}

