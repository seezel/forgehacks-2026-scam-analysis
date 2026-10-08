import type { SignalObservation } from "@/types/analysis";
import type { SafeActionDefinition } from "@/types/scam-data";

export function selectAllowedActions(
  signals: SignalObservation[],
  scamTypeId: string | null,
  definitions: SafeActionDefinition[],
): SafeActionDefinition[] {
  const presentSignalIds = new Set(
    signals
      .filter((signal) => signal.evidence.trim().length > 0)
      .map((signal) => signal.id),
  );
  const selectedIds = new Set<string>();
  const selected: SafeActionDefinition[] = [];

  for (const definition of definitions) {
    const triggeredBySignal = definition.triggerSignalIds.some((signalId) =>
      presentSignalIds.has(signalId),
    );
    const triggeredByType =
      scamTypeId !== null &&
      definition.triggerScamTypeIds.includes(scamTypeId);

    if (
      (triggeredBySignal || triggeredByType) &&
      !selectedIds.has(definition.id)
    ) {
      selectedIds.add(definition.id);
      selected.push(definition);
    }

    if (selected.length === 5) {
      break;
    }
  }

  return selected;
}
