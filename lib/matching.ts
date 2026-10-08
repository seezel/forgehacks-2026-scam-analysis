import type {
  AnalysisStatus,
  RankedScamType,
  SignalObservation,
} from "@/types/analysis";
import type { ScamTypeProfile } from "@/types/scam-data";

export const STRONG_SCORE = 0.65;
export const POSSIBLE_SCORE = 0.4;
export const STRONG_LEAD = 0.1;

type RankScamTypesInput = {
  profiles: ScamTypeProfile[];
  presentSignals: SignalObservation[];
  contradictingSignals: SignalObservation[];
};

export function rankScamTypes({
  profiles,
  presentSignals,
  contradictingSignals,
}: RankScamTypesInput): RankedScamType[] {
  const presentIds = evidenceBackedIds(presentSignals);
  const contradictionIds = evidenceBackedIds(contradictingSignals);

  return profiles
    .map((profile) => rankProfile(profile, presentIds, contradictionIds))
    .sort(
      (left, right) =>
        right.normalizedScore - left.normalizedScore ||
        left.scamTypeId.localeCompare(right.scamTypeId),
    );
}

export function decideStatus(ranking: RankedScamType[]): AnalysisStatus {
  const top = ranking[0];
  if (!top) {
    return "insufficient_evidence";
  }

  const second = ranking[1];
  const hasStrongEvidence =
    top.strongestMatchedWeight === 4 || top.matchedWeightThreeCount >= 2;
  const hasRequiredLead =
    !second ||
    top.normalizedScore - second.normalizedScore >=
      STRONG_LEAD - Number.EPSILON;
  const hasMajorContradiction = top.contradictionIds.length > 0;

  if (
    top.normalizedScore >= STRONG_SCORE &&
    hasStrongEvidence &&
    hasRequiredLead &&
    !hasMajorContradiction
  ) {
    return "strong_match";
  }

  const hasEnoughEvidence = top.matchedSignalIds.length >= 2;

  if (top.normalizedScore >= POSSIBLE_SCORE && hasEnoughEvidence) {
    return "possible_match";
  }

  return "insufficient_evidence";
}

function rankProfile(
  profile: ScamTypeProfile,
  presentIds: Set<string>,
  observedContradictionIds: Set<string>,
): RankedScamType {
  const matchedSignalIds: string[] = [];
  let matchedWeight = 0;
  let strongestMatchedWeight = 0;
  let matchedWeightThreeCount = 0;
  let totalPositiveProfileWeight = 0;

  for (const [signalId, weight] of Object.entries(profile.signalWeights)) {
    totalPositiveProfileWeight += weight;
    if (!presentIds.has(signalId)) {
      continue;
    }

    matchedSignalIds.push(signalId);
    matchedWeight += weight;
    strongestMatchedWeight = Math.max(strongestMatchedWeight, weight);
    if (weight === 3) {
      matchedWeightThreeCount += 1;
    }
  }

  const contradictionIds: string[] = [];
  let penalty = 0;
  for (const [signalId, configuredPenalty] of Object.entries(
    profile.contradictionPenalties,
  )) {
    if (observedContradictionIds.has(signalId)) {
      contradictionIds.push(signalId);
      penalty += configuredPenalty;
    }
  }

  const rawScore =
    totalPositiveProfileWeight === 0
      ? 0
      : (matchedWeight - penalty) / totalPositiveProfileWeight;

  return {
    scamTypeId: profile.id,
    name: profile.name,
    normalizedScore: clamp(rawScore, 0, 1),
    matchedSignalIds,
    contradictionIds,
    strongestMatchedWeight,
    matchedWeightThreeCount,
  };
}

function evidenceBackedIds(observations: SignalObservation[]): Set<string> {
  return new Set(
    observations
      .filter((observation) => observation.evidence.trim().length > 0)
      .map((observation) => observation.id),
  );
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
