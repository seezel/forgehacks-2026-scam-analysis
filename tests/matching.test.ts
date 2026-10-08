import { describe, expect, it } from "vitest";
import { decideStatus, rankScamTypes } from "@/lib/matching";
import { loadScamTypes } from "@/lib/scam-data";
import type { SignalObservation } from "@/types/analysis";
import type { ScamTypeProfile } from "@/types/scam-data";

function signals(ids: string[]): SignalObservation[] {
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
