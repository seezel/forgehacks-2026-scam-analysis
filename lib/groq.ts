import Groq from "groq-sdk";
import {
  extractionJsonSchema,
  parseExtraction,
  SIGNAL_IDS,
} from "@/lib/extraction-schema";
import type { AnalyzeInput, ExtractionResult } from "@/types/analysis";

const DEFAULT_MODEL = "qwen/qwen3.8-27b";
const RETRY_DELAY_MS = 500;

type CompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
};

export type GroqClientLike = {
  chat: {
    completions: {
      create: (request: Record<string, unknown>) => Promise<CompletionResponse>;
    };
  };
};

type ExtractSignalsDependencies = {
  client?: GroqClientLike;
  sleep?: (milliseconds: number) => Promise<void>;
};

export class ProviderTimeoutError extends Error {
  constructor() {
    super("The analysis provider timed out.");
    this.name = "ProviderTimeoutError";
  }
}

export class ProviderRateLimitError extends Error {
  constructor() {
    super("The analysis provider is temporarily rate limited.");
    this.name = "ProviderRateLimitError";
  }
}

export class ProviderResponseError extends Error {
  constructor(
    message = "The analysis provider returned an invalid response.",
    readonly transient = false,
  ) {
    super(message);
    this.name = "ProviderResponseError";
  }
}

export async function extractSignals(
  input: AnalyzeInput,
  dependencies: ExtractSignalsDependencies = {},
): Promise<ExtractionResult> {
  const client = dependencies.client ?? createGroqClient();
  const sleep = dependencies.sleep ?? delay;
  const response = await createCompletionWithRetry(
    client,
    await buildRequest(input),
    sleep,
  );
  const content = response.choices?.[0]?.message?.content;

  if (!content?.trim()) {
    throw new ProviderResponseError(
      "The analysis provider returned an empty response.",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new ProviderResponseError(
      "The analysis provider returned malformed JSON.",
    );
  }

  try {
    return parseExtraction(parsed);
  } catch {
    throw new ProviderResponseError(
      "The analysis provider response did not match the extraction schema.",
    );
  }
}

function createGroqClient(): GroqClientLike {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new ProviderResponseError("GROQ_API_KEY is not configured.", true);
  }

  return new Groq({
    apiKey,
    maxRetries: 0,
    timeout: 20_000,
  }) as unknown as GroqClientLike;
}

async function buildRequest(input: AnalyzeInput): Promise<Record<string, unknown>> {
  const textPrompt = [
    `Text:\n${input.text || "(not provided)"}`,
    `URL:\n${input.url || "(not provided)"}`,
    `Platform:\n${input.platform || "(not provided)"}`,
    `Context:\n${input.context || "(not provided)"}`,
  ].join("\n\n");

  let userContent: unknown = textPrompt;
  if (input.image) {
    const base64 = Buffer.from(await input.image.arrayBuffer()).toString("base64");
    userContent = [
      { type: "text", text: textPrompt },
      {
        type: "image_url",
        image_url: {
          url: `data:${input.image.type};base64,${base64}`,
        },
      },
    ];
  }

  return {
    model: process.env.GROQ_MODEL ?? DEFAULT_MODEL,
    reasoning_effort: "none",
    temperature: 0,
    seed: 42,
    messages: [
      { role: "system", content: extractionInstruction() },
      { role: "user", content: userContent },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "scam_signal_extraction",
        strict: true,
        schema: extractionJsonSchema,
      },
    },
  };
}

function extractionInstruction(): string {
  return [
    "Extract observations only from the submitted content.",
    "Do not classify the final scam type.",
    "Do not decide Strong, Possible, or Insufficient evidence status.",
    `Use only these controlled signal IDs: ${SIGNAL_IDS.join(", ")}.`,
    "Evaluate every controlled signal ID independently.",
    "Include every signal that is directly supported by the submitted content.",
    "Do not omit a supported signal merely because a similar signal is also present.",
    "Do not infer unsupported signals.",
    'For source "text", evidence must be an exact verbatim substring from the submitted Text field, and source must be "text".',
    'For source "context", evidence must be an exact verbatim substring from the submitted Context field, and source must be "context".',
    'For source "url", evidence must be an exact substring from the submitted URL field, and source must be "url".',
    'For source "image", evidence may be a short transcription or description of visible image content.',
    "If something cannot be determined, put it in uncertainties rather than guessing.",
    "Do not invent names, links, identities, actions, payments, credentials, or warning signs.",
  ].join("\n");
}

async function createCompletionWithRetry(
  client: GroqClientLike,
  request: Record<string, unknown>,
  sleep: (milliseconds: number) => Promise<void>,
): Promise<CompletionResponse> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await client.chat.completions.create(request);
    } catch (error) {
      const status = providerStatus(error);
      const retryableServerFailure =
        status !== undefined && status >= 500 && status < 600;

      if (attempt === 0 && retryableServerFailure) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      throw mapProviderError(error, status);
    }
  }

  throw new ProviderResponseError("The analysis provider is unavailable.", true);
}

function providerStatus(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }
  return undefined;
}

function mapProviderError(error: unknown, status: number | undefined): Error {
  if (status === 429) {
    return new ProviderRateLimitError();
  }
  if (status !== undefined && status >= 500 && status < 600) {
    return new ProviderResponseError(
      "The analysis provider is temporarily unavailable.",
      true,
    );
  }
  if (
    error instanceof Error &&
    (error.name === "APIConnectionTimeoutError" ||
      error.name === "AbortError" ||
      error.message.toLowerCase().includes("timed out"))
  ) {
    return new ProviderTimeoutError();
  }
  if (error instanceof Error && error.name === "APIConnectionError") {
    return new ProviderResponseError(
      "The analysis provider is temporarily unavailable.",
      true,
    );
  }
  return new ProviderResponseError("The analysis provider request failed.");
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
