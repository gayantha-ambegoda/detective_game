// The game talks to language models only through these types, so no vendor SDK leaks out of
// src/lib/llm/providers. Each provider translates them to and from its own API.

export type LlmRole = "user" | "assistant";
export type LlmMessage = { role: LlmRole; content: string };

// Abstract effort knob; each provider maps it to its own setting.
export type LlmQuality = "fast" | "balanced" | "best";

export type LlmChatRequest = {
  system: string;
  messages: LlmMessage[];
  // Upper bound on the reply, including any hidden reasoning the model does first.
  maxTokens: number;
  quality?: LlmQuality;
  signal?: AbortSignal;
};

export type JsonSchema = Record<string, unknown>;

export type LlmJsonRequest<T> = LlmChatRequest & {
  // Describes the object the model must return. Keep it strict: additionalProperties false
  // and every property listed in required.
  schema: JsonSchema;
  // Checks the parsed value and returns it typed; throws if it doesn't fit. Providers call it
  // even when their API enforces the schema, so callers never get an unchecked object.
  parse: (value: unknown) => T;
};

export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  // Yields the reply as it is written. Throws LlmRefusalError if the model declines, possibly
  // after some text has already been yielded.
  streamChat(req: LlmChatRequest): AsyncIterable<string>;
  generateJson<T>(req: LlmJsonRequest<T>): Promise<T>;
}

// The model declined to answer. Witnesses turn this into an in-character dodge.
export class LlmRefusalError extends Error {
  constructor(message = "The model declined to answer.") {
    super(message);
    this.name = "LlmRefusalError";
  }
}

// The provider can't be used right now: missing key, rate limit, outage, bad config.
// Callers should fail gracefully and not count the attempt against the player.
export class LlmUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "LlmUnavailableError";
  }
}

// The model answered, but not with what was asked for (invalid JSON, schema mismatch).
export class LlmBadOutputError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "LlmBadOutputError";
  }
}
