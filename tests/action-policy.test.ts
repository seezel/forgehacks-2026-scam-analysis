import { describe, expect, it } from "vitest";
import { selectAllowedActions } from "@/lib/action-policy";
import { loadSafeActions } from "@/lib/scam-data";
import type { SignalObservation } from "@/types/analysis";

function signals(ids: string[]): SignalObservation[] {
  return ids.map((id) => ({
    id,
    evidence: `Evidence for ${id}`,
    source: "text",
    explanation: `${id} was observed.`,
  }));
}

function selectedIds(signalIds: string[], scamTypeId: string | null = null) {
  return selectAllowedActions(
    signals(signalIds),
    scamTypeId,
    loadSafeActions(),
  ).map((action) => action.id);
}

describe("selectAllowedActions", () => {
  it("selects the money action for a money request", () => {
    expect(selectedIds(["request_money_or_transfer"])).toContain(
      "do_not_send_money",
    );
  });

  it("selects the credential action for a credential request", () => {
    expect(selectedIds(["request_credentials"])).toContain(
      "do_not_share_credentials",
    );
  });

  it("selects the OTP action for an OTP request", () => {
    expect(selectedIds(["request_otp_or_security_code"])).toContain(
      "do_not_share_otp",
    );
  });

  it("selects both approved link actions for a suspicious link", () => {
    expect(selectedIds(["suspicious_link_present"])).toEqual(
      expect.arrayContaining([
        "do_not_use_provided_link",
        "use_official_app_or_site_directly",
      ]),
    );
  });

  it("selects the attachment action for an attachment lure", () => {
    expect(
      selectedIds(["ordinary_looking_attachment_used_as_lure"]),
    ).toContain("do_not_open_or_install_attachment");
  });

  it("selects the remote-access action for a remote-access request", () => {
    expect(selectedIds(["request_remote_access"])).toContain(
      "stop_remote_access_session",
    );
  });

  it("selects the separate-channel action from friend evidence", () => {
    expect(selectedIds(["claimed_friend_or_known_contact"])).toContain(
      "contact_person_via_separate_trusted_channel",
    );
  });

  it("selects the separate-channel action from the friend scam type", () => {
    expect(selectedIds([], "compromised_friend")).toContain(
      "contact_person_via_separate_trusted_channel",
    );
  });

  it("does not select actions that have no signal or type trigger", () => {
    expect(selectedIds(["unexpected_contact"], "job_task")).toEqual([]);
  });

  it("de-duplicates action IDs and returns at most five actions", () => {
    const definitions = loadSafeActions();
    const selected = selectAllowedActions(
      signals([
        "request_money_or_transfer",
        "request_deposit_or_fee",
        "request_credentials",
        "request_otp_or_security_code",
        "suspicious_link_present",
        "request_download_or_install",
        "request_remote_access",
      ]),
      "job_task",
      [...definitions, definitions[0]],
    );

    expect(selected.length).toBeLessThanOrEqual(5);
    expect(new Set(selected.map((action) => action.id)).size).toBe(
      selected.length,
    );
  });
});
