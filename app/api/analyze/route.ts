import { selectAllowedActions } from "@/lib/action-policy";
import { groundExtractionEvidence } from "@/lib/evidence-grounding";
import { rankRelatedExamples } from "@/lib/example-comparison";
import {
  extractSignals,
  ProviderRateLimitError,
  ProviderResponseError,
  ProviderTimeoutError,
} from "@/lib/groq";
import { decideStatus, rankScamTypes } from "@/lib/matching";
import { buildAnalysisResult } from "@/lib/result-builder";
import {
  loadExamples,
  loadSafeActions,
  loadScamTypes,
} from "@/lib/scam-data";
import { analyzeUrl, urlObservationsToSignals } from "@/lib/url-analysis";
import { validateAnalyzeInput } from "@/lib/validate-input";
import type {
  AnalyzeInput,
  ExtractionResult,
  SignalObservation,
} from "@/types/analysis";

export async function POST(request: Request): Promise<Response> {
  let input: AnalyzeInput;

  try {
    input = await readInput(request);
  } catch {
    return errorResponse(400, "invalid_input", "The submitted form data is invalid.");
  }

  const validation = validateAnalyzeInput(input);
  if (!validation.ok) {
    return errorResponse(400, "invalid_input", validation.errors.join(" "));
  }

  try {
    const urlObservations = analyzeUrl(input.url);
    const deterministicSignals = urlObservationsToSignals(urlObservations);
    const extracted = await extractSignals(input);
    const grounded = groundExtractionEvidence(extracted, input);
    const extraction: ExtractionResult = {
      ...grounded,
      presentSignals: mergeSignals(
        deterministicSignals,
        grounded.presentSignals,
      ),
    };

    const profiles = loadScamTypes();
    const ranking = rankScamTypes({
      profiles,
      presentSignals: extraction.presentSignals,
      contradictingSignals: extraction.contradictingSignals,
    });
    const status = decideStatus(ranking);
    const topProfile =
      status === "insufficient_evidence"
        ? undefined
        : profiles.find((profile) => profile.id === ranking[0]?.scamTypeId);
    const relatedExamples = topProfile
      ? rankRelatedExamples(topProfile, loadExamples(), extraction)
      : [];
    const actions = selectAllowedActions(
      extraction.presentSignals,
      topProfile?.id ?? null,
      loadSafeActions(),
    );

    const result = buildAnalysisResult({
        status,
        ranking,
        profiles,
        extraction,
        selectedActions: actions,
        relatedExamples,
        urlObservations,
        technicalWarnings: [],
      });

    return Response.json({ result });
  } catch (error) {
    if (error instanceof ProviderRateLimitError) {
      return errorResponse(
        503,
        "provider_rate_limited",
        "Analysis rate limit reached. Please wait a moment and try again.",
      );
    }

    if (error instanceof ProviderTimeoutError) {
      return errorResponse(
        503,
        "provider_unavailable",
        "Analysis is temporarily unavailable. Please try again.",
      );
    }

    if (error instanceof ProviderResponseError) {
      return errorResponse(
        error.transient ? 503 : 502,
        error.transient ? "provider_unavailable" : "provider_response_error",
        error.transient
          ? "Analysis is temporarily unavailable. Please try again."
          : "The analysis provider returned an invalid response.",
      );
    }

    throw error;
  }
}

async function readInput(request: Request): Promise<AnalyzeInput> {
  const formData = await request.formData();
  const imageValue = formData.get("image");

  return {
    text: stringField(formData, "text"),
    image: imageValue instanceof File && imageValue.size > 0 ? imageValue : null,
    url: stringField(formData, "url"),
    platform: stringField(formData, "platform"),
    context: stringField(formData, "context"),
  };
}

function stringField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function mergeSignals(
  deterministic: SignalObservation[],
  extracted: SignalObservation[],
): SignalObservation[] {
  const byId = new Map<string, SignalObservation>();
  for (const signal of [...deterministic, ...extracted]) {
    if (!byId.has(signal.id)) {
      byId.set(signal.id, signal);
    }
  }
  return [...byId.values()];
}

function errorResponse(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}
