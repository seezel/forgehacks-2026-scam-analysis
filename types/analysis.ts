export const ANALYSIS_STATUSES = [
  "strong_match",
  "possible_match",
  "insufficient_evidence",
] as const;

export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number];
export type EvidenceSource = "text" | "image" | "url" | "context";

export type SignalObservation = {
  id: string;
  evidence: string;
  source: EvidenceSource;
  explanation: string;
};

export type ExtractionResult = {
  summary: string;
  claimedIdentity: string | null;
  requestedActions: string[];
  requestedInformation: string[];
  moneyRequest: boolean;
  credentialRequest: boolean;
  attachmentReference: string | null;
  extractedUrls: string[];
  presentSignals: SignalObservation[];
  contradictingSignals: SignalObservation[];
  uncertainties: string[];
};

export type UrlObservation = {
  id: string;
  evidence: string;
  explanation: string;
};

export type AnalyzeInput = {
  text: string;
  image: File | null;
  url: string;
  platform: string;
  context: string;
};

export type RankedScamType = {
  scamTypeId: string;
  name: string;
  normalizedScore: number;
  matchedSignalIds: string[];
  contradictionIds: string[];
  strongestMatchedWeight: number;
  matchedWeightThreeCount: number;
};

export type RelatedExampleResult = {
  exampleId: string;
  title: string;
  shortParaphrase: string;
  sourceUrl: string;
  sourceLabel: string;
  sharedSignalIds: string[];
  differences: string[];
  overlapScore: number;
};

export type ImmediateAction = {
  id: string;
  text: string;
};

export type AnalysisResult = {
  status: AnalysisStatus;
  likelyScamType: { id: string; name: string } | null;
  immediateActions: ImmediateAction[];
  strongestEvidence: SignalObservation[];
  relatedExamples: RelatedExampleResult[];
  differences: string[];
  uncertainties: string[];
  urlObservations: UrlObservation[];
  technicalWarnings: string[];
};
