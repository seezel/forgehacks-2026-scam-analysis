import { describe, expect, it } from "vitest";
import { rankRelatedExamples } from "@/lib/example-comparison";
import { loadExamples, loadScamTypes } from "@/lib/scam-data";
import type { ExtractionResult } from "@/types/analysis";
import type { DocumentedExample } from "@/types/scam-data";

function extraction(
  signalIds: string[],
  overrides: Partial<ExtractionResult> = {},
): ExtractionResult {
  return {
    summary: "Submitted task offer",
    claimedIdentity: null,
    requestedActions: [],
    requestedInformation: [],
    moneyRequest: false,
    credentialRequest: false,
    attachmentReference: null,
    extractedUrls: [],
    presentSignals: signalIds.map((id) => ({
      id,
      evidence: `Evidence for ${id}`,
      source: "text",
      explanation: `${id} was observed.`,
    })),
    contradictingSignals: [],
    uncertainties: [],
    ...overrides,
  };
}

function example(
  id: string,
  scamTypeId: string,
  signalIds: string[],
): DocumentedExample {
  return {
    id,
    scamTypeId,
    title: id,
    shortParaphrase: `${id} paraphrase`,
    platform: "messaging",
    claimedIdentity: "recruiter",
    requestedActions: ["pay a deposit"],
    signalIds,
    source: {
      organizationOrPublisher: "Example publisher",
      title: `${id} source`,
      url: `https://example.com/${id}`,
      publishedDate: null,
    },
    notes: "Test example",
  };
}

describe("rankRelatedExamples", () => {
  it("calculates weighted overlap for the approved FTC example", () => {
    const profile = loadScamTypes()[0];
    const related = rankRelatedExamples(
      profile,
      loadExamples(),
      extraction(["unexpected_contact", "request_deposit_or_fee"]),
    );

    expect(related).toHaveLength(1);
    expect(related[0]).toMatchObject({
      exampleId: "ftc-task-scam-2025",
      sharedSignalIds: ["unexpected_contact", "request_deposit_or_fee"],
      overlapScore: 0.375,
      sourceLabel: "U.S. Federal Trade Commission",
    });
  });

  it("considers only examples from the selected scam type", () => {
    const profile = loadScamTypes()[0];
    const wrongType = example(
      "wrong-type",
      "institution_impersonation",
      ["request_deposit_or_fee"],
    );

    expect(
      rankRelatedExamples(
        profile,
        [...loadExamples(), wrongType],
        extraction(["request_deposit_or_fee"]),
      ).map((item) => item.exampleId),
    ).not.toContain("wrong-type");
  });

  it("sorts by weighted overlap and returns at most three examples", () => {
    const profile = loadScamTypes()[0];
    const examples = [
      example("low", "job_task", ["unexpected_contact"]),
      example("highest", "job_task", ["request_deposit_or_fee"]),
      example("medium", "job_task", [
        "unexpected_contact",
        "request_deposit_or_fee",
      ]),
      example("fourth", "job_task", ["reward_or_easy_money"]),
    ];

    const related = rankRelatedExamples(
      profile,
      examples,
      extraction(["request_deposit_or_fee"]),
    );

    expect(related).toHaveLength(3);
    expect(related[0].exampleId).toBe("highest");
    expect(related[0].overlapScore).toBe(1);
  });

  it("describes only known claimed-identity and requested-action differences", () => {
    const profile = loadScamTypes()[0];
    const related = rankRelatedExamples(
      profile,
      loadExamples(),
      extraction(["request_deposit_or_fee"], {
        claimedIdentity: "game developer",
        requestedActions: ["install a test build"],
      }),
    );

    expect(related[0].differences).toEqual([
      'Claimed identity differs: documented example uses "recruiter or work opportunity"; submitted content claims "game developer".',
      'Requested actions differ: documented example includes "perform simple online tasks; deposit personal funds"; submitted content includes "install a test build".',
    ]);
  });

  it("does not invent differences for unknown submitted fields", () => {
    const profile = loadScamTypes()[0];
    const related = rankRelatedExamples(
      profile,
      loadExamples(),
      extraction(["request_deposit_or_fee"]),
    );

    expect(related[0].differences).toEqual([]);
  });

  it("does not let duplicate submitted actions hide a known difference", () => {
    const profile = loadScamTypes()[0];
    const related = rankRelatedExamples(
      profile,
      loadExamples(),
      extraction(["request_deposit_or_fee"], {
        requestedActions: [
          "perform simple online tasks",
          "perform simple online tasks",
        ],
      }),
    );

    expect(related[0].differences).toContain(
      'Requested actions differ: documented example includes "perform simple online tasks; deposit personal funds"; submitted content includes "perform simple online tasks; perform simple online tasks".',
    );
  });
});
