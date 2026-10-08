import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractSignals,
  ProviderRateLimitError,
  ProviderResponseError,
  type GroqClientLike,
} from "@/lib/groq";
import { groundExtractionEvidence } from "@/lib/evidence-grounding";
import type { ExtractionResult } from "@/types/analysis";

const input = {
  text: "You can earn easy money. Pay a deposit to unlock more tasks.",
  image: null,
  url: "",
  platform: "WhatsApp",
  context: "Unexpected message",
};

const validExtraction: ExtractionResult = {
  summary: "Unexpected task offer followed by a deposit request.",
  claimedIdentity: "recruiter",
  requestedActions: ["Pay a deposit"],
  requestedInformation: [],
  moneyRequest: true,
  credentialRequest: false,
  attachmentReference: null,
  extractedUrls: [],
  presentSignals: [
    {
      id: "request_deposit_or_fee",
      evidence: "Pay a deposit",
      source: "text",
      explanation: "The message asks for an upfront deposit.",
    },
  ],
  contradictingSignals: [],
  uncertainties: [],
};

function fakeClient(
  create: ReturnType<typeof vi.fn>,
): GroqClientLike {
  return {
    chat: {
      completions: {
        create: create as GroqClientLike["chat"]["completions"]["create"],
      },
    },
  };
}

afterEach(() => {
  delete process.env.GROQ_MODEL;
});

describe("extractSignals", () => {
  it("uses the default model and strict JSON Schema request", async () => {
    const create = vi.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(validExtraction) } }],
    });

    await extractSignals(input, { client: fakeClient(create) });

    expect(create).toHaveBeenCalledOnce();
    const request = create.mock.calls[0][0];
    expect(request.model).toBe("qwen/qwen3.8-27b");
    expect(request.reasoning_effort).toBe("none");
    expect(request.temperature).toBe(0);
    expect(request.seed).toBe(42);
    expect(request.response_format).toMatchObject({
      type: "json_schema",
      json_schema: {
        name: "scam_signal_extraction",
        strict: true,
        schema: expect.any(Object),
      },
    });
    expect(request.messages[0].content).toContain("request_deposit_or_fee");
    expect(request.messages[0].content).toContain(
      "Do not classify the final scam type",
    );
  });

  it("requires exact source evidence and complete controlled-signal evaluation", async () => {
    const create = vi.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(validExtraction) } }],
    });

    await extractSignals(input, { client: fakeClient(create) });

    const instruction = create.mock.calls[0][0].messages[0].content;
    expect(instruction).toContain(
      'For source "text", evidence must be an exact verbatim substring from the submitted Text field, and source must be "text".',
    );
    expect(instruction).toContain(
      'For source "context", evidence must be an exact verbatim substring from the submitted Context field, and source must be "context".',
    );
    expect(instruction).toContain(
      'For source "url", evidence must be an exact substring from the submitted URL field, and source must be "url".',
    );
    expect(instruction).toContain(
      'For source "image", evidence may be a short transcription or description of visible image content.',
    );
    expect(instruction).toContain(
      "Evaluate every controlled signal ID independently.",
    );
    expect(instruction).toContain(
      "Include every signal that is directly supported by the submitted content.",
    );
    expect(instruction).toContain(
      "Do not omit a supported signal merely because a similar signal is also present.",
    );
    expect(instruction).toContain("Do not infer unsupported signals.");
  });

  it("uses the configured model without substituting another", async () => {
    process.env.GROQ_MODEL = "configured/model";
    const create = vi.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(validExtraction) } }],
    });

    await extractSignals(input, { client: fakeClient(create) });

    expect(create.mock.calls[0][0].model).toBe("configured/model");
  });

  it("parses and locally validates a successful extraction", async () => {
    const create = vi.fn().mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(validExtraction) } }],
    });

    await expect(
      extractSignals(input, { client: fakeClient(create) }),
    ).resolves.toEqual(validExtraction);
  });

  it.each([
    ["malformed JSON", "{"],
    [
      "schema-invalid JSON",
      JSON.stringify({ ...validExtraction, presentSignals: [{ id: "invented" }] }),
    ],
  ])("rejects %s without retrying", async (_name, content) => {
    const create = vi.fn().mockResolvedValue({
      choices: [{ message: { content } }],
    });

    await expect(
      extractSignals(input, { client: fakeClient(create) }),
    ).rejects.toBeInstanceOf(ProviderResponseError);
    expect(create).toHaveBeenCalledOnce();
  });

  it("maps HTTP 429 immediately to a rate-limit error without retrying", async () => {
    const create = vi.fn().mockRejectedValue({ status: 429 });
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      extractSignals(input, { client: fakeClient(create), sleep }),
    ).rejects.toBeInstanceOf(ProviderRateLimitError);
    expect(create).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();
  });

  it("retries exactly once after a provider 5xx", async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce({ status: 503 })
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(validExtraction) } }],
      });

    const sleep = vi.fn().mockResolvedValue(undefined);

    await extractSignals(input, {
      client: fakeClient(create),
      sleep,
    });

    expect(create).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledOnce();
    expect(sleep).toHaveBeenCalledWith(500);
  });

  it("does not retry invalid structured output", async () => {
    const create = vi.fn().mockResolvedValue({
      choices: [{ message: { content: "not JSON" } }],
    });

    await expect(
      extractSignals(input, {
        client: fakeClient(create),
        sleep: vi.fn().mockResolvedValue(undefined),
      }),
    ).rejects.toBeInstanceOf(ProviderResponseError);
    expect(create).toHaveBeenCalledOnce();
  });

  it("maps an SDK connection failure to transient unavailability without retrying", async () => {
    const connectionError = new Error("Connection failed");
    connectionError.name = "APIConnectionError";
    const create = vi.fn().mockRejectedValue(connectionError);

    const caught = await extractSignals(input, {
      client: fakeClient(create),
      sleep: vi.fn().mockResolvedValue(undefined),
    }).catch((error: unknown) => error);

    expect(caught).toBeInstanceOf(ProviderResponseError);
    expect((caught as ProviderResponseError).transient).toBe(true);
    expect(create).toHaveBeenCalledOnce();
  });
});

describe("groundExtractionEvidence", () => {
  it("keeps text and context evidence found after conservative normalization", () => {
    const extraction = {
      ...validExtraction,
      presentSignals: [
        validExtraction.presentSignals[0],
        {
          id: "unexpected_contact",
          evidence: "unexpected message",
          source: "context" as const,
          explanation: "The user described the contact as unexpected.",
        },
      ],
    };

    expect(groundExtractionEvidence(extraction, input).presentSignals).toEqual(
      extraction.presentSignals,
    );
  });

  it("drops unsupported evidence and records a generic uncertainty", () => {
    const extraction = {
      ...validExtraction,
      presentSignals: [
        {
          ...validExtraction.presentSignals[0],
          evidence: "an invented payment instruction",
        },
      ],
    };

    const grounded = groundExtractionEvidence(extraction, input);

    expect(grounded.presentSignals).toEqual([]);
    expect(grounded.uncertainties).toContain(
      "Some extracted signals were omitted because their evidence could not be verified in the submitted content.",
    );
  });

  it("keeps URL evidence only when it appears in the submitted URL", () => {
    const urlInput = { ...input, url: "https://example.test/offer?id=7" };
    const extraction = {
      ...validExtraction,
      presentSignals: [
        {
          id: "suspicious_link_present",
          evidence: "https://example.test/offer?id=7",
          source: "url" as const,
          explanation: "The submitted URL can be inspected deterministically.",
        },
      ],
    };

    expect(
      groundExtractionEvidence(extraction, urlInput).presentSignals,
    ).toHaveLength(1);
  });
});
