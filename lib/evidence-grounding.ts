import type {
  AnalyzeInput,
  ExtractionResult,
  SignalObservation,
} from "@/types/analysis";

const OMITTED_EVIDENCE_UNCERTAINTY =
  "Some extracted signals were omitted because their evidence could not be verified in the submitted content.";

export function groundExtractionEvidence(
  extraction: ExtractionResult,
  input: AnalyzeInput,
): ExtractionResult {
  let omittedEvidence = false;
  const keepGrounded = (observation: SignalObservation): boolean => {
    const grounded = isGrounded(observation, input);
    omittedEvidence ||= !grounded;
    return grounded;
  };

  const presentSignals = extraction.presentSignals.filter(keepGrounded);
  const contradictingSignals = extraction.contradictingSignals.filter(keepGrounded);
  const uncertainties = [...extraction.uncertainties];

  if (omittedEvidence && !uncertainties.includes(OMITTED_EVIDENCE_UNCERTAINTY)) {
    uncertainties.push(OMITTED_EVIDENCE_UNCERTAINTY);
  }

  return {
    ...extraction,
    presentSignals,
    contradictingSignals,
    uncertainties,
  };
}

function isGrounded(
  observation: SignalObservation,
  input: AnalyzeInput,
): boolean {
  const evidence = observation.evidence.trim();
  if (!evidence) {
    return false;
  }

  if (observation.source === "image") {
    return input.image !== null;
  }

  if (observation.source === "url") {
    return input.url.includes(evidence);
  }

  const submittedValue =
    observation.source === "text" ? input.text : input.context;
  return normalize(submittedValue).includes(normalize(evidence));
}

function normalize(value: string): string {
  return value.toLocaleLowerCase("en").replace(/\s+/g, " ").trim();
}
