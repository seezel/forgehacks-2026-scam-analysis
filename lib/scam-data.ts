import * as z from "zod";
import { SIGNAL_IDS } from "@/lib/extraction-schema";
import rawExamples from "@/json-data/examples.json";
import rawSafeActions from "@/json-data/safe-actions.json";
import rawScamTypes from "@/json-data/scam-types.json";
import type {
  DocumentedExample,
  SafeActionDefinition,
  ScamTypeProfile,
} from "@/types/scam-data";

const controlledSignalIdSchema = z.enum(SIGNAL_IDS);
const signalWeightSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

const scamTypeProfileSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    shortDescription: z.string().min(1),
    recurringStructure: z.string().min(1),
    signalWeights: z.partialRecord(
      controlledSignalIdSchema,
      signalWeightSchema,
    ),
    contradictionPenalties: z.partialRecord(
      controlledSignalIdSchema,
      z.number().finite().nonnegative(),
    ),
    safeActionIds: z.array(z.string().min(1)),
  })
  .strict();

const documentedExampleSchema = z
  .object({
    id: z.string().min(1),
    scamTypeId: z.string().min(1),
    title: z.string().min(1),
    shortParaphrase: z.string().min(1),
    platform: z.string().min(1),
    claimedIdentity: z.string().min(1),
    requestedActions: z.array(z.string().min(1)),
    signalIds: z.array(controlledSignalIdSchema),
    source: z
      .object({
        organizationOrPublisher: z.string().min(1),
        title: z.string().min(1),
        url: z.string().url().refine((value) => value.startsWith("https://"), {
          message: "Source URL must use HTTPS",
        }),
        publishedDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable(),
      })
      .strict(),
    notes: z.string().min(1),
  })
  .strict();

const safeActionDefinitionSchema = z
  .object({
    id: z.string().min(1),
    defaultText: z.string().min(1),
    triggerSignalIds: z.array(controlledSignalIdSchema),
    triggerScamTypeIds: z.array(z.string().min(1)),
  })
  .strict();

type ScamDataBundle = {
  profiles: ScamTypeProfile[];
  examples: DocumentedExample[];
  actions: SafeActionDefinition[];
};

let cachedData: ScamDataBundle | undefined;

export function loadScamTypes(): ScamTypeProfile[] {
  return getValidatedData().profiles;
}

export function loadExamples(): DocumentedExample[] {
  return getValidatedData().examples;
}

export function loadSafeActions(): SafeActionDefinition[] {
  return getValidatedData().actions;
}

function getValidatedData(): ScamDataBundle {
  if (cachedData) {
    return cachedData;
  }

  const profiles = z.array(scamTypeProfileSchema).min(1).parse(rawScamTypes);
  const examples = z.array(documentedExampleSchema).min(1).parse(rawExamples);
  const actions = z.array(safeActionDefinitionSchema).min(1).parse(rawSafeActions);

  assertUniqueIds(profiles, "scam profile");
  assertUniqueIds(examples, "documented example");
  assertUniqueIds(actions, "safety action");

  const profileIds = new Set(profiles.map((profile) => profile.id));
  const actionIds = new Set(actions.map((action) => action.id));

  for (const example of examples) {
    if (!profileIds.has(example.scamTypeId)) {
      throw new Error(
        `Example "${example.id}" references unknown profile "${example.scamTypeId}".`,
      );
    }
  }

  for (const profile of profiles) {
    for (const actionId of profile.safeActionIds) {
      if (!actionIds.has(actionId)) {
        throw new Error(
          `Profile "${profile.id}" references unknown safety action "${actionId}".`,
        );
      }
    }
  }

  cachedData = {
    profiles: profiles as ScamTypeProfile[],
    examples: examples as DocumentedExample[],
    actions: actions as SafeActionDefinition[],
  };
  return cachedData;
}

function assertUniqueIds(
  values: Array<{ id: string }>,
  label: string,
): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value.id)) {
      throw new Error(`Duplicate ${label} ID "${value.id}".`);
    }
    seen.add(value.id);
  }
}
