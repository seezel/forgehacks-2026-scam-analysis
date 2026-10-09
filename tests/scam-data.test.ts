import { describe, expect, it } from "vitest";
import { SIGNAL_IDS } from "@/lib/extraction-schema";
import {
  loadExamples,
  loadSafeActions,
  loadScamTypes,
} from "@/lib/scam-data";

const APPROVED_PROFILE_IDS = [
  "compromised_friend",
  "job_task",
  "relationship_investment",
  "institution_impersonation",
  "marketplace",
  "tech_support",
  "professional_targeted",
  "malicious_attachment",
] as const;

describe("scam data", () => {
  it("loads exactly the eight unique approved scam profiles", () => {
    const profiles = loadScamTypes();
    const profileIds = profiles.map((profile) => profile.id);

    expect(profileIds).toEqual(APPROVED_PROFILE_IDS);
    expect(new Set(profileIds).size).toBe(APPROVED_PROFILE_IDS.length);
  });

  it("preserves the approved job/task profile behavior", () => {
    const jobTask = loadScamTypes().find(
      (profile) => profile.id === "job_task",
    );

    expect(jobTask).toMatchObject({
      id: "job_task",
      name: "Job / task scam",
      signalWeights: {
        unexpected_contact: 2,
        claimed_recruiter_or_employer: 2,
        career_opportunity_pressure: 2,
        reward_or_easy_money: 3,
        request_move_to_other_platform: 2,
        small_initial_payout: 4,
        request_deposit_or_fee: 4,
        request_money_or_transfer: 3,
        request_credentials: 3,
      },
      contradictionPenalties: {},
      safeActionIds: [
        "do_not_send_money",
        "do_not_share_credentials",
        "verify_via_official_channel",
      ],
    });
  });

  it("keeps every profile weight in range and every profile well-defined", () => {
    const profiles = loadScamTypes();

    expect(
      profiles.every(
        (profile) =>
          Object.keys(profile.signalWeights).length >= 3 &&
          Object.values(profile.signalWeights).every(
            (weight) => Number.isInteger(weight) && weight >= 1 && weight <= 4,
          ),
      ),
    ).toBe(true);
  });

  it("loads at least two documented examples for every approved type", () => {
    const examples = loadExamples();
    const counts = Object.fromEntries(
      APPROVED_PROFILE_IDS.map((id) => [
        id,
        examples.filter((example) => example.scamTypeId === id).length,
      ]),
    );

    expect(examples.length).toBeGreaterThanOrEqual(16);
    expect(Object.values(counts).every((count) => count >= 2)).toBe(true);
  });

  it("keeps the existing FTC task-scam example", () => {
    expect(loadExamples()).toContainEqual(
      expect.objectContaining({
      id: "ftc-task-scam-2025",
      scamTypeId: "job_task",
      source: {
        organizationOrPublisher: "U.S. Federal Trade Commission",
        title: "How to spot and avoid task scams",
        url: "https://consumer.ftc.gov/consumer-alerts/2025/08/how-spot-avoid-task-scams",
        publishedDate: "2025-08-14",
      },
      }),
    );
  });

  it("loads the approved fixed safety-action library", () => {
    const actionIds = loadSafeActions().map((action) => action.id);

    expect(actionIds).toEqual(
      expect.arrayContaining([
        "do_not_send_money",
        "do_not_share_credentials",
        "do_not_share_otp",
        "do_not_open_or_install_attachment",
        "do_not_use_provided_link",
        "verify_via_official_channel",
        "contact_person_via_separate_trusted_channel",
        "use_official_app_or_site_directly",
        "stop_remote_access_session",
        "report_or_block_on_platform",
        "contact_financial_institution_via_official_channel",
      ]),
    );
  });

  it("keeps every cross-file reference valid", () => {
    const profiles = loadScamTypes();
    const examples = loadExamples();
    const actions = loadSafeActions();
    const profileIds = new Set(profiles.map((profile) => profile.id));
    const actionIds = new Set(actions.map((action) => action.id));

    expect(new Set(examples.map((example) => example.id)).size).toBe(
      examples.length,
    );
    expect(examples.every((example) => profileIds.has(example.scamTypeId))).toBe(
      true,
    );
    expect(
      profiles.every((profile) =>
        profile.safeActionIds.every((actionId) => actionIds.has(actionId)),
      ),
    ).toBe(true);
  });

  it("requires complete authoritative source metadata", () => {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    for (const example of loadExamples()) {
      expect(example.title.trim()).not.toBe("");
      expect(example.shortParaphrase.trim()).not.toBe("");
      expect(example.source.organizationOrPublisher.trim()).not.toBe("");
      expect(example.source.title.trim()).not.toBe("");
      expect(() => new URL(example.source.url)).not.toThrow();
      expect(new URL(example.source.url).protocol).toMatch(/^https?:$/);
      expect(
        example.source.publishedDate === null ||
          datePattern.test(example.source.publishedDate),
      ).toBe(true);
    }
  });

  it("uses only controlled signal identifiers", () => {
    const controlledIds = new Set<string>(SIGNAL_IDS);
    const profileSignalIds = loadScamTypes().flatMap((profile) => [
      ...Object.keys(profile.signalWeights),
      ...Object.keys(profile.contradictionPenalties),
    ]);
    const exampleSignalIds = loadExamples().flatMap(
      (example) => example.signalIds,
    );
    const actionSignalIds = loadSafeActions().flatMap(
      (action) => action.triggerSignalIds,
    );

    expect(
      [...profileSignalIds, ...exampleSignalIds, ...actionSignalIds].every(
        (id) => controlledIds.has(id),
      ),
    ).toBe(true);
  });
});
