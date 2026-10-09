import { describe, expect, it } from "vitest";
import { decideStatus, rankScamTypes } from "@/lib/matching";
import { loadScamTypes } from "@/lib/scam-data";
import type { SignalObservation } from "@/types/analysis";
import type { ScamTypeProfile } from "@/types/scam-data";

function signals(ids: readonly string[]): SignalObservation[] {
  return ids.map((id) => ({
    id,
    evidence: `Evidence for ${id}`,
    source: "text",
    explanation: `${id} was observed.`,
  }));
}

function profile(
  id: string,
  signalWeights: ScamTypeProfile["signalWeights"],
  contradictionPenalties: Record<string, number> = {},
): ScamTypeProfile {
  return {
    id,
    name: id,
    shortDescription: id,
    recurringStructure: id,
    signalWeights,
    contradictionPenalties,
    safeActionIds: [],
  };
}

describe("rankScamTypes", () => {
  it("normalizes matched weight by total positive profile weight", () => {
    const ranking = rankScamTypes({
      profiles: [
        profile("job_task", {
          request_deposit_or_fee: 4,
          reward_or_easy_money: 3,
          unexpected_contact: 2,
          career_opportunity_pressure: 1,
        }),
      ],
      presentSignals: signals([
        "request_deposit_or_fee",
        "reward_or_easy_money",
      ]),
      contradictingSignals: [],
    });

    expect(ranking[0].normalizedScore).toBe(0.7);
    expect(ranking[0].matchedSignalIds).toEqual([
      "request_deposit_or_fee",
      "reward_or_easy_money",
    ]);
  });

  it("does not treat missing signals as contradictions", () => {
    const ranking = rankScamTypes({
      profiles: [
        profile("job_task", {
          request_deposit_or_fee: 4,
          reward_or_easy_money: 3,
          unexpected_contact: 2,
          career_opportunity_pressure: 1,
        }),
      ],
      presentSignals: signals(["request_deposit_or_fee"]),
      contradictingSignals: [],
    });

    expect(ranking[0].normalizedScore).toBe(0.4);
    expect(ranking[0].contradictionIds).toEqual([]);
  });

  it("subtracts configured contradiction penalties", () => {
    const ranking = rankScamTypes({
      profiles: [
        profile(
          "job_task",
          { request_deposit_or_fee: 4, reward_or_easy_money: 4 },
          { claimed_friend_or_known_contact: 3 },
        ),
      ],
      presentSignals: signals([
        "request_deposit_or_fee",
        "reward_or_easy_money",
      ]),
      contradictingSignals: signals(["claimed_friend_or_known_contact"]),
    });

    expect(ranking[0].normalizedScore).toBe(0.625);
    expect(ranking[0].contradictionIds).toEqual([
      "claimed_friend_or_known_contact",
    ]);
  });

  it("clamps a penalized normalized score at zero", () => {
    const ranking = rankScamTypes({
      profiles: [
        profile(
          "job_task",
          { unexpected_contact: 2 },
          { claimed_friend_or_known_contact: 5 },
        ),
      ],
      presentSignals: [],
      contradictingSignals: signals(["claimed_friend_or_known_contact"]),
    });

    expect(ranking[0].normalizedScore).toBe(0);
  });
});

describe("approved corpus rankings", () => {
  it.each([
    [
      "compromised_friend",
      [
        "claimed_friend_or_known_contact",
        "urgency_pressure",
        "fear_or_threat",
        "request_money_or_transfer",
        "unexpected_contact",
      ],
    ],
    [
      "job_task",
      [
        "unexpected_contact",
        "claimed_recruiter_or_employer",
        "reward_or_easy_money",
        "small_initial_payout",
        "request_deposit_or_fee",
        "request_money_or_transfer",
      ],
    ],
    [
      "relationship_investment",
      [
        "relationship_or_romance_trust",
        "investment_or_profit_claim",
        "reward_or_easy_money",
        "request_money_or_transfer",
        "request_move_to_other_platform",
      ],
    ],
    [
      "institution_impersonation",
      [
        "claimed_authority_or_institution",
        "authority_pressure",
        "fear_or_threat",
        "request_credentials",
        "login_or_credential_capture_link",
      ],
    ],
    [
      "marketplace",
      [
        "claimed_seller_or_buyer",
        "off_platform_payment_request",
        "request_money_or_transfer",
        "urgency_pressure",
        "suspicious_link_present",
      ],
    ],
    [
      "tech_support",
      [
        "claimed_tech_support",
        "device_infection_claim",
        "fear_or_threat",
        "request_remote_access",
        "urgency_pressure",
      ],
    ],
    [
      "professional_targeted",
      [
        "professional_workflow_or_invoice_request",
        "request_money_or_transfer",
        "authority_pressure",
        "request_credentials",
      ],
    ],
    [
      "malicious_attachment",
      [
        "ordinary_looking_attachment_used_as_lure",
        "request_download_or_install",
        "professional_workflow_or_invoice_request",
        "urgency_pressure",
      ],
    ],
  ] as const)("ranks %s first for representative evidence", (expectedTypeId, signalIds) => {
    const ranking = rankScamTypes({
      profiles: loadScamTypes(),
      presentSignals: signals(signalIds),
      contradictingSignals: [],
    });

    expect(ranking[0].scamTypeId).toBe(expectedTypeId);
  });

  it("favors job_task for classic task-scam evidence", () => {
    const ranking = rankScamTypes({
      profiles: loadScamTypes(),
      presentSignals: signals([
        "reward_or_easy_money",
        "small_initial_payout",
        "request_deposit_or_fee",
        "claimed_recruiter_or_employer",
        "unexpected_contact",
      ]),
      contradictingSignals: [],
    });

    expect(ranking[0].scamTypeId).toBe("job_task");
    expect(ranking.findIndex((item) => item.scamTypeId === "job_task")).toBeLessThan(
      ranking.findIndex((item) => item.scamTypeId === "professional_targeted"),
    );
  });

  it("favors professional_targeted for invoice and payment workflow evidence", () => {
    const ranking = rankScamTypes({
      profiles: loadScamTypes(),
      presentSignals: signals([
        "professional_workflow_or_invoice_request",
        "request_money_or_transfer",
        "authority_pressure",
        "request_credentials",
      ]),
      contradictingSignals: [],
    });

    expect(ranking[0].scamTypeId).toBe("professional_targeted");
    expect(ranking.findIndex((item) => item.scamTypeId === "professional_targeted")).toBeLessThan(
      ranking.findIndex((item) => item.scamTypeId === "job_task"),
    );
  });

  it("favors tech_support over institution_impersonation for remote-access evidence", () => {
    const ranking = rankScamTypes({
      profiles: loadScamTypes(),
      presentSignals: signals([
        "claimed_tech_support",
        "device_infection_claim",
        "request_remote_access",
        "fear_or_threat",
      ]),
      contradictingSignals: [],
    });

    expect(ranking[0].scamTypeId).toBe("tech_support");
    expect(ranking.findIndex((item) => item.scamTypeId === "tech_support")).toBeLessThan(
      ranking.findIndex(
        (item) => item.scamTypeId === "institution_impersonation",
      ),
    );
  });

  it("favors malicious_attachment when attachment-specific evidence is strongest", () => {
    const ranking = rankScamTypes({
      profiles: loadScamTypes(),
      presentSignals: signals([
        "ordinary_looking_attachment_used_as_lure",
        "request_download_or_install",
        "professional_workflow_or_invoice_request",
      ]),
      contradictingSignals: [],
    });

    expect(ranking[0].scamTypeId).toBe("malicious_attachment");
    expect(ranking.findIndex((item) => item.scamTypeId === "malicious_attachment")).toBeLessThan(
      ranking.findIndex((item) => item.scamTypeId === "professional_targeted"),
    );
  });
});

describe("decideStatus", () => {
  it("returns a strong match for a high-scoring job/task case with core evidence", () => {
    const ranking = rankScamTypes({
      profiles: loadScamTypes(),
      presentSignals: signals([
        "unexpected_contact",
        "claimed_recruiter_or_employer",
        "reward_or_easy_money",
        "small_initial_payout",
        "request_deposit_or_fee",
        "request_money_or_transfer",
        "request_credentials",
      ]),
      contradictingSignals: [],
    });

    expect(ranking[0].normalizedScore).toBe(0.84);
    expect(decideStatus(ranking)).toBe("strong_match");
  });

  it("returns a possible match at the possible threshold", () => {
    const ranking = rankScamTypes({
      profiles: loadScamTypes(),
      presentSignals: signals([
        "unexpected_contact",
        "career_opportunity_pressure",
        "reward_or_easy_money",
        "request_money_or_transfer",
      ]),
      contradictingSignals: [],
    });

    expect(ranking[0].normalizedScore).toBe(0.4);
    expect(decideStatus(ranking)).toBe("possible_match");
  });

  it("abstains when only weak context is present", () => {
    const ranking = rankScamTypes({
      profiles: loadScamTypes(),
      presentSignals: signals(["unexpected_contact"]),
      contradictingSignals: [],
    });

    expect(decideStatus(ranking)).toBe("insufficient_evidence");
  });

  it("abstains when a lone weight-4 signal has no supporting evidence", () => {
    const ranking = rankScamTypes({
      profiles: [
        profile("job_task", {
          request_deposit_or_fee: 4,
          reward_or_easy_money: 3,
          unexpected_contact: 3,
        }),
      ],
      presentSignals: signals(["request_deposit_or_fee"]),
      contradictingSignals: [],
    });

    expect(ranking[0].normalizedScore).toBe(0.4);
    expect(decideStatus(ranking)).toBe("insufficient_evidence");
  });

  it("requires core evidence or two strong signals for a strong match", () => {
    const ranking = rankScamTypes({
      profiles: [
        profile("context_only", {
          unexpected_contact: 2,
          claimed_recruiter_or_employer: 2,
          career_opportunity_pressure: 2,
          request_move_to_other_platform: 2,
        }),
      ],
      presentSignals: signals([
        "unexpected_contact",
        "claimed_recruiter_or_employer",
        "career_opportunity_pressure",
      ]),
      contradictingSignals: [],
    });

    expect(ranking[0].normalizedScore).toBe(0.75);
    expect(decideStatus(ranking)).toBe("possible_match");
  });

  it("does not return strong when a second candidate is within the lead margin", () => {
    const ranking = rankScamTypes({
      profiles: [
        profile("first", {
          request_deposit_or_fee: 4,
          reward_or_easy_money: 3,
          unexpected_contact: 1,
          career_opportunity_pressure: 2,
        }),
        profile("second", {
          request_deposit_or_fee: 4,
          reward_or_easy_money: 3,
          unexpected_contact: 1,
          request_money_or_transfer: 3,
        }),
      ],
      presentSignals: signals([
        "request_deposit_or_fee",
        "reward_or_easy_money",
        "unexpected_contact",
      ]),
      contradictingSignals: [],
    });

    expect(ranking[0].normalizedScore - ranking[1].normalizedScore).toBeLessThan(
      0.1,
    );
    expect(decideStatus(ranking)).toBe("possible_match");
  });

  it("accepts a mathematically exact 0.10 lead despite floating-point rounding", () => {
    const ranking = rankScamTypes({
      profiles: [
        profile("first", {
          request_deposit_or_fee: 4,
          reward_or_easy_money: 3,
          unexpected_contact: 3,
        }),
        profile("second", {
          request_deposit_or_fee: 3,
          reward_or_easy_money: 3,
          unexpected_contact: 4,
        }),
      ],
      presentSignals: signals([
        "request_deposit_or_fee",
        "reward_or_easy_money",
      ]),
      contradictingSignals: [],
    });

    expect(ranking[0].normalizedScore).toBe(0.7);
    expect(ranking[1].normalizedScore).toBe(0.6);
    expect(decideStatus(ranking)).toBe("strong_match");
  });

  it("does not return strong when a configured contradiction is present", () => {
    const ranking = rankScamTypes({
      profiles: [
        profile(
          "job_task",
          { request_deposit_or_fee: 4, reward_or_easy_money: 3 },
          { claimed_friend_or_known_contact: 1 },
        ),
      ],
      presentSignals: signals([
        "request_deposit_or_fee",
        "reward_or_easy_money",
      ]),
      contradictingSignals: signals(["claimed_friend_or_known_contact"]),
    });

    expect(decideStatus(ranking)).toBe("possible_match");
  });
});
