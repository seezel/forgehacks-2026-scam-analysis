import { describe, expect, it } from "vitest";
import { buildAnalysisResult } from "@/lib/result-builder";
import { rankRelatedExamples } from "@/lib/example-comparison";
import { rankScamTypes } from "@/lib/matching";
import {
  loadExamples,
  loadSafeActions,
  loadScamTypes,
} from "@/lib/scam-data";
import { selectAllowedActions } from "@/lib/action-policy";
import type {
  AnalysisStatus,
  ExtractionResult,
  RelatedExampleResult,
  UrlObservation,
} from "@/types/analysis";

function extraction(signalIds: string[]): ExtractionResult {
  return {
    summary: "An unexpected task offer asks for money.",
    claimedIdentity: "recruiter",
    requestedActions: ["pay a deposit"],
    requestedInformation: [],
    moneyRequest: true,
    credentialRequest: false,
    attachmentReference: null,
    extractedUrls: [],
    presentSignals: signalIds.map((id) => ({
      id,
      evidence: `Exact evidence for ${id}`,
      source: "text",
      explanation: `${id} was observed.`,
    })),
    contradictingSignals: [],
    uncertainties: ["The sender's real identity is unknown."],
  };
}

function buildFixture(
  status: AnalysisStatus,
  signalIds: string[],
  relatedExamples: RelatedExampleResult[] = [],
) {
  const profiles = loadScamTypes();
  const extracted = extraction(signalIds);
  const ranking = rankScamTypes({
    profiles,
    presentSignals: extracted.presentSignals,
    contradictingSignals: extracted.contradictingSignals,
  });
  const selectedActions = selectAllowedActions(
    extracted.presentSignals,
    status === "insufficient_evidence" ? null : ranking[0].scamTypeId,
    loadSafeActions(),
  );
  const urlObservations: UrlObservation[] = [
    {
      id: "raw_ip_hostname",
      evidence: "https://192.0.2.10/login",
      explanation: "The hostname is a raw IP address.",
    },
  ];

  return buildAnalysisResult({
    status,
    ranking,
    profiles,
    extraction: extracted,
    selectedActions,
    relatedExamples,
    urlObservations,
    technicalWarnings: ["Image analysis was not requested."],
  });
}

describe("buildAnalysisResult", () => {
  it("does not expose a likely scam type for insufficient evidence", () => {
    const result = buildFixture("insufficient_evidence", [
      "unexpected_contact",
    ]);

    expect(result.status).toBe("insufficient_evidence");
    expect(result.likelyScamType).toBeNull();
    expect(result.relatedExamples).toEqual([]);
    expect(result.differences).toEqual([]);
  });

  it("exposes the selected type for a strong or possible result", () => {
    const result = buildFixture("possible_match", [
      "unexpected_contact",
      "reward_or_easy_money",
      "request_deposit_or_fee",
    ]);

    expect(result.likelyScamType).toEqual({
      id: "job_task",
      name: "Job / task scam",
    });
  });

  it("orders traceable evidence by profile weight and caps it at five", () => {
    const result = buildFixture("strong_match", [
      "unexpected_contact",
      "request_money_or_transfer",
      "request_deposit_or_fee",
      "reward_or_easy_money",
      "small_initial_payout",
      "request_credentials",
    ]);

    expect(result.strongestEvidence).toHaveLength(5);
    expect(result.strongestEvidence.map((item) => item.id)).toEqual([
      "request_deposit_or_fee",
      "small_initial_payout",
      "request_money_or_transfer",
      "reward_or_easy_money",
      "request_credentials",
    ]);
    expect(
      result.strongestEvidence.every((item) => item.evidence.length > 0),
    ).toBe(true);
  });

  it("uses deterministic default action text", () => {
    const result = buildFixture("possible_match", [
      "request_deposit_or_fee",
    ]);

    expect(result.immediateActions).toContainEqual({
      id: "do_not_send_money",
      text: "Do not send money, deposits, fees, gift cards, cryptocurrency, or transfers based on this request.",
    });
  });

  it("includes related examples and their deterministic differences", () => {
    const profiles = loadScamTypes();
    const extracted = extraction([
      "unexpected_contact",
      "request_deposit_or_fee",
    ]);
    extracted.claimedIdentity = "game developer";
    const related = rankRelatedExamples(
      profiles[0],
      loadExamples(),
      extracted,
    );
    const ranking = rankScamTypes({
      profiles,
      presentSignals: extracted.presentSignals,
      contradictingSignals: [],
    });
    const result = buildAnalysisResult({
      status: "possible_match",
      ranking,
      profiles,
      extraction: extracted,
      selectedActions: [],
      relatedExamples: related,
      urlObservations: [],
      technicalWarnings: [],
    });

    expect(result.relatedExamples[0].exampleId).toBe("ftc-task-scam-2025");
    expect(result.differences).toContain(
      'Claimed identity differs: documented example uses "recruiter or work opportunity"; submitted content claims "game developer".',
    );
  });

  it("preserves uncertainties, URL observations, and technical warnings", () => {
    const result = buildFixture("possible_match", [
      "unexpected_contact",
      "request_deposit_or_fee",
    ]);

    expect(result.uncertainties).toEqual([
      "The sender's real identity is unknown.",
    ]);
    expect(result.urlObservations[0].id).toBe("raw_ip_hostname");
    expect(result.technicalWarnings).toEqual([
      "Image analysis was not requested.",
    ]);
  });
});
