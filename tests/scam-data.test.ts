import { describe, expect, it } from "vitest";
import { SIGNAL_IDS } from "@/lib/extraction-schema";
import {
  loadExamples,
  loadSafeActions,
  loadScamTypes,
} from "@/lib/scam-data";

describe("scam data", () => {
  it("loads only the approved job/task profile with exact weights", () => {
    const profiles = loadScamTypes();

    expect(profiles).toHaveLength(1);
    expect(profiles[0]).toMatchObject({
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
    expect(
      Object.values(profiles[0].signalWeights).every(
        (weight) => Number.isInteger(weight) && weight >= 1 && weight <= 4,
      ),
    ).toBe(true);
  });

  it("loads the approved FTC example with required provenance", () => {
    const examples = loadExamples();

    expect(examples).toHaveLength(1);
    expect(examples[0]).toMatchObject({
      id: "ftc-task-scam-2025",
      scamTypeId: "job_task",
      source: {
        organizationOrPublisher: "U.S. Federal Trade Commission",
        title: "How to spot and avoid task scams",
        url: "https://consumer.ftc.gov/consumer-alerts/2025/08/how-spot-avoid-task-scams",
      },
    });
    expect(examples[0].shortParaphrase.length).toBeGreaterThan(0);
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

    expect(examples.every((example) => profileIds.has(example.scamTypeId))).toBe(
      true,
    );
    expect(
      profiles.every((profile) =>
        profile.safeActionIds.every((actionId) => actionIds.has(actionId)),
      ),
    ).toBe(true);
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
