import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import {
  LlmBadOutputError,
  LlmRefusalError,
  LlmUnavailableError,
  type LlmChatRequest,
  type LlmJsonRequest,
  type LlmProvider,
  type LlmQuality,
} from "@/lib/llm/types";

const effortFor: Record<LlmQuality, "low" | "medium" | "high"> = {
  fast: "low",
  balanced: "medium",
  best: "high",
};

// Credentials come from the environment (ANTHROPIC_API_KEY), read when the first request is made.
export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";
  private client: Anthropic | undefined;

  constructor(readonly model: string) {}

  private getClient() {
    try {
      this.client ??= new Anthropic();
      return this.client;
    } catch (error) {
      throw new LlmUnavailableError("Anthropic client could not be created. Is ANTHROPIC_API_KEY set?", { cause: error });
    }
  }

  private params(req: LlmChatRequest) {
    return {
      model: this.model,
      max_tokens: req.maxTokens,
      system: req.system,
      messages: req.messages,
      output_config: { effort: effortFor[req.quality ?? "balanced"] },
    };
  }

  async *streamChat(req: LlmChatRequest): AsyncIterable<string> {
    try {
      const stream = this.getClient().messages.stream(this.params(req), { signal: req.signal });
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield event.delta.text;
        }
      }
      const message = await stream.finalMessage();
      logUsage(this.model, message.usage);
      if (message.stop_reason === "refusal") throw new LlmRefusalError();
    } catch (error) {
      throw translate(error);
    }
  }

  async generateJson<T>(req: LlmJsonRequest<T>): Promise<T> {
    let message: Anthropic.Message;
    try {
      const params = this.params(req);
      message = await this.getClient().messages.create(
        {
          ...params,
          output_config: { ...params.output_config, format: { type: "json_schema", schema: req.schema } },
        },
        { signal: req.signal },
      );
    } catch (error) {
      throw translate(error);
    }
    logUsage(this.model, message.usage);

    if (message.stop_reason === "refusal") throw new LlmRefusalError();
    if (message.stop_reason === "max_tokens") {
      throw new LlmBadOutputError("The reply was cut off before the JSON was complete. Raise maxTokens.");
    }
    const text = message.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
    try {
      return req.parse(JSON.parse(text));
    } catch (error) {
      throw new LlmBadOutputError("The model's JSON did not match the expected shape.", { cause: error });
    }
  }
}

function translate(error: unknown) {
  // Our own errors and a caller's abort pass through untouched.
  if (
    error instanceof LlmRefusalError ||
    error instanceof LlmUnavailableError ||
    error instanceof LlmBadOutputError ||
    error instanceof Anthropic.APIUserAbortError
  ) {
    return error;
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new LlmUnavailableError("Anthropic rate limit reached.", { cause: error });
  }
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return new LlmUnavailableError("Anthropic rejected the API key.", { cause: error });
  }
  if (error instanceof Anthropic.APIError) {
    return new LlmUnavailableError(`Anthropic request failed (${error.status ?? "no status"}).`, { cause: error });
  }
  if (error instanceof Anthropic.AnthropicError) {
    return new LlmUnavailableError("Anthropic request failed.", { cause: error });
  }
  return error;
}

// One line per call, so cost can be compared across providers and models later.
function logUsage(model: string, usage: Anthropic.Usage) {
  console.info("llm usage", {
    provider: "anthropic",
    model,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
  });
}
