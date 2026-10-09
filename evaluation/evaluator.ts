export type EvaluationGroup = "scam" | "benign" | "ambiguous";

export type EvaluationCase = {
  id: string;
  group: EvaluationGroup;
  text: string;
  platform?: string;
  context?: string;
  expectedScamTypeId?: string;
  expectedBehavior?: "non-abstain_correct_type" | "abstain";
};

export type EvaluationPrediction = {
  scamTypeId: string | null;
  abstain: boolean;
  failure?: string;
};

export type EvaluatedCase = {
  case: EvaluationCase;
  prediction: EvaluationPrediction;
  pass: boolean;
};

export type EvaluationMetrics = {
  exactScamTypeCorrect: number;
  scamNonAbstention: number;
  nonScamAbstention: number;
  overallCorrect: number;
  providerFailures: number;
};

const RULE_KEYWORDS: Array<{
  scamTypeId: string;
  keywords: string[];
}> = [
  {
    scamTypeId: "compromised_friend",
    keywords: [
      "friend",
      "family",
      "cousin",
      "new number",
      "emergency",
      "stranded",
      "lost access",
      "hacked",
    ],
  },
  {
    scamTypeId: "job_task",
    keywords: [
      "job",
      "task",
      "rating",
      "commission",
      "top up",
      "deposit",
      "easy earnings",
    ],
  },
  {
    scamTypeId: "relationship_investment",
    keywords: [
      "romance",
      "romantic",
      "love",
      "dating",
      "invest",
      "crypto",
      "profit",
      "returns",
    ],
  },
  {
    scamTypeId: "institution_impersonation",
    keywords: [
      "bank",
      "government",
      "security department",
      "account frozen",
      "otp",
      "password",
      "login",
    ],
  },
  {
    scamTypeId: "marketplace",
    keywords: [
      "buyer",
      "seller",
      "marketplace",
      "off-platform",
      "payment release",
      "courier",
      "otp",
    ],
  },
  {
    scamTypeId: "tech_support",
    keywords: [
      "virus",
      "infected",
      "tech support",
      "technical support",
      "remote access",
      "anydesk",
      "install",
    ],
  },
  {
    scamTypeId: "professional_targeted",
    keywords: [
      "invoice",
      "cfo",
      "ceo",
      "vendor",
      "business payment",
      "recruiter",
      "repository",
    ],
  },
  {
    scamTypeId: "malicious_attachment",
    keywords: [
      "attachment",
      "document",
      "pdf",
      "file",
      "download",
      "install",
      "viewer",
    ],
  },
];

const MIN_RULE_MATCHES = 3;

export function isExpectedDecision(
  evaluationCase: EvaluationCase,
  prediction: EvaluationPrediction,
): boolean {
  if (prediction.failure) {
    return false;
  }

  if (evaluationCase.group === "scam") {
    return (
      !prediction.abstain &&
      prediction.scamTypeId === evaluationCase.expectedScamTypeId
    );
  }

  return prediction.abstain;
}

export function calculateMetrics(
  records: EvaluatedCase[],
): EvaluationMetrics {
  return {
    exactScamTypeCorrect: records.filter(
      ({ case: evaluationCase, prediction }) =>
        evaluationCase.group === "scam" &&
        !prediction.abstain &&
        prediction.scamTypeId === evaluationCase.expectedScamTypeId,
    ).length,
    scamNonAbstention: records.filter(
      ({ case: evaluationCase, prediction }) =>
        evaluationCase.group === "scam" && !prediction.abstain,
    ).length,
    nonScamAbstention: records.filter(
      ({ case: evaluationCase, prediction }) =>
        evaluationCase.group !== "scam" && prediction.abstain,
    ).length,
    overallCorrect: records.filter(({ pass }) => pass).length,
    providerFailures: records.filter(({ prediction }) =>
      Boolean(prediction.failure),
    ).length,
  };
}

export function classifyWithRules(
  input: Pick<EvaluationCase, "text" | "platform" | "context">,
): EvaluationPrediction {
  const content = [input.text, input.platform, input.context]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("en");
  const ranked = RULE_KEYWORDS.map(({ scamTypeId, keywords }) => ({
    scamTypeId,
    score: keywords.filter((keyword) => content.includes(keyword)).length,
  })).sort(
    (left, right) =>
      right.score - left.score ||
      left.scamTypeId.localeCompare(right.scamTypeId),
  );
  const top = ranked[0];

  if (!top || top.score < MIN_RULE_MATCHES) {
    return { scamTypeId: null, abstain: true };
  }

  return { scamTypeId: top.scamTypeId, abstain: false };
}

export function evaluateRulesCases(
  cases: EvaluationCase[],
): EvaluatedCase[] {
  return cases.map((evaluationCase) => {
    const prediction = classifyWithRules(evaluationCase);
    return {
      case: evaluationCase,
      prediction,
      pass: isExpectedDecision(evaluationCase, prediction),
    };
  });
}
