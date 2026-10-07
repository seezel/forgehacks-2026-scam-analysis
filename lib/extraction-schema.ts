import type { ExtractionResult, SignalObservation } from "@/types/analysis";
import * as z from "zod";

export const SIGNAL_IDS = [
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
] as const;

const signalObservationSchema = z.object({
  id: z.enum(SIGNAL_IDS),
  evidence: z.string().min(1).max(500),
  source: z.enum(["text", "image", "url", "context"]),
  explanation: z.string().min(1).max(500),
}) satisfies z.ZodType<SignalObservation>;

export const extractionSchema = z.object({
  summary: z.string().max(1000),
  claimedIdentity: z.string().max(300).nullable(),
  requestedActions: z.array(z.string().max(300)).max(10),
  requestedInformation: z.array(z.string().max(300)).max(10),
  moneyRequest: z.boolean(),
  credentialRequest: z.boolean(),
  attachmentReference: z.string().max(300).nullable(),
  extractedUrls: z.array(z.string().max(2048)).max(10),
  presentSignals: z.array(signalObservationSchema).max(20),
  contradictingSignals: z.array(signalObservationSchema).max(10),
  uncertainties: z.array(z.string().max(500)).max(10),
}) satisfies z.ZodType<ExtractionResult>;

export const extractionJsonSchema = z.toJSONSchema(extractionSchema);

export function parseExtraction(value: unknown): ExtractionResult {
  return extractionSchema.parse(value);
}
