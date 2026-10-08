import type {
  AnalysisResult,
  AnalysisStatus,
  ExtractionResult,
  RankedScamType,
  RelatedExampleResult,
  SignalObservation,
  UrlObservation,
} from "@/types/analysis";
import type {
  SafeActionDefinition,
  ScamTypeProfile,
} from "@/types/scam-data";

export type BuildAnalysisResultInput = {
  status: AnalysisStatus;
  ranking: RankedScamType[];
  profiles: ScamTypeProfile[];
  extraction: ExtractionResult;
  selectedActions: SafeActionDefinition[];
  relatedExamples: RelatedExampleResult[];
  urlObservations: UrlObservation[];
  technicalWarnings: string[];
};

export function buildAnalysisResult({
  status,
  ranking,
  profiles,
  extraction,
  selectedActions,
  relatedExamples,
  urlObservations,
  technicalWarnings,
}: BuildAnalysisResultInput): AnalysisResult {
  const top = ranking[0];
  const selectedProfile = top
    ? profiles.find((profile) => profile.id === top.scamTypeId)
    : undefined;
  const mayExposeMatch = status !== "insufficient_evidence" && top !== undefined;
  const exposedExamples = mayExposeMatch ? relatedExamples.slice(0, 3) : [];

  return {
    status,
    likelyScamType: mayExposeMatch
      ? { id: top.scamTypeId, name: top.name }
      : null,
    immediateActions: selectedActions.slice(0, 5).map((action) => ({
      id: action.id,
      text: action.defaultText,
    })),
    strongestEvidence: strongestEvidence(
      extraction.presentSignals,
      selectedProfile,
    ),
    relatedExamples: exposedExamples,
    differences: unique(
      exposedExamples.flatMap((example) => example.differences),
    ),
    uncertainties: [...extraction.uncertainties],
    urlObservations: [...urlObservations],
    technicalWarnings: [...technicalWarnings],
  };
}

function strongestEvidence(
  signals: SignalObservation[],
  profile: ScamTypeProfile | undefined,
): SignalObservation[] {
  return signals
    .map((signal, index) => ({ signal, index }))
    .filter(({ signal }) => signal.evidence.trim().length > 0)
    .sort((left, right) => {
      const leftWeight = profile?.signalWeights[left.signal.id] ?? 0;
      const rightWeight = profile?.signalWeights[right.signal.id] ?? 0;
      return rightWeight - leftWeight || left.index - right.index;
    })
    .slice(0, 5)
    .map(({ signal }) => signal);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
