# Scam Analysis MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved ForgeHacks 2026 scam-analysis MVP: users submit text, one screenshot, or a URL; Groq/Qwen extracts evidence-backed scam signals; deterministic TypeScript logic ranks eight scam types, compares documented examples, selects bounded safe actions, and returns a traceable result.

**Architecture:** One Next.js application written in TypeScript. The browser submits multipart input to a server route; the server validates input, performs URL-only structural checks, calls Groq for structured multimodal extraction, runs deterministic weighted matching and example comparison, applies a code-controlled safety policy, and returns a structured result. Local JSON files hold scam profiles, examples, safe actions, and demo fixtures; no database is used.

**Tech Stack:** Next.js, React, TypeScript, Zod 4, Groq JavaScript SDK, Vitest, Testing Library, plain CSS, local JSON data.

**Spec:** `docs/superpowers/specs/2026-10-07-scam-analysis-mvp-design.md`

## Global Constraints

- Supported input: optional text up to 10,000 characters, one JPEG/PNG/WebP image up to 5 MB, one URL up to 2,048 characters, optional platform, optional free-text context up to 1,000 characters.
- At least one of text, image, or URL is required.
- Submitted URLs are parsed but never automatically visited.
- The external model extracts structured evidence; it does not decide the final scam type or final result status.
- Exactly eight top-level scam types are supported; phishing is a method, not a ninth type.
- User-facing statuses are exactly `Strong match`, `Possible match`, and `Insufficient evidence`; there is no `Safe` status and no fake certainty percentage.
- Initial Strong threshold: top normalized score `>= 0.65`, plus one weight-4 signal or two weight-3 signals, top lead `>= 0.10`, and no major contradiction.
- Initial Possible threshold: top normalized score `>= 0.40` with enough evidence; otherwise abstain as Insufficient evidence.
- Signal weights use integers 1–4; missing signals are unknown, not contradictions.
- Code selects allowed safety actions and simple AI boundaries; AI may only phrase approved action IDs.
- No accounts, persistent user-history database, arbitrary file scanning, server-side URL browsing, live threat feeds, embeddings, vector database, RAG, multi-agent runtime, or platform integrations.
- The Groq model ID is server-side configuration; default candidate is `qwen/qwen3.8-27b`.
- Full submitted messages and screenshot contents must not be intentionally written to logs.
- Evaluation must include a calibration set, a held-out set, a raw rules-only baseline, and a direct generic-LLM baseline before the MVP is considered complete.

---

## File Structure Map

Create or maintain these focused responsibilities:

```text
app/
  page.tsx                         homepage and client-side analysis state
  globals.css                     utility-first dark/retro visual system
  how-it-works/page.tsx           concise product explanation
  api/analyze/route.ts            multipart POST analysis endpoint

components/
  analysis-form.tsx               text/image/url/context inputs
  analysis-result.tsx             approved result hierarchy
  evidence-list.tsx               evidence-backed signal display
  related-examples.tsx            source-backed example comparison
  safe-actions.tsx                immediate action display

lib/
  extraction-schema.ts            Zod structured-output schema + JSON Schema conversion
  groq.ts                         provider call, timeout/retry, image data URL conversion
  validate-input.ts               request limits and supported input validation
  url-analysis.ts                 URL-string-only observations and derived URL signals
  scam-data.ts                    load and validate local JSON data
  matching.ts                     deterministic weighted scam-type ranking
  example-comparison.ts           within-type overlap ranking and differences
  action-policy.ts                allowed action selection and boundaries
  recommendation-wording.ts       optional bounded AI wording + deterministic fallback
  result-builder.ts               construct AnalysisResult from all deterministic pieces

scripts/
  validate-data.ts                fail fast on malformed corpus JSON
  evaluate.ts                     holdout metrics and result export
  baseline-rules.ts               raw text/URL rules-only baseline
  baseline-llm.ts                 generic direct-classification baseline

json-data/
  scam-types.json                 eight weighted profiles
  examples.json                   provenance-traceable documented examples
  safe-actions.json               fixed allowed actions and default wording
  demo-fixtures.json              fixed demo/test backup cases
  evaluation-calibration.json     minimum eight calibration cases
  evaluation-holdout.json         minimum sixteen held-out cases

types/
  analysis.ts                     application input/output contracts
  scam-data.ts                    profile/example/action contracts
  evaluation.ts                   labeled test case and metric contracts

tests/
  setup.ts
  validate-input.test.ts
  url-analysis.test.ts
  matching.test.ts
  example-comparison.test.ts
  action-policy.test.ts
  result-builder.test.ts
  extraction-schema.test.ts
  scam-data.test.ts
  groq.test.ts
  evaluation.test.ts
  analyze-route.test.ts
  components/
    analysis-form.test.tsx
    analysis-result.test.tsx
```

Use `json-data/` rather than `data/` because Next.js may use `data` ambiguously in tooling and examples; all imports remain local and server-side where appropriate.

---

### Task 1: Scaffold the Next.js/TypeScript Foundation and Test Harness

**Files:**
- Create/modify: `package.json`, `tsconfig.json`, `next.config.*`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Create: `vitest.config.ts`, `tests/setup.ts`, `types/analysis.ts`, `types/scam-data.ts`, `.env.example`
- Test: `tests/extraction-schema.test.ts` initially acts as the smoke test target after Task 2; Task 1 uses `npm run typecheck` and `npm test -- --run` as foundation verification.

**Interfaces:**
- Produces: shared `AnalyzeInput`, `SignalObservation`, `ExtractionResult`, `AnalysisStatus`, `AnalysisResult`, `ScamTypeProfile`, `DocumentedExample`, and `SafeActionDefinition` TypeScript contracts.
- Consumes: none.

- [ ] **Step 1: Scaffold the app in the existing repository root**

Run from the repository root:

```bash
npx create-next-app@latest . --ts --eslint --app --use-npm --no-tailwind --no-src-dir --import-alias "@/*"
```

If `create-next-app` refuses because planning files already exist, create in a temporary sibling directory and copy only the generated application files into the repository while preserving `devpost/` and `docs/`.

- [ ] **Step 2: Install the minimum runtime and test dependencies**

Run:

```bash
npm install groq-sdk zod
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: Add test and typecheck scripts**

Ensure `package.json` contains these scripts in addition to Next.js defaults:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:run": "vitest run",
    "validate:data": "tsx scripts/validate-data.ts",
    "evaluate": "tsx scripts/evaluate.ts"
  }
}
```

Install `tsx` because the validation/evaluation scripts are TypeScript:

```bash
npm install -D tsx
```

- [ ] **Step 4: Create the Vitest configuration**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

Create `tests/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Create the shared analysis contracts**

Create `types/analysis.ts` with these exact public shapes:

```ts
export const ANALYSIS_STATUSES = [
  "strong_match",
  "possible_match",
  "insufficient_evidence",
] as const;

export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number];
export type EvidenceSource = "text" | "image" | "url" | "context";

export type SignalObservation = {
  id: string;
  evidence: string;
  source: EvidenceSource;
  explanation: string;
};

export type ExtractionResult = {
  summary: string;
  claimedIdentity: string | null;
  requestedActions: string[];
  requestedInformation: string[];
  moneyRequest: boolean;
  credentialRequest: boolean;
  attachmentReference: string | null;
  extractedUrls: string[];
  presentSignals: SignalObservation[];
  contradictingSignals: SignalObservation[];
  uncertainties: string[];
};

export type UrlObservation = {
  id: string;
  evidence: string;
  explanation: string;
};

export type AnalyzeInput = {
  text: string;
  image: File | null;
  url: string;
  platform: string;
  context: string;
};

export type RankedScamType = {
  scamTypeId: string;
  name: string;
  normalizedScore: number;
  matchedSignalIds: string[];
  contradictionIds: string[];
  strongestMatchedWeight: number;
  matchedWeightThreeCount: number;
};

export type RelatedExampleResult = {
  exampleId: string;
  title: string;
  shortParaphrase: string;
  sourceUrl: string;
  sourceLabel: string;
  sharedSignalIds: string[];
  differences: string[];
  overlapScore: number;
};

export type ImmediateAction = {
  id: string;
  text: string;
};

export type AnalysisResult = {
  status: AnalysisStatus;
  likelyScamType: { id: string; name: string } | null;
  immediateActions: ImmediateAction[];
  strongestEvidence: SignalObservation[];
  relatedExamples: RelatedExampleResult[];
  differences: string[];
  uncertainties: string[];
  urlObservations: UrlObservation[];
  technicalWarnings: string[];
};
```

- [ ] **Step 6: Create scam-data contracts**

Create `types/scam-data.ts`:

```ts
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
```

- [ ] **Step 7: Create environment documentation**

Create `.env.example`:

```dotenv
GROQ_API_KEY=
GROQ_MODEL=qwen/qwen3.8-27b
```

Never add a real key to the repository.

- [ ] **Step 8: Verify the foundation**

Run:

```bash
npm run typecheck
npm run lint
npm run build
```

Expected: all commands exit successfully.

- [ ] **Step 9: Commit the foundation**

```bash
git add package.json package-lock.json tsconfig.json next.config.* app vitest.config.ts tests/setup.ts types .env.example

git commit -m "chore: scaffold scam analysis app"
```

---

### Task 2: Define and Test the Controlled Signal Extraction Schema

**Files:**
- Create: `lib/extraction-schema.ts`
- Test: `tests/extraction-schema.test.ts`

**Interfaces:**
- Consumes: `ExtractionResult`, `SignalObservation` from `types/analysis.ts`.
- Produces: `SIGNAL_IDS`, `extractionSchema`, `extractionJsonSchema`, `parseExtraction(value)`.

- [ ] **Step 1: Write the failing schema tests**

Create `tests/extraction-schema.test.ts`:

```ts
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
    expect(parseExtraction(valid).presentSignals[0].id).toBe("unexpected_contact");
  });

  it("rejects invented signal identifiers", () => {
    const invalid = structuredClone(valid);
    invalid.presentSignals[0].id = "invented_signal";
    expect(() => extractionSchema.parse(invalid)).toThrow();
  });

  it("contains the approved signal vocabulary", () => {
    expect(SIGNAL_IDS).toContain("request_deposit_or_fee");
    expect(SIGNAL_IDS).toContain("professional_workflow_or_invoice_request");
  });
});
```

- [ ] **Step 2: Run the test and confirm failure**

```bash
npm test -- --run tests/extraction-schema.test.ts
```

Expected: FAIL because `lib/extraction-schema.ts` does not exist.

- [ ] **Step 3: Implement the controlled schema**

Create `lib/extraction-schema.ts` using Zod 4. Define exactly these approved signal IDs:

```ts
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
});

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
});

export const extractionJsonSchema = z.toJSONSchema(extractionSchema);

export function parseExtraction(value: unknown) {
  return extractionSchema.parse(value);
}
```

- [ ] **Step 4: Run the schema tests**

```bash
npm test -- --run tests/extraction-schema.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/extraction-schema.ts tests/extraction-schema.test.ts

git commit -m "feat: define structured scam signal schema"
```

---

### Task 3: Implement Input Validation and URL-String Analysis

**Files:**
- Create: `lib/validate-input.ts`, `lib/url-analysis.ts`
- Test: `tests/validate-input.test.ts`, `tests/url-analysis.test.ts`

**Interfaces:**
- Produces: `validateAnalyzeInput(input): { ok: true } | { ok: false; errors: string[] }`.
- Produces: `analyzeUrl(rawUrl): UrlObservation[]` and `urlObservationsToSignals(observations): SignalObservation[]`.
- Consumes: shared analysis types and controlled signal IDs.

- [ ] **Step 1: Write validation tests**

Test all hard limits explicitly:

```ts
import { describe, expect, it } from "vitest";
import { validateAnalyzeInput } from "@/lib/validate-input";

const base = { text: "", image: null, url: "", platform: "", context: "" };

describe("validateAnalyzeInput", () => {
  it("rejects empty input", () => {
    const result = validateAnalyzeInput(base);
    expect(result.ok).toBe(false);
  });

  it("accepts text input", () => {
    expect(validateAnalyzeInput({ ...base, text: "Suspicious message" }).ok).toBe(true);
  });

  it("rejects text above 10,000 characters", () => {
    expect(validateAnalyzeInput({ ...base, text: "x".repeat(10001) }).ok).toBe(false);
  });

  it("rejects malformed URL", () => {
    expect(validateAnalyzeInput({ ...base, url: "not a url" }).ok).toBe(false);
  });
});
```

Add image tests using `new File([new Uint8Array(10)], "shot.png", { type: "image/png" })` and a 5 MB + 1 byte file; reject unsupported MIME such as `application/pdf`.

- [ ] **Step 2: Write URL analysis tests**

Cover these deterministic cases:

```ts
import { describe, expect, it } from "vitest";
import { analyzeUrl } from "@/lib/url-analysis";

it("flags raw IP hostnames", () => {
  expect(analyzeUrl("https://192.0.2.10/login").map((x) => x.id)).toContain("raw_ip_hostname");
});

it("flags embedded credentials", () => {
  expect(analyzeUrl("https://user:pass@example.com/").map((x) => x.id)).toContain("embedded_credentials");
});

it("does not flag a short ordinary URL", () => {
  expect(analyzeUrl("https://example.com/help")).toEqual([]);
});
```

- [ ] **Step 3: Run tests to confirm failure**

```bash
npm test -- --run tests/validate-input.test.ts tests/url-analysis.test.ts
```

Expected: FAIL because implementations do not exist.

- [ ] **Step 4: Implement input validation**

Use these exact limits:

```ts
const MAX_TEXT = 10_000;
const MAX_CONTEXT = 1_000;
const MAX_URL = 2_048;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
```

A URL is valid only when `new URL(value)` succeeds and protocol is `http:` or `https:`. Return user-readable errors; do not throw for ordinary invalid input.

- [ ] **Step 5: Implement URL-only observations**

`analyzeUrl` must never call `fetch`. Detect only:

```text
raw_ip_hostname
punycode_hostname
embedded_credentials
deep_subdomain
very_long_url
```

Use conservative heuristics:

```ts
const isRawIp = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(url.hostname);
const isPunycode = url.hostname.split(".").some((part) => part.startsWith("xn--"));
const hasEmbeddedCredentials = Boolean(url.username || url.password);
const subdomainDepth = Math.max(0, url.hostname.split(".").length - 2);
const isVeryLong = rawUrl.length > 180;
```

Only convert structural warnings to the standard `suspicious_link_present` signal when at least one URL observation exists. The signal evidence is the exact URL string and source is `url`.

- [ ] **Step 6: Run deterministic tests**

```bash
npm test -- --run tests/validate-input.test.ts tests/url-analysis.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/validate-input.ts lib/url-analysis.ts tests/validate-input.test.ts tests/url-analysis.test.ts

git commit -m "feat: validate inputs and inspect url structure"
```

---

### Task 4: Add Data Schemas, Safe Actions, and the First Vertical-Slice Scam Profile

**Files:**
- Create: `lib/scam-data.ts`, `scripts/validate-data.ts`
- Create: `json-data/scam-types.json`, `json-data/examples.json`, `json-data/safe-actions.json`, `json-data/demo-fixtures.json`
- Modify: `package.json` if script path differs
- Test: `tests/scam-data.test.ts`

**Interfaces:**
- Produces: `loadScamTypes()`, `loadExamples()`, `loadSafeActions()`.
- First vertical-slice profile: `job_task`.
- First documented example source: FTC task-scam guidance, `https://consumer.ftc.gov/consumer-alerts/2025/08/how-spot-avoid-task-scams`.

- [ ] **Step 1: Write a failing data-load test**

```ts
import { describe, expect, it } from "vitest";
import { loadScamTypes, loadExamples, loadSafeActions } from "@/lib/scam-data";

describe("scam data", () => {
  it("loads a job/task profile with valid 1-4 weights", () => {
    const profile = loadScamTypes().find((x) => x.id === "job_task");
    expect(profile).toBeDefined();
    expect(Object.values(profile!.signalWeights).every((w) => w >= 1 && w <= 4)).toBe(true);
  });

  it("requires provenance on documented examples", () => {
    const example = loadExamples()[0];
    expect(example.source.url).toMatch(/^https:\/\//);
    expect(example.source.organizationOrPublisher.length).toBeGreaterThan(0);
  });

  it("loads fixed safety actions", () => {
    expect(loadSafeActions().some((x) => x.id === "do_not_send_money")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to confirm failure**

```bash
npm test -- --run tests/scam-data.test.ts
```

Expected: FAIL because the loader and JSON files do not exist.

- [ ] **Step 3: Add the first `job_task` profile**

Create `json-data/scam-types.json` initially with this profile only; all eight are added in Task 10:

```json
[
  {
    "id": "job_task",
    "name": "Job / task scam",
    "shortDescription": "An unexpected work or simple-task offer that eventually seeks money or sensitive information.",
    "recurringStructure": "Unexpected work offer -> easy or repetitive tasks -> apparent earnings or trust-building -> deposit, fee, or sensitive-information request.",
    "signalWeights": {
      "unexpected_contact": 2,
      "claimed_recruiter_or_employer": 2,
      "career_opportunity_pressure": 2,
      "reward_or_easy_money": 3,
      "request_move_to_other_platform": 2,
      "small_initial_payout": 4,
      "request_deposit_or_fee": 4,
      "request_money_or_transfer": 3,
      "request_credentials": 3
    },
    "contradictionPenalties": {},
    "safeActionIds": [
      "do_not_send_money",
      "do_not_share_credentials",
      "verify_via_official_channel"
    ]
  }
]
```

- [ ] **Step 4: Add one documented vertical-slice example**

Create `json-data/examples.json` with a concise paraphrase of the FTC task-scam pattern, not copied prose:

```json
[
  {
    "id": "ftc-task-scam-2025",
    "scamTypeId": "job_task",
    "title": "Unexpected online task offer followed by deposit request",
    "shortParaphrase": "An unexpected WhatsApp, Telegram, text, or social message offers simple paid online tasks. Apparent earnings may be shown or a small payment may be sent, then the victim is told to deposit personal funds to continue or withdraw supposed earnings.",
    "platform": "messaging / social",
    "claimedIdentity": "recruiter or work opportunity",
    "requestedActions": ["perform simple online tasks", "deposit personal funds"],
    "signalIds": [
      "unexpected_contact",
      "reward_or_easy_money",
      "small_initial_payout",
      "request_deposit_or_fee",
      "request_money_or_transfer"
    ],
    "source": {
      "organizationOrPublisher": "U.S. Federal Trade Commission",
      "title": "How to spot and avoid task scams",
      "url": "https://consumer.ftc.gov/consumer-alerts/2025/08/how-spot-avoid-task-scams",
      "publishedDate": "2025-08-14"
    },
    "notes": "Reference example for the first vertical slice."
  }
]
```

- [ ] **Step 5: Add the approved safety-action library**

Create `json-data/safe-actions.json` with at least these IDs and deterministic wording:

```json
[
  {"id":"do_not_send_money","defaultText":"Do not send money, deposits, fees, gift cards, cryptocurrency, or transfers based on this request.","triggerSignalIds":["request_money_or_transfer","request_deposit_or_fee"],"triggerScamTypeIds":[]},
  {"id":"do_not_share_credentials","defaultText":"Do not share passwords, login details, banking credentials, or other account secrets.","triggerSignalIds":["request_credentials"],"triggerScamTypeIds":[]},
  {"id":"do_not_share_otp","defaultText":"Do not share one-time passwords or security codes.","triggerSignalIds":["request_otp_or_security_code"],"triggerScamTypeIds":[]},
  {"id":"do_not_open_or_install_attachment","defaultText":"Do not open or install the attachment until you verify it through a trusted independent channel.","triggerSignalIds":["request_download_or_install","ordinary_looking_attachment_used_as_lure"],"triggerScamTypeIds":[]},
  {"id":"do_not_use_provided_link","defaultText":"Avoid using the link in the suspicious message; navigate to the organization or service independently if you need to verify something.","triggerSignalIds":["suspicious_link_present","login_or_credential_capture_link"],"triggerScamTypeIds":[]},
  {"id":"verify_via_official_channel","defaultText":"Verify the claim through an official channel you find independently, not through contact details supplied in the suspicious message.","triggerSignalIds":["claimed_authority_or_institution","claimed_recruiter_or_employer","claimed_tech_support"],"triggerScamTypeIds":[]},
  {"id":"contact_person_via_separate_trusted_channel","defaultText":"If this appears to come from someone you know, contact that person through a separate trusted channel before acting.","triggerSignalIds":["claimed_friend_or_known_contact"],"triggerScamTypeIds":["compromised_friend"]},
  {"id":"use_official_app_or_site_directly","defaultText":"Open the service's official app or type its known official website yourself instead of following the provided link.","triggerSignalIds":["suspicious_link_present"],"triggerScamTypeIds":[]},
  {"id":"stop_remote_access_session","defaultText":"Do not grant remote access. If a remote-access session is already active, disconnect it before continuing verification.","triggerSignalIds":["request_remote_access"],"triggerScamTypeIds":[]},
  {"id":"report_or_block_on_platform","defaultText":"If you confirm the account or message is suspicious, use the platform's built-in report or block controls.","triggerSignalIds":[],"triggerScamTypeIds":[]},
  {"id":"contact_financial_institution_via_official_channel","defaultText":"If money or banking information may already be involved, contact the financial institution using an official channel you find independently.","triggerSignalIds":["request_money_or_transfer","request_credentials"],"triggerScamTypeIds":["institution_impersonation"]}
]
```

- [ ] **Step 6: Add strict Zod validation for all JSON files**

`lib/scam-data.ts` must parse JSON through Zod schemas, verify weight range 1–4, verify every example `scamTypeId` exists, and verify every referenced action ID exists. Expose synchronous cached loaders because the files are local and small.

- [ ] **Step 7: Add the validation script**

`scripts/validate-data.ts` loads every file and exits nonzero on schema/reference failure. Print only counts and IDs; do not print private user content because these are repository fixtures.

- [ ] **Step 8: Add a small demo fixture file**

Create `json-data/demo-fixtures.json` with three clearly labeled prepared cases: one clear task scam, one wording-changed task-scam variant, and one benign short message. Store expected signal IDs/status for deterministic tests; do not present these as real reports.

- [ ] **Step 9: Run data validation and tests**

```bash
npm run validate:data
npm test -- --run tests/scam-data.test.ts
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add lib/scam-data.ts scripts/validate-data.ts json-data tests/scam-data.test.ts

git commit -m "feat: add validated scam knowledge data"
```

---

### Task 5: Implement Weighted Matching and Status Decisions

**Files:**
- Create: `lib/matching.ts`
- Test: `tests/matching.test.ts`

**Interfaces:**
- Consumes: `ScamTypeProfile[]`, evidence-backed `SignalObservation[]`, contradiction observations.
- Produces: `rankScamTypes(...) => RankedScamType[]` and `decideStatus(ranking) => AnalysisStatus`.

- [ ] **Step 1: Write failing matcher tests**

Use in-memory profiles so tests do not depend on the whole corpus. Cover normalization, missing-signal behavior, contradiction subtraction, tie/lead behavior, Strong/Possible/Insufficient thresholds, and the requirement for core/strong evidence.

Example:

```ts
it("returns strong match only with enough score and strong evidence", () => {
  const ranking = rankScamTypes({
    profiles: [jobProfile],
    presentSignals: signalObjects([
      "request_deposit_or_fee",
      "reward_or_easy_money",
      "unexpected_contact",
      "request_money_or_transfer",
    ]),
    contradictingSignals: [],
  });
  expect(decideStatus(ranking)).toBe("strong_match");
});

it("abstains when only weak context is present", () => {
  const ranking = rankScamTypes({
    profiles: [jobProfile],
    presentSignals: signalObjects(["unexpected_contact"]),
    contradictingSignals: [],
  });
  expect(decideStatus(ranking)).toBe("insufficient_evidence");
});
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
npm test -- --run tests/matching.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement normalization exactly as specified**

For each profile:

```ts
matchedWeight = sum(weights for matched evidence-backed signals)
penalty = sum(configured contradiction penalties for matched contradictions)
normalized = clamp((matchedWeight - penalty) / totalPositiveProfileWeight, 0, 1)
```

Missing signals contribute neither positive nor negative weight.

- [ ] **Step 4: Implement status rules**

Use constants:

```ts
export const STRONG_SCORE = 0.65;
export const POSSIBLE_SCORE = 0.40;
export const STRONG_LEAD = 0.10;
```

Strong requires score, evidence-strength condition, lead condition when a second profile exists, and no configured major contradiction. Possible requires score plus at least two evidence-backed signals, or one weight-4 signal plus supporting context. Otherwise return Insufficient evidence.

- [ ] **Step 5: Run matcher tests**

```bash
npm test -- --run tests/matching.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/matching.ts tests/matching.test.ts

git commit -m "feat: add explainable scam type matching"
```

---

### Task 6: Implement Documented-Example Comparison and Result Construction

**Files:**
- Create: `lib/example-comparison.ts`, `lib/result-builder.ts`
- Test: `tests/example-comparison.test.ts`, `tests/result-builder.test.ts`

**Interfaces:**
- `rankRelatedExamples(profile, examples, extraction) => RelatedExampleResult[]`.
- `buildAnalysisResult(...) => AnalysisResult`.
- Consumes matcher ranking, URL observations, selected actions, examples, uncertainties.

- [ ] **Step 1: Write failing example-comparison tests**

Verify that only examples from the selected scam type are considered, overlap score uses shared signal weights, top 1–3 are returned, and differences are generated only from structured fields.

- [ ] **Step 2: Write failing result-builder tests**

Test these rules:

```ts
it("does not expose a likely scam type for insufficient evidence", () => {
  const result = buildAnalysisResult(insufficientFixture);
  expect(result.status).toBe("insufficient_evidence");
  expect(result.likelyScamType).toBeNull();
});

it("keeps strongest evidence traceable", () => {
  const result = buildAnalysisResult(strongFixture);
  expect(result.strongestEvidence.every((x) => x.evidence.length > 0)).toBe(true);
});
```

- [ ] **Step 3: Run tests to confirm failure**

```bash
npm test -- --run tests/example-comparison.test.ts tests/result-builder.test.ts
```

- [ ] **Step 4: Implement example overlap ranking**

For each example in the selected type:

```ts
sharedWeight = sum(profile.signalWeights[id] for shared signal IDs)
exampleRepresentedWeight = sum(profile.signalWeights[id] for example.signalIds that exist in profile)
overlapScore = exampleRepresentedWeight === 0 ? 0 : sharedWeight / exampleRepresentedWeight
```

Sort descending and return at most three.

- [ ] **Step 5: Implement difference wording with deterministic templates**

Only emit differences for fields actually known. Examples:

```text
Platform differs: documented example used "WhatsApp"; submitted context says "Discord".
Claimed identity differs: documented example used "recruiter"; submitted content claims "game developer".
Requested action differs: documented example sought a deposit; submitted content asks the user to install a file.
```

Do not infer unobserved differences.

- [ ] **Step 6: Implement result construction**

The builder orders evidence by matched profile weight descending, exposes at most five strongest evidence items, copies extraction uncertainties, attaches URL observations, and returns null scam type for Insufficient evidence.

- [ ] **Step 7: Run tests and commit**

```bash
npm test -- --run tests/example-comparison.test.ts tests/result-builder.test.ts

git add lib/example-comparison.ts lib/result-builder.ts tests/example-comparison.test.ts tests/result-builder.test.ts

git commit -m "feat: compare examples and build traceable results"
```

---

### Task 7: Implement the Code-Controlled Safety Policy and Bounded AI Wording

**Files:**
- Create: `lib/action-policy.ts`, `lib/recommendation-wording.ts`
- Test: `tests/action-policy.test.ts`

**Interfaces:**
- `selectAllowedActions(signals, scamTypeId, definitions) => SafeActionDefinition[]`.
- `wordRecommendations({ allowedActions, contextSummary }) => Promise<ImmediateAction[]>`.
- If model wording fails validation, return deterministic `defaultText` from the selected definitions.

- [ ] **Step 1: Write failing action-policy tests**

Cover money, OTP, attachment, remote-access, friend-account, and suspicious-link cases. Also test that an action not triggered by evidence is not selected.

- [ ] **Step 2: Add boundary validation tests**

Mock model wording with an extra unapproved action ID and verify it is rejected and replaced with deterministic defaults.

- [ ] **Step 3: Run tests to confirm failure**

```bash
npm test -- --run tests/action-policy.test.ts
```

- [ ] **Step 4: Implement deterministic action selection**

Select actions when either `triggerSignalIds` intersects present signal IDs or `triggerScamTypeIds` contains the selected type. De-duplicate by action ID and cap at five actions.

- [ ] **Step 5: Implement the simple AI boundary contract**

The wording request may send only:

```ts
type WordingRequest = {
  contextSummary: string;
  allowedActions: Array<{ id: string; defaultText: string }>;
  boundaries: [
    "Do not invent contacts or websites.",
    "Do not ask the user to interact with the suspicious link, file, account, or payment instruction.",
    "Do not ask for passwords, OTPs, private keys, payment credentials, or remote access.",
    "Do not claim the item is definitely safe.",
    "Do not claim criminal guilt as proven fact.",
    "Return only action IDs that appear in allowedActions."
  ];
};
```

The output schema is an array of `{ id, text }`. Reject any ID not in the allowed set.

- [ ] **Step 6: Run tests and commit**

```bash
npm test -- --run tests/action-policy.test.ts

git add lib/action-policy.ts lib/recommendation-wording.ts tests/action-policy.test.ts

git commit -m "feat: enforce bounded safety recommendations"
```

---

### Task 8: Integrate Groq Structured Extraction with Retry and Offline Fixtures

**Files:**
- Create: `lib/groq.ts`
- Modify: `lib/recommendation-wording.ts` to call the shared provider helper
- Test: `tests/groq.test.ts`

**Interfaces:**
- `extractSignals({ text, image, url, platform, context }): Promise<ExtractionResult>`.
- `callGroqStructured<T>(...)` internal helper.
- Provider errors use typed errors: `ProviderTimeoutError`, `ProviderRateLimitError`, `ProviderResponseError`.

- [ ] **Step 1: Write provider tests against a mocked Groq client**

Test that the request uses `process.env.GROQ_MODEL ?? "qwen/qwen3.8-27b"`, requests JSON Schema output, validates the parsed payload through Zod, retries once on 429/5xx, and does not retry a schema-validation failure.

- [ ] **Step 2: Run tests to confirm failure**

```bash
npm test -- --run tests/groq.test.ts
```

- [ ] **Step 3: Implement the Groq client**

Use `groq-sdk` and server-only code. Build message content from available input. For images, convert the uploaded JPEG/PNG/WebP bytes to a `data:<mime>;base64,...` URL and pass it as image content. Never persist it.

Use Structured Outputs with a JSON Schema generated from Zod:

```ts
response_format: {
  type: "json_schema",
  json_schema: {
    name: "scam_signal_extraction",
    strict: true,
    schema: extractionJsonSchema,
  },
}
```

Use a low/disabled reasoning setting if supported by the configured model because the task is extraction, not long-form reasoning.

- [ ] **Step 4: Use a narrow extraction system instruction**

The instruction must state:

```text
Extract only evidence supported by the submitted content.
Use only the provided signal IDs.
Every present or contradicting signal must include evidence from text, image, URL, or user context.
Do not choose a final scam type.
Do not choose Strong/Possible/Insufficient status.
If information cannot be determined, put it in uncertainties instead of guessing.
```

- [ ] **Step 5: Implement one retry for transient failures**

Retry exactly once for provider 429 or 5xx after a short delay around 400–800 ms. Do not retry input validation failures, 4xx authentication/configuration errors, or malformed schema responses.

- [ ] **Step 6: Run provider tests**

```bash
npm test -- --run tests/groq.test.ts
```

Expected: PASS without a live API key because all unit tests mock the client.

- [ ] **Step 7: Add one manual live smoke command to README notes**

Document that a developer with `GROQ_API_KEY` can run the app and submit the prepared text fixture. Do not create a test that requires live network access in the default suite.

- [ ] **Step 8: Commit**

```bash
git add lib/groq.ts lib/recommendation-wording.ts tests/groq.test.ts

git commit -m "feat: add groq structured extraction"
```

---

### Task 9: Build the Text-Only End-to-End Vertical Slice

**Files:**
- Create: `app/api/analyze/route.ts`
- Modify: `app/page.tsx`
- Create: `components/analysis-form.tsx`, `components/analysis-result.tsx`, `components/evidence-list.tsx`, `components/safe-actions.tsx`
- Test: `tests/analyze-route.test.ts`, `tests/components/analysis-form.test.tsx`, `tests/components/analysis-result.test.tsx`

**Interfaces:**
- Produces HTTP `POST /api/analyze` returning `{ result: AnalysisResult }` on success or `{ error: { code, message } }` on failure.
- Initial live vertical slice must work with text + optional platform/context and the `job_task` profile before expanding the corpus.

- [ ] **Step 1: Write route tests with mocked extraction**

Use standard `Request` + `FormData`. Test:

```text
200: suspicious text -> result payload
400: empty input
400: invalid URL
502: provider response/schema failure
503: provider rate limit/timeout
```

Provider errors must never become `insufficient_evidence`.

- [ ] **Step 2: Write minimal component tests**

Test that the form has visible text, URL, platform, context, image controls and one Analyze button; no signup field exists. Test that the result component renders status, What to do now, Why, Likely scam type, What is different, What is uncertain, More details in that order.

- [ ] **Step 3: Run the tests to confirm failure**

```bash
npm test -- --run tests/analyze-route.test.ts tests/components/analysis-form.test.tsx tests/components/analysis-result.test.tsx
```

- [ ] **Step 4: Implement the server pipeline**

Order the route exactly:

```text
parse FormData
-> validate input
-> URL observations
-> Groq extraction
-> merge URL-derived signals with evidence-backed model signals
-> load profiles/examples/actions
-> rank types
-> decide status
-> compare related examples when status is not insufficient
-> select allowed actions
-> optional bounded wording, fallback to deterministic wording
-> build AnalysisResult
-> return JSON
```

Do not log full request content.

- [ ] **Step 5: Implement the minimum usable homepage**

The first viewport shows a compact heading, one-sentence description, the main form, privacy note, and How It Works link. Do not add marketing sections.

- [ ] **Step 6: Run the vertical-slice tests**

```bash
npm test -- --run tests/analyze-route.test.ts tests/components/analysis-form.test.tsx tests/components/analysis-result.test.tsx
npm run typecheck
npm run lint
```

- [ ] **Step 7: Perform the first live smoke test**

With a valid Groq key, submit a prepared task-scam text. Verify the page completes the entire path and that evidence shown in the UI exists in the submitted text.

- [ ] **Step 8: Commit the first complete vertical slice**

```bash
git add app components tests/analyze-route.test.ts tests/components

git commit -m "feat: complete text scam analysis vertical slice"
```

---

### Task 10: Expand the Curated Corpus to All Eight Scam Types

**Files:**
- Modify: `json-data/scam-types.json`, `json-data/examples.json`
- Create/modify: `docs/sources.md`
- Modify: `scripts/validate-data.ts`
- Test: `tests/scam-data.test.ts`, `tests/matching.test.ts`

**Interfaces:**
- Produces all eight profile IDs:
  - `compromised_friend`
  - `job_task`
  - `relationship_investment`
  - `institution_impersonation`
  - `marketplace`
  - `tech_support`
  - `professional_targeted`
  - `malicious_attachment`
- Corpus target: 3–6 documented examples for each type.

- [ ] **Step 1: Extend the data test before changing JSON**

Add assertions that all eight IDs exist, every profile has at least three positive signals, all weights are 1–4, every profile has at least one weight-4 or two weight-3 signals, every profile references only valid action IDs, and each scam type has 3–6 examples.

- [ ] **Step 2: Run validation to confirm failure**

```bash
npm run validate:data
npm test -- --run tests/scam-data.test.ts
```

Expected: FAIL because only the first profile/example exists.

- [ ] **Step 3: Curate documented sources under explicit provenance rules**

For each type, store 3–6 concise paraphrased examples. Prefer official or established security sources. Start from these verified source families and add only sources that actually describe the stored pattern:

```text
Compromised friend/account:
- FTC: https://consumer.ftc.gov/consumer-alerts/2025/05/can-you-spot-investment-scam-social-media

Job/task:
- FTC: https://consumer.ftc.gov/consumer-alerts/2025/08/how-spot-avoid-task-scams
- FTC: https://consumer.ftc.gov/consumer-alerts/2026/04/job-offer-text-probably-scam

Relationship/investment:
- FTC: https://consumer.ftc.gov/articles/what-know-about-romance-scams
- FTC: https://consumer.ftc.gov/consumer-alerts/2024/02/romance-scammers-love-take-your-money

Marketplace:
- FTC: https://consumer.ftc.gov/articles/buying-online-marketplace

Tech support/pop-up:
- FTC: https://consumer.ftc.gov/articles/how-spot-avoid-and-report-tech-support-scams

Professional-targeted:
- FBI BEC: https://www.fbi.gov/how-we-can-help-you/common-frauds-and-scams/business-email-compromise
- Microsoft fake developer interview campaign: https://www.microsoft.com/en-us/security/blog/2026/03/11/contagious-interview-malware-delivered-through-fake-developer-job-interviews/
```

For institution impersonation and malicious-attachment examples, use official government, platform, or security-vendor sources found during the curation task; record the exact URLs in `docs/sources.md` before adding their JSON records. Do not use a source merely because its title looks relevant—read enough to confirm the pattern.

Each example record must contain publisher, article title, URL, known publication date or null, and a concise paraphrase. Do not store full copied scam messages unless necessary and legally appropriate.

- [ ] **Step 4: Define transparent weights for all eight profiles**

For each profile, make the core requested action or defining social-engineering structure weight 4, recurring strong characteristics weight 3, supporting context weight 2, and platform/context clues weight 1. Do not assign weight based only on intuition when a source does not support the signal; record reasoning in `docs/sources.md` next to the profile.

- [ ] **Step 5: Add at least one deterministic contradiction only where it is genuinely useful**

Contradictions are optional. Do not manufacture negative rules for symmetry. A profile may keep `{}` if no simple reliable contradiction exists.

- [ ] **Step 6: Validate and test the full corpus**

```bash
npm run validate:data
npm test -- --run tests/scam-data.test.ts tests/matching.test.ts
```

Expected: PASS with 8 profiles and 24–48 examples.

- [ ] **Step 7: Commit corpus expansion**

```bash
git add json-data/scam-types.json json-data/examples.json docs/sources.md scripts/validate-data.ts tests/scam-data.test.ts tests/matching.test.ts

git commit -m "feat: add eight-type documented scam corpus"
```

---

### Task 11: Add Screenshot Input and Mixed-Input Analysis

**Files:**
- Modify: `components/analysis-form.tsx`, `app/api/analyze/route.ts`, `lib/groq.ts`
- Test: `tests/analyze-route.test.ts`, `tests/components/analysis-form.test.tsx`

**Interfaces:**
- Browser submits at most one image as multipart form data.
- Server validates MIME/size before conversion to Groq image content.

- [ ] **Step 1: Add failing image-input tests**

Cover valid PNG, unsupported PDF, over-5-MB image, and text + image combination.

- [ ] **Step 2: Run tests to confirm failure**

```bash
npm test -- --run tests/analyze-route.test.ts tests/components/analysis-form.test.tsx
```

- [ ] **Step 3: Implement the image control UX**

Show accepted formats and 5 MB maximum next to the input. Show selected filename and a remove control. Do not upload until Analyze is pressed.

- [ ] **Step 4: Implement server image conversion**

After validation, read the `File` into an ArrayBuffer, base64 encode in memory, and pass a data URL to Groq. Do not save to disk or object storage.

- [ ] **Step 5: Add uncertainty for unreadable image content**

If extraction reports unreadable/uncertain content, surface that in `AnalysisResult.uncertainties`. Do not turn unreadability into a technical error unless the file itself is invalid or provider processing fails.

- [ ] **Step 6: Run tests and manual screenshot smoke test**

```bash
npm test -- --run tests/analyze-route.test.ts tests/components/analysis-form.test.tsx
```

Then submit one prepared scam screenshot and verify its displayed evidence actually appears in the image.

- [ ] **Step 7: Commit**

```bash
git add components/analysis-form.tsx app/api/analyze/route.ts lib/groq.ts tests/analyze-route.test.ts tests/components/analysis-form.test.tsx

git commit -m "feat: add screenshot scam analysis"
```

---

### Task 12: Build Calibration, Holdout Evaluation, and Both Baselines

**Files:**
- Create: `types/evaluation.ts`, `json-data/evaluation-calibration.json`, `json-data/evaluation-holdout.json`
- Create: `scripts/evaluate.ts`, `scripts/baseline-rules.ts`, `scripts/baseline-llm.ts`
- Create/modify: `docs/evaluation.md`
- Test: `tests/evaluation.test.ts`

**Interfaces:**
- Calibration set: minimum 8 cases, approximately one per scam type.
- Holdout: minimum 16 cases: 8 labeled scam variants, 4 benign, 4 ambiguous/difficult.
- Produces `docs/evaluation.md` with measured metrics and known failures.

- [ ] **Step 1: Define labeled evaluation-case schema**

Create:

```ts
export type EvaluationCase = {
  id: string;
  kind: "scam" | "benign" | "ambiguous";
  expectedScamTypeId: string | null;
  expectedStatus: "strong_match" | "possible_match" | "insufficient_evidence";
  input: {
    text: string;
    url: string;
    platform: string;
    context: string;
  };
  expectedKeySignalIds: string[];
  provenance: {
    kind: "documented_variant" | "prepared" | "synthetic";
    sourceUrl: string | null;
    note: string;
  };
};
```

Screenshot cases can be represented separately in manual evaluation if storing image fixtures would add unnecessary repo size; the minimum numeric holdout may be text/URL based, with at least two additional manual screenshot checks documented.

- [ ] **Step 2: Create calibration and holdout sets before tuning thresholds**

Do not copy the exact `examples.json` text into holdout. Use paraphrased variants, changed platforms/identities, benign messages, and ambiguous messages. Label prepared/synthetic cases honestly.

- [ ] **Step 3: Implement the evaluation runner**

For each case, run the same extraction + deterministic pipeline and compute:

```text
top1ScamTypeAccuracy
correctAbstentionRate
keySignalRecall
unsupportedSignalCount
structuredOutputValidity
```

Write a timestamped JSON result under `docs/evaluation-results.json` and summarize numbers in `docs/evaluation.md`.

- [ ] **Step 4: Implement raw rules-only baseline**

`baseline-rules.ts` must use only raw text/URL and a small explicit keyword/phrase map. It must not call Groq or reuse extracted signals. Example job/task rules may check terms such as `deposit`, `commission`, `Telegram`, `WhatsApp`, `optimization`, `product boosting`, but keep the list intentionally simple and documented.

- [ ] **Step 5: Implement direct generic-LLM baseline**

Use the same Groq model with one prompt that asks it to choose one of the eight scam type IDs or `insufficient_evidence` and provide a short explanation. Do not provide the weighted profiles or structured extraction architecture.

- [ ] **Step 6: Run calibration exactly once for threshold adjustment**

Record the original values `0.65`, `0.40`, and `0.10`. If changing them improves calibration without obvious overfitting, change constants in `lib/matching.ts` once and write the before/after values and reason in `docs/evaluation.md`. After this step, freeze thresholds before holdout evaluation.

- [ ] **Step 7: Run final holdout and baselines**

```bash
npm run evaluate
```

Also run baseline scripts and store their outputs in the same evaluation results file or clearly linked JSON files.

- [ ] **Step 8: Document failures rather than hiding them**

`docs/evaluation.md` must name at least one observed failure mode, such as missed implicit money requests, overlap between recruiter scams and task scams, or an ambiguous benign message that scores too high.

- [ ] **Step 9: Add deterministic evaluation tests**

Test metric calculations with fixed fake predictions so accuracy/recall math itself is correct without calling the live API.

- [ ] **Step 10: Commit**

```bash
git add types/evaluation.ts json-data/evaluation-calibration.json json-data/evaluation-holdout.json scripts docs/evaluation.md docs/evaluation-results.json tests/evaluation.test.ts lib/matching.ts

git commit -m "test: add scam analysis evaluation and baselines"
```

---

### Task 13: Apply the Approved UX and Visual System

**Files:**
- Modify: `app/page.tsx`, `app/globals.css`
- Create/modify: `app/how-it-works/page.tsx`, `components/analysis-form.tsx`, `components/analysis-result.tsx`, `components/evidence-list.tsx`, `components/related-examples.tsx`, `components/safe-actions.tsx`
- Test: component tests plus manual checklist

**Interfaces:**
- No API contract changes.
- Result order remains exactly the approved hierarchy.

- [ ] **Step 1: Write/extend component tests for UX invariants**

Assert that the homepage immediately contains the analysis controls and does not contain `Sign up`, `Subscribe`, or newsletter controls. Assert result section ordering and that Insufficient evidence never renders a green `Safe` label.

- [ ] **Step 2: Implement the restrained dark visual system**

Use CSS custom properties in `app/globals.css` for a Discord/GitHub-like dark base, muted borders, one restrained accent color, readable body type, and a blocky system/monospace-like display treatment for headings/buttons without importing unlicensed font files.

- [ ] **Step 3: Keep the first viewport utility-first**

Homepage content order:

```text
brand / small nav
short headline
one-sentence explanation
analysis form
compact privacy warning
```

Do not add long project explanations below the heading before the tool.

- [ ] **Step 4: Implement the How It Works page**

Explain inputs, structured extraction, deterministic matching, three statuses, eight scam types, privacy limits, what the tool cannot prove, and why it does not say `Safe`. Keep it concise and user-facing.

- [ ] **Step 5: Implement result evidence presentation**

Each evidence item shows a short label, evidence snippet, and plain explanation. Related examples show publisher/source link and differences. Uncertainty is visually distinct from evidence.

- [ ] **Step 6: Run tests and manual responsive checks**

```bash
npm test -- --run tests/components
npm run typecheck
npm run lint
```

Manually verify desktop and narrow mobile widths, loading state, long evidence wrapping, preserved form input after validation errors, and keyboard focus visibility.

- [ ] **Step 7: Commit**

```bash
git add app components tests/components

git commit -m "feat: polish utility-first scam analysis ux"
```

---

### Task 14: Harden Demo Fallback, Privacy Behavior, and Final MVP Verification

**Files:**
- Modify: `app/api/analyze/route.ts`, `json-data/demo-fixtures.json`, `README.md`, `docs/evaluation.md`
- Create: `docs/demo-script.md`, `docs/manual-test-checklist.md`
- Test: full automated suite and build

**Interfaces:**
- Public endpoint never silently substitutes fixture output for live input.
- Demo fixtures are used only by an explicit developer/demo path or prerecorded presentation flow.

- [ ] **Step 1: Add route tests for provider failures and no-leak behavior**

Mock rate limit, timeout, malformed JSON, and unexpected server error. Assert error payloads contain no submitted message text and no stack traces.

- [ ] **Step 2: Finalize three demo fixtures**

Include:

```text
A. clear documented scam pattern
B. meaningfully changed variant of the same underlying type
C. benign/ambiguous case expected to abstain
```

Store expected extraction/result data and label the fixtures as prepared demo data.

- [ ] **Step 3: Write the 60-second demo script**

`docs/demo-script.md` should demonstrate:

```text
recognizable suspicious input
-> visible structured evidence
-> strong/possible/insufficient decision
-> related documented example
-> what changed
-> immediate safe action
```

The changed-variant example is the main wow moment.

- [ ] **Step 4: Create the manual test checklist**

`docs/manual-test-checklist.md` covers all Definition of Done points from the spec: text, image, URL, mixed input, all three statuses, provider failure, malformed URL, over-size image, related examples, safe-action fallback, no URL fetch, no arbitrary file input, mobile UI, no signup gate, and demo backup.

- [ ] **Step 5: Update README with architecture and setup**

Include environment setup, `npm install`, `npm run dev`, `npm test -- --run`, `npm run validate:data`, `npm run evaluate`, architecture summary, privacy warning, MVP limitations, and explicit note that Groq input handling follows the configured provider account/plan terms.

- [ ] **Step 6: Run the complete automated verification**

```bash
npm run validate:data
npm test -- --run
npm run typecheck
npm run lint
npm run build
```

Expected: every command exits successfully.

- [ ] **Step 7: Run the final manual checklist**

Complete every line in `docs/manual-test-checklist.md`. Record any accepted limitation rather than hiding it. Do not add a new core feature after this point.

- [ ] **Step 8: Confirm the builder can explain the system**

Before calling the MVP ready, the builder must be able to explain in plain language:

```text
why Groq is used only for extraction
how evidence becomes weighted signals
how Strong/Possible/Insufficient is decided
why missing evidence is not proof of safety
how related examples are ranked without embeddings
how code restricts AI safety advice
what is stored and what is not
how the evaluation differs from the corpus
why the two baselines matter
```

- [ ] **Step 9: Final commit**

```bash
git add app lib json-data README.md docs tests

git commit -m "chore: harden scam analysis mvp for demo"
```

---

## Self-Review Notes

- **Spec coverage:** Every approved subsystem is covered: input limits, URL-only analysis, controlled extraction, eight scam types, local corpus, weighted scoring, example comparison, three statuses, bounded safe actions, privacy, provider failure, demo fallback, evaluation, baselines, UX, and Definition of Done.
- **Scope:** This remains one implementation plan because every task contributes to one end-to-end product loop rather than independent products.
- **Type consistency:** Public contracts are created in Task 1 and reused by later tasks; signal IDs are centralized in Task 2; data references are validated in Task 4/10.
- **No hidden advanced subsystem:** No database, vector search, RAG, platform integration, malware execution, or separate Python backend enters the plan.
- **Vertical slice:** A complete text path exists by Task 9 before the corpus, screenshot support, evaluation expansion, or UI polish.
