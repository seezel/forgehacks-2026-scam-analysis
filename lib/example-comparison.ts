import type { ExtractionResult, RelatedExampleResult } from "@/types/analysis";
import type { DocumentedExample, ScamTypeProfile } from "@/types/scam-data";

export function rankRelatedExamples(
  profile: ScamTypeProfile,
  examples: DocumentedExample[],
  extraction: ExtractionResult,
): RelatedExampleResult[] {
  const presentSignalIds = new Set(
    extraction.presentSignals
      .filter((signal) => signal.evidence.trim().length > 0)
      .map((signal) => signal.id),
  );

  return examples
    .filter((example) => example.scamTypeId === profile.id)
    .map((example) =>
      compareExample(profile, example, extraction, presentSignalIds),
    )
    .sort(
      (left, right) =>
        right.overlapScore - left.overlapScore ||
        left.exampleId.localeCompare(right.exampleId),
    )
    .slice(0, 3);
}

function compareExample(
  profile: ScamTypeProfile,
  example: DocumentedExample,
  extraction: ExtractionResult,
  presentSignalIds: Set<string>,
): RelatedExampleResult {
  const representedSignalIds = [
    ...new Set(
      example.signalIds.filter(
        (signalId) => profile.signalWeights[signalId] !== undefined,
      ),
    ),
  ];
  const sharedSignalIds = representedSignalIds.filter((signalId) =>
    presentSignalIds.has(signalId),
  );
  const exampleRepresentedWeight = sumWeights(
    representedSignalIds,
    profile,
  );
  const sharedWeight = sumWeights(sharedSignalIds, profile);

  return {
    exampleId: example.id,
    title: example.title,
    shortParaphrase: example.shortParaphrase,
    sourceUrl: example.source.url,
    sourceLabel: example.source.organizationOrPublisher,
    sharedSignalIds,
    differences: describeKnownDifferences(example, extraction),
    overlapScore:
      exampleRepresentedWeight === 0
        ? 0
        : sharedWeight / exampleRepresentedWeight,
  };
}

function sumWeights(
  signalIds: string[],
  profile: ScamTypeProfile,
): number {
  return signalIds.reduce(
    (total, signalId) => total + (profile.signalWeights[signalId] ?? 0),
    0,
  );
}

function describeKnownDifferences(
  example: DocumentedExample,
  extraction: ExtractionResult,
): string[] {
  const differences: string[] = [];

  if (
    extraction.claimedIdentity &&
    normalize(extraction.claimedIdentity) !== normalize(example.claimedIdentity)
  ) {
    differences.push(
      `Claimed identity differs: documented example uses "${example.claimedIdentity}"; submitted content claims "${extraction.claimedIdentity}".`,
    );
  }

  if (
    extraction.requestedActions.length > 0 &&
    !sameStringSet(extraction.requestedActions, example.requestedActions)
  ) {
    differences.push(
      `Requested actions differ: documented example includes "${example.requestedActions.join("; ")}"; submitted content includes "${extraction.requestedActions.join("; ")}".`,
    );
  }

  return differences;
}

function sameStringSet(left: string[], right: string[]): boolean {
  const normalizedLeft = new Set(left.map(normalize));
  const normalizedRight = new Set(right.map(normalize));

  if (normalizedLeft.size !== normalizedRight.size) {
    return false;
  }

  return [...normalizedLeft].every((value) => normalizedRight.has(value));
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("en");
}
