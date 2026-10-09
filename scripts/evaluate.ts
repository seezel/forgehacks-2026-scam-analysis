import nextEnv from "@next/env";
import Groq from "groq-sdk";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { EVALUATION_CASES } from "@/evaluation/cases";
import {
  calculateMetrics,
  evaluateRulesCases,
  isExpectedDecision,
  type EvaluatedCase,
  type EvaluationCase,
  type EvaluationMetrics,
  type EvaluationPrediction,
} from "@/evaluation/evaluator";
import { groundExtractionEvidence } from "@/lib/evidence-grounding";
import {
  extractSignals,
  ProviderRateLimitError,
  type GroqClientLike,
} from "@/lib/groq";
import { decideStatus, rankScamTypes } from "@/lib/matching";
import { loadScamTypes } from "@/lib/scam-data";
import type {
  AnalysisStatus,
  AnalyzeInput,
  ExtractionResult,
} from "@/types/analysis";

nextEnv.loadEnvConfig(process.cwd());

const DEFAULT_MODEL = "qwen/qwen3.8-27b";
const LIVE_CALL_DELAY_MS = 15_000;
const RATE_LIMIT_DELAY_MS = 60_000;

type HybridCaseResult = {
  id: string;
  rawExtractionSuccess: boolean;
  rawPresentSignalCount: number;
  groundedPresentSignalCount: number;
  groundingDroppedObservations: number;
  status: AnalysisStatus | null;
  topScamTypeId: string | null;
  expectedScamTypeId: string | null;
  expectedBehavior: string;
  pass: boolean;
  failure?: string;
};

type BaselineCaseResult = {
  id: string;
  predictedScamTypeId: string | null;
  abstain: boolean;
  pass: boolean;
  failure?: string;
};

type EvaluationArtifact = {
  setup: {
    date: string;
    model: string;
    caseCount: number;
    scamCases: number;
    benignCases: number;
    ambiguousCases: number;
  };
  hybrid: {
    metrics: EvaluationMetrics;
    unsupportedObservationsRemovedByGrounding: number;
    casesWithGroundingRemovals: number;
    cases: HybridCaseResult[];
  };
  rulesOnly: {
    metrics: EvaluationMetrics;
    cases: BaselineCaseResult[];
  };
  directLlm: {
    metrics: EvaluationMetrics;
    cases: BaselineCaseResult[];
  };
};

async function main(): Promise<void> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  assertEvaluationCaseSet(EVALUATION_CASES);

  const model = process.env.GROQ_MODEL ?? DEFAULT_MODEL;
  const profiles = loadScamTypes();
  const allowedTypes = profiles.map(({ id, name }) => ({ id, name }));
  const directClient = new Groq({
    apiKey,
    maxRetries: 0,
    timeout: 20_000,
  }) as unknown as GroqClientLike;
  const rulesRecords = evaluateRulesCases(EVALUATION_CASES);
  const hybridRecords: EvaluatedCase[] = [];
  const hybridCases: HybridCaseResult[] = [];
  const directRecords: EvaluatedCase[] = [];
  const directCases: BaselineCaseResult[] = [];

  for (const [index, evaluationCase] of EVALUATION_CASES.entries()) {
    console.log(
      `[${index + 1}/${EVALUATION_CASES.length}] Hybrid: ${evaluationCase.id}`,
    );
    const hybrid = await evaluateHybridCase(evaluationCase, profiles);
    hybridCases.push(hybrid.detail);
    hybridRecords.push(hybrid.record);

    await delay(LIVE_CALL_DELAY_MS);

    console.log(
      `[${index + 1}/${EVALUATION_CASES.length}] Direct LLM: ${evaluationCase.id}`,
    );
    const direct = await evaluateDirectCase(
      evaluationCase,
      directClient,
      model,
      allowedTypes,
    );
    directCases.push({
      id: evaluationCase.id,
      predictedScamTypeId: direct.prediction.scamTypeId,
      abstain: direct.prediction.abstain,
      pass: direct.pass,
      ...(direct.prediction.failure
        ? { failure: direct.prediction.failure }
        : {}),
    });
    directRecords.push(direct);

    if (index < EVALUATION_CASES.length - 1) {
      await delay(LIVE_CALL_DELAY_MS);
    }
  }

  const artifact: EvaluationArtifact = {
    setup: {
      date: new Date().toISOString().slice(0, 10),
      model,
      caseCount: EVALUATION_CASES.length,
      scamCases: EVALUATION_CASES.filter(({ group }) => group === "scam")
        .length,
      benignCases: EVALUATION_CASES.filter(({ group }) => group === "benign")
        .length,
      ambiguousCases: EVALUATION_CASES.filter(
        ({ group }) => group === "ambiguous",
      ).length,
    },
    hybrid: {
      metrics: calculateMetrics(hybridRecords),
      unsupportedObservationsRemovedByGrounding: hybridCases.reduce(
        (total, result) => total + result.groundingDroppedObservations,
        0,
      ),
      casesWithGroundingRemovals: hybridCases.filter(
        ({ groundingDroppedObservations }) =>
          groundingDroppedObservations > 0,
      ).length,
      cases: hybridCases,
    },
    rulesOnly: {
      metrics: calculateMetrics(rulesRecords),
      cases: rulesRecords.map(({ case: evaluationCase, prediction, pass }) => ({
        id: evaluationCase.id,
        predictedScamTypeId: prediction.scamTypeId,
        abstain: prediction.abstain,
        pass,
      })),
    },
    directLlm: {
      metrics: calculateMetrics(directRecords),
      cases: directCases,
    },
  };

  const outputDirectory = path.join(process.cwd(), "evaluation");
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    path.join(outputDirectory, "results.json"),
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(outputDirectory, "results.md"),
    renderMarkdown(artifact),
    "utf8",
  );

  console.log("Evaluation artifacts written to evaluation/results.json and evaluation/results.md.");
}

async function evaluateHybridCase(
  evaluationCase: EvaluationCase,
  profiles: ReturnType<typeof loadScamTypes>,
): Promise<{ detail: HybridCaseResult; record: EvaluatedCase }> {
  const input = toAnalyzeInput(evaluationCase);

  try {
    const rawExtraction = await withRateLimitRetry(() =>
      extractSignals(input),
    );
    const groundedExtraction = groundExtractionEvidence(rawExtraction, input);
    const ranking = rankScamTypes({
      profiles,
      presentSignals: groundedExtraction.presentSignals,
      contradictingSignals: groundedExtraction.contradictingSignals,
    });
    const status = decideStatus(ranking);
    const topScamTypeId = ranking[0]?.scamTypeId ?? null;
    const prediction: EvaluationPrediction = {
      scamTypeId: topScamTypeId,
      abstain: status === "insufficient_evidence",
    };
    const pass = isExpectedDecision(evaluationCase, prediction);
    const groundingDroppedObservations =
      observationCount(rawExtraction) - observationCount(groundedExtraction);

    return {
      detail: {
        id: evaluationCase.id,
        rawExtractionSuccess: true,
        rawPresentSignalCount: rawExtraction.presentSignals.length,
        groundedPresentSignalCount: groundedExtraction.presentSignals.length,
        groundingDroppedObservations,
        status,
        topScamTypeId,
        expectedScamTypeId: evaluationCase.expectedScamTypeId ?? null,
        expectedBehavior: evaluationCase.expectedBehavior ?? "abstain",
        pass,
      },
      record: { case: evaluationCase, prediction, pass },
    };
  } catch (error) {
    const failure = errorMessage(error);
    const prediction: EvaluationPrediction = {
      scamTypeId: null,
      abstain: true,
      failure,
    };

    return {
      detail: {
        id: evaluationCase.id,
        rawExtractionSuccess: false,
        rawPresentSignalCount: 0,
        groundedPresentSignalCount: 0,
        groundingDroppedObservations: 0,
        status: null,
        topScamTypeId: null,
        expectedScamTypeId: evaluationCase.expectedScamTypeId ?? null,
        expectedBehavior: evaluationCase.expectedBehavior ?? "abstain",
        pass: false,
        failure,
      },
      record: { case: evaluationCase, prediction, pass: false },
    };
  }
}

async function evaluateDirectCase(
  evaluationCase: EvaluationCase,
  client: GroqClientLike,
  model: string,
  allowedTypes: Array<{ id: string; name: string }>,
): Promise<EvaluatedCase> {
  try {
    const prediction = await withRateLimitRetry(async () => {
      const response = await client.chat.completions.create({
        model,
        reasoning_effort: "none",
        temperature: 0,
        seed: 42,
        messages: [
          {
            role: "system",
            content: [
              "Classify the submitted content directly as one allowed scam type or abstain.",
              "Abstain when the content is benign, ambiguous, or lacks enough evidence.",
              "Do not provide reasoning or chain-of-thought.",
              `Allowed scam types: ${allowedTypes
                .map(({ id, name }) => `${id} (${name})`)
                .join(", ")}.`,
            ].join(" "),
          },
          {
            role: "user",
            content: renderCaseContent(evaluationCase),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "direct_scam_classification",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                scamTypeId: {
                  anyOf: [
                    {
                      type: "string",
                      enum: allowedTypes.map(({ id }) => id),
                    },
                    { type: "null" },
                  ],
                },
                abstain: { type: "boolean" },
              },
              required: ["scamTypeId", "abstain"],
            },
          },
        },
      });
      const content = response.choices?.[0]?.message?.content;
      if (!content?.trim()) {
        throw new Error("Direct LLM returned an empty response.");
      }

      return parseDirectPrediction(
        JSON.parse(content) as unknown,
        new Set(allowedTypes.map(({ id }) => id)),
      );
    });
    const pass = isExpectedDecision(evaluationCase, prediction);
    return { case: evaluationCase, prediction, pass };
  } catch (error) {
    const prediction: EvaluationPrediction = {
      scamTypeId: null,
      abstain: true,
      failure: errorMessage(error),
    };
    return { case: evaluationCase, prediction, pass: false };
  }
}

function parseDirectPrediction(
  value: unknown,
  allowedTypeIds: Set<string>,
): EvaluationPrediction {
  if (
    typeof value !== "object" ||
    value === null ||
    !("scamTypeId" in value) ||
    !("abstain" in value)
  ) {
    throw new Error("Direct LLM response did not match the expected schema.");
  }

  const scamTypeId = value.scamTypeId;
  const abstain = value.abstain;
  if (
    typeof abstain !== "boolean" ||
    (scamTypeId !== null &&
      (typeof scamTypeId !== "string" || !allowedTypeIds.has(scamTypeId))) ||
    (abstain && scamTypeId !== null) ||
    (!abstain && scamTypeId === null)
  ) {
    throw new Error("Direct LLM response contained inconsistent values.");
  }

  return { scamTypeId, abstain };
}

async function withRateLimitRetry<T>(
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isRateLimitError(error)) {
      throw error;
    }

    console.warn("Rate limited; waiting 60 seconds before one retry.");
    await delay(RATE_LIMIT_DELAY_MS);
    return operation();
  }
}

function isRateLimitError(error: unknown): boolean {
  return (
    error instanceof ProviderRateLimitError ||
    (typeof error === "object" &&
      error !== null &&
      "status" in error &&
      error.status === 429)
  );
}

function toAnalyzeInput(evaluationCase: EvaluationCase): AnalyzeInput {
  return {
    text: evaluationCase.text,
    image: null,
    url: "",
    platform: evaluationCase.platform ?? "",
    context: evaluationCase.context ?? "",
  };
}

function observationCount(extraction: ExtractionResult): number {
  return (
    extraction.presentSignals.length + extraction.contradictingSignals.length
  );
}

function renderCaseContent(evaluationCase: EvaluationCase): string {
  return [
    `Text:\n${evaluationCase.text}`,
    `Platform:\n${evaluationCase.platform ?? "(not provided)"}`,
    `Context:\n${evaluationCase.context ?? "(not provided)"}`,
  ].join("\n\n");
}

function renderMarkdown(artifact: EvaluationArtifact): string {
  const lines = [
    "# ForgeHacks Evaluation",
    "",
    "## Setup",
    "",
    `- Date: ${artifact.setup.date}`,
    `- Model: ${artifact.setup.model}`,
    "- 16 synthetic holdout cases",
    "- 8 scam / 4 benign / 4 ambiguous",
    "- Same eight scam categories as production",
    "",
    "## Hybrid System",
    "",
    ...metricLines(artifact.hybrid.metrics),
    `- Unsupported observations removed by grounding: ${artifact.hybrid.unsupportedObservationsRemovedByGrounding}`,
    `- Cases with grounding removals: ${artifact.hybrid.casesWithGroundingRemovals}`,
    "",
    "## Rules-Only Baseline",
    "",
    ...metricLines(artifact.rulesOnly.metrics),
    "",
    "## Direct LLM Baseline",
    "",
    ...metricLines(artifact.directLlm.metrics),
    "",
    "## Per-Case Results",
    "",
    "| Case | Expected | Hybrid | Rules | Direct LLM | Pass/fail |",
    "| --- | --- | --- | --- | --- | --- |",
  ];

  for (const evaluationCase of EVALUATION_CASES) {
    const hybrid = artifact.hybrid.cases.find(
      ({ id }) => id === evaluationCase.id,
    );
    const rules = artifact.rulesOnly.cases.find(
      ({ id }) => id === evaluationCase.id,
    );
    const direct = artifact.directLlm.cases.find(
      ({ id }) => id === evaluationCase.id,
    );
    lines.push(
      `| ${evaluationCase.id} | ${expectedLabel(evaluationCase)} | ${hybridLabel(hybrid)} | ${baselineLabel(rules)} | ${baselineLabel(direct)} | H:${passLabel(hybrid?.pass)} R:${passLabel(rules?.pass)} L:${passLabel(direct?.pass)} |`,
    );
  }

  lines.push(
    "",
    "## Interpretation",
    "",
    ...interpretationLines(artifact),
    "",
    "This is a small synthetic hackathon evaluation, not a production benchmark.",
    "",
  );
  return lines.join("\n");
}

function metricLines(metrics: EvaluationMetrics): string[] {
  return [
    `- Exact scam-type correct: ${metrics.exactScamTypeCorrect}/8`,
    `- Scam detected/non-abstained: ${metrics.scamNonAbstention}/8`,
    `- Benign + ambiguous abstained: ${metrics.nonScamAbstention}/8`,
    `- Overall correct decisions: ${metrics.overallCorrect}/16`,
    `- Schema/provider failures: ${metrics.providerFailures}`,
  ];
}

function expectedLabel(evaluationCase: EvaluationCase): string {
  return evaluationCase.group === "scam"
    ? (evaluationCase.expectedScamTypeId ?? "unknown")
    : "abstain";
}

function hybridLabel(result: HybridCaseResult | undefined): string {
  if (!result) {
    return "missing";
  }
  if (result.failure) {
    return "failure";
  }
  if (result.status === "insufficient_evidence") {
    return `abstain (top: ${result.topScamTypeId ?? "none"})`;
  }
  return `${result.topScamTypeId ?? "none"} (${result.status})`;
}

function baselineLabel(result: BaselineCaseResult | undefined): string {
  if (!result) {
    return "missing";
  }
  if (result.failure) {
    return "failure";
  }
  return result.abstain
    ? "abstain"
    : (result.predictedScamTypeId ?? "none");
}

function passLabel(pass: boolean | undefined): string {
  return pass ? "pass" : "fail";
}

function interpretationLines(artifact: EvaluationArtifact): string[] {
  const lines: string[] = [];
  const hybrid = artifact.hybrid.metrics;
  const rules = artifact.rulesOnly.metrics;
  const direct = artifact.directLlm.metrics;

  lines.push(
    comparisonSentence("Hybrid", hybrid.overallCorrect, "rules-only", rules.overallCorrect),
    comparisonSentence("Hybrid", hybrid.overallCorrect, "direct LLM", direct.overallCorrect),
  );

  if (hybrid.nonScamAbstention > rules.nonScamAbstention) {
    lines.push(
      `- Hybrid abstained on more benign or ambiguous cases than rules-only (${hybrid.nonScamAbstention}/8 vs ${rules.nonScamAbstention}/8).`,
    );
  } else if (hybrid.nonScamAbstention < rules.nonScamAbstention) {
    lines.push(
      `- Rules-only abstained on more benign or ambiguous cases than hybrid (${rules.nonScamAbstention}/8 vs ${hybrid.nonScamAbstention}/8).`,
    );
  } else {
    lines.push(
      `- Hybrid and rules-only both abstained on ${hybrid.nonScamAbstention}/8 benign or ambiguous cases.`,
    );
  }

  const missedHybridCases = artifact.hybrid.cases
    .filter(({ pass }) => !pass)
    .map(({ id }) => id);
  lines.push(
    missedHybridCases.length === 0
      ? "- Hybrid passed all 16 expected decisions."
      : `- Hybrid missed: ${missedHybridCases.join(", ")}.`,
  );

  return lines;
}

function comparisonSentence(
  firstName: string,
  firstScore: number,
  secondName: string,
  secondScore: number,
): string {
  if (firstScore > secondScore) {
    return `- ${firstName} produced more correct decisions than ${secondName} (${firstScore}/16 vs ${secondScore}/16).`;
  }
  if (firstScore < secondScore) {
    return `- ${secondName} produced more correct decisions than ${firstName.toLocaleLowerCase("en")} (${secondScore}/16 vs ${firstScore}/16).`;
  }
  return `- ${firstName} and ${secondName} produced the same number of correct decisions (${firstScore}/16).`;
}

function assertEvaluationCaseSet(cases: EvaluationCase[]): void {
  const counts = {
    scam: cases.filter(({ group }) => group === "scam").length,
    benign: cases.filter(({ group }) => group === "benign").length,
    ambiguous: cases.filter(({ group }) => group === "ambiguous").length,
  };
  const ids = new Set(cases.map(({ id }) => id));

  if (
    cases.length !== 16 ||
    counts.scam !== 8 ||
    counts.benign !== 4 ||
    counts.ambiguous !== 4 ||
    ids.size !== cases.length
  ) {
    throw new Error("Evaluation cases must contain 8 scam, 4 benign, and 4 ambiguous unique cases.");
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown provider failure.";
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

await main();
