import { describe, expect, it } from "vitest";
import {
  extractionSchema,
  parseExtraction,
  SIGNAL_IDS,
} from "@/lib/extraction-schema";

const valid = {
  summary: "Unexpected remote job offer that asks for a deposit.",
  claimedIdentity: "recruiter",
  requestedActions: ["Move to Telegram", "Pay a deposit"],
  requestedInformation: [],
  moneyRequest: true,
  credentialRequest: false,
  attachmentReference: null,
  extractedUrls: [],
  presentSignals: [
    {
      id: "unexpected_contact",
      evidence: "We found your profile and have a remote job for you",
      source: "text",
      explanation: "The offer arrived without prior contact.",
    },
  ],
  contradictingSignals: [],
  uncertainties: [],
};

describe("extraction schema", () => {
  it("accepts the controlled signal vocabulary", () => {
    expect(parseExtraction(valid).presentSignals[0].id).toBe(
      "unexpected_contact",
    );
  });

  it("rejects invented signal identifiers", () => {
    const invalid = structuredClone(valid);
    invalid.presentSignals[0].id = "invented_signal";

    expect(() => extractionSchema.parse(invalid)).toThrow();
  });

  it("contains exactly the approved signal vocabulary", () => {
    expect(SIGNAL_IDS).toEqual([
      "unexpected_contact",
      "claimed_authority_or_institution",
      "claimed_friend_or_known_contact",
      "claimed_recruiter_or_employer",
      "claimed_seller_or_buyer",
      "claimed_tech_support",
      "urgency_pressure",
      "fear_or_threat",
      "reward_or_easy_money",
      "relationship_or_romance_trust",
      "career_opportunity_pressure",
      "authority_pressure",
      "sunk_cost_pressure",
      "request_money_or_transfer",
      "request_deposit_or_fee",
      "request_credentials",
      "request_otp_or_security_code",
      "request_download_or_install",
      "request_remote_access",
      "request_move_to_other_platform",
      "off_platform_payment_request",
      "investment_or_profit_claim",
      "small_initial_payout",
      "account_compromise_claim",
      "device_infection_claim",
      "suspicious_link_present",
      "login_or_credential_capture_link",
      "ordinary_looking_attachment_used_as_lure",
      "professional_workflow_or_invoice_request",
    ]);
  });
});
