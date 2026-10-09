import { describe, expect, it } from "vitest";
import {
  calculateMetrics,
  classifyWithRules,
  evaluateRulesCases,
  isExpectedDecision,
  type EvaluatedCase,
  type EvaluationCase,
} from "@/evaluation/evaluator";

const jobScam: EvaluationCase = {
  id: "job-scam",
  group: "scam",
  text: "Easy rating tasks pay commission, then require a deposit.",
  expectedScamTypeId: "job_task",
};

const benign: EvaluationCase = {
  id: "benign",
  group: "benign",
  text: "Are we still meeting for dinner at 5 PM?",
};

describe("deterministic evaluation logic", () => {
  it("passes a scam case only for a correct non-abstaining prediction", () => {
    expect(
      isExpectedDecision(jobScam, {
        scamTypeId: "job_task",
        abstain: false,
      }),
    ).toBe(true);
    expect(
      isExpectedDecision(jobScam, {
        scamTypeId: "professional_targeted",
        abstain: false,
      }),
    ).toBe(false);
    expect(
      isExpectedDecision(jobScam, {
        scamTypeId: null,
        abstain: true,
      }),
    ).toBe(false);
  });

  it("passes benign and ambiguous cases only when the system abstains", () => {
    const ambiguous: EvaluationCase = {
      id: "ambiguous",
      group: "ambiguous",
      text: "Please review the invoice when you have time.",
    };

    expect(
      isExpectedDecision(benign, { scamTypeId: null, abstain: true }),
    ).toBe(true);
    expect(
      isExpectedDecision(ambiguous, { scamTypeId: null, abstain: true }),
    ).toBe(true);
    expect(
      isExpectedDecision(ambiguous, {
        scamTypeId: "professional_targeted",
        abstain: false,
      }),
    ).toBe(false);
    expect(
      isExpectedDecision(benign, {
        scamTypeId: null,
        abstain: true,
        failure: "provider failure",
      }),
    ).toBe(false);
  });

  it("calculates the requested count metrics", () => {
    const records: EvaluatedCase[] = [
      {
        case: jobScam,
        prediction: { scamTypeId: "job_task", abstain: false },
        pass: true,
      },
      {
        case: {
          ...jobScam,
          id: "missed-scam",
          expectedScamTypeId: "marketplace",
        },
        prediction: { scamTypeId: null, abstain: true },
        pass: false,
      },
      {
        case: benign,
        prediction: { scamTypeId: null, abstain: true },
        pass: true,
      },
      {
        case: {
          id: "failed-ambiguous",
          group: "ambiguous",
          text: "Account issue.",
        },
        prediction: {
          scamTypeId: null,
          abstain: true,
          failure: "provider failure",
        },
        pass: true,
      },
    ];

    expect(calculateMetrics(records)).toEqual({
      exactScamTypeCorrect: 1,
      scamNonAbstention: 1,
      nonScamAbstention: 2,
      overallCorrect: 3,
      providerFailures: 1,
    });
  });

  it("classifies an obvious tech-support case with fixed rules", () => {
    expect(
      classifyWithRules({
        text: "Tech support says the device is infected and asks me to install AnyDesk for remote access.",
      }),
    ).toEqual({
      scamTypeId: "tech_support",
      abstain: false,
    });
    expect(classifyWithRules(benign)).toEqual({
      scamTypeId: null,
      abstain: true,
    });
  });

  it("does not use an expected label to make rules predictions", () => {
    const text =
      "Tech support says the device is infected and requests remote access.";
    const records = evaluateRulesCases([
      {
        id: "correct-label",
        group: "scam",
        text,
        expectedScamTypeId: "tech_support",
      },
      {
        id: "wrong-label",
        group: "scam",
        text,
        expectedScamTypeId: "job_task",
      },
    ]);

    expect(records.map((record) => record.prediction.scamTypeId)).toEqual([
      "tech_support",
      "tech_support",
    ]);
    expect(records.map((record) => record.pass)).toEqual([true, false]);
  });
});
