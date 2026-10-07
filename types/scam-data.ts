export type ScamTypeProfile = {
  id: string;
  name: string;
  shortDescription: string;
  recurringStructure: string;
  signalWeights: Record<string, 1 | 2 | 3 | 4>;
  contradictionPenalties: Record<string, number>;
  safeActionIds: string[];
};

export type DocumentedExample = {
  id: string;
  scamTypeId: string;
  title: string;
  shortParaphrase: string;
  platform: string;
  claimedIdentity: string;
  requestedActions: string[];
  signalIds: string[];
  source: {
    organizationOrPublisher: string;
    title: string;
    url: string;
    publishedDate: string | null;
  };
  notes: string;
};

export type SafeActionDefinition = {
  id: string;
  defaultText: string;
  triggerSignalIds: string[];
  triggerScamTypeIds: string[];
};
