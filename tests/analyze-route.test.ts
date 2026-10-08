import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExtractionResult, SignalObservation } from "@/types/analysis";

const { extractSignalsMock } = vi.hoisted(() => ({
  extractSignalsMock: vi.fn(),
}));

vi.mock("@/lib/groq", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/groq")>();
  return { ...actual, extractSignals: extractSignalsMock };
});

import { POST } from "@/app/api/analyze/route";
import {
  ProviderRateLimitError,
  ProviderResponseError,
  ProviderTimeoutError,
} from "@/lib/groq";

const emptyExtraction: ExtractionResult = {
  summary: "No supported warning signals found.",
  claimedIdentity: null,
  requestedActions: [],
  requestedInformation: [],
  moneyRequest: false,
  credentialRequest: false,
  attachmentReference: null,
  extractedUrls: [],
  presentSignals: [],
  contradictingSignals: [],
  uncertainties: [],
};

function signal(id: string, evidence: string): SignalObservation {
  return {
    id,
    evidence,
    source: "text",
    explanation: "The submitted text contains this warning sign.",
  };
}

function request(fields: Record<string, string> = {}): Request {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    body: formData,
  });
}

beforeEach(() => {
  extractSignalsMock.mockReset();
});

describe("POST /api/analyze", () => {
  it("returns a strong, deterministic task-scam result", async () => {
    const evidence = "earn easy money";
    extractSignalsMock.mockResolvedValue({
      ...emptyExtraction,
      summary: "A task offer asks for money after promising earnings.",
      claimedIdentity: "recruiter",
      requestedActions: ["pay a deposit"],
      moneyRequest: true,
      presentSignals: [
        "unexpected_contact",
        "claimed_recruiter_or_employer",
        "reward_or_easy_money",
        "small_initial_payout",
        "request_deposit_or_fee",
        "request_money_or_transfer",
        "request_credentials",
      ].map((id) => signal(id, evidence)),
    });

    const response = await POST(request({ text: `You can ${evidence} today.` }));
    const body = await response.json();
    const result = body.result;

    expect(response.status).toBe(200);
    expect(result.status).toBe("strong_match");
    expect(result.likelyScamType).toEqual({
      id: "job_task",
      name: "Job / task scam",
    });
    expect(result.immediateActions.length).toBeGreaterThan(0);
    expect(result.relatedExamples).toHaveLength(1);
  });

  it("returns insufficient evidence without exposing a likely type or examples", async () => {
    extractSignalsMock.mockResolvedValue(emptyExtraction);

    const response = await POST(request({ text: "Hello, are we still meeting?" }));
    const body = await response.json();
    const result = body.result;

    expect(response.status).toBe(200);
    expect(result.status).toBe("insufficient_evidence");
    expect(result.likelyScamType).toBeNull();
    expect(result.relatedExamples).toEqual([]);
  });

  it("does not score unsupported model evidence", async () => {
    extractSignalsMock.mockResolvedValue({
      ...emptyExtraction,
      presentSignals: [
        signal("request_deposit_or_fee", "Send a deposit immediately"),
        signal("small_initial_payout", "We already paid you"),
      ],
    });

    const response = await POST(request({ text: "A routine project update." }));
    const body = await response.json();
    const result = body.result;

    expect(result.status).toBe("insufficient_evidence");
    expect(result.strongestEvidence).toEqual([]);
    expect(result.uncertainties).toContain(
      "Some extracted signals were omitted because their evidence could not be verified in the submitted content.",
    );
  });

  it("includes deterministic URL observations and URL-derived signals", async () => {
    extractSignalsMock.mockResolvedValue(emptyExtraction);

    const response = await POST(request({ url: "https://127.0.0.1/offer" }));
    const body = await response.json();
    const result = body.result;

    expect(response.status).toBe(200);
    expect(result.urlObservations).toEqual([
      expect.objectContaining({ id: "raw_ip_hostname" }),
    ]);
    expect(result.strongestEvidence).toEqual([
      expect.objectContaining({ id: "suspicious_link_present" }),
    ]);
  });

  it("returns invalid_input with HTTP 400 for invalid form data", async () => {
    const response = await POST(request());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "invalid_input" },
    });
    expect(extractSignalsMock).not.toHaveBeenCalled();
  });

  it("returns invalid_input with HTTP 400 for a malformed URL", async () => {
    const response = await POST(request({ url: "not a URL" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "invalid_input" },
    });
    expect(extractSignalsMock).not.toHaveBeenCalled();
  });

  it("maps malformed or schema-invalid provider output to HTTP 502", async () => {
    extractSignalsMock.mockRejectedValue(new ProviderResponseError());

    const response = await POST(request({ text: "Please review this." }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "provider_response_error" },
    });
  });

  it.each([
    ["timeout", new ProviderTimeoutError()],
    ["rate limit", new ProviderRateLimitError()],
    ["transient provider failure", new ProviderResponseError("Unavailable", true)],
  ])("maps %s to HTTP 503", async (_name, error) => {
    extractSignalsMock.mockRejectedValue(error);

    const response = await POST(request({ text: "Please review this." }));

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toMatchObject({
      error: { code: "provider_unavailable" },
    });
    expect(body.result).toBeUndefined();
  });
});
