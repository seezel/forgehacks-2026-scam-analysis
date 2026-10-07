---
doc: technical-design
status: proposed-for-user-review
date: 2026-10-07
project: ForgeHacks 2026 Scam Analysis MVP
track: AI + Cybersecurity
---

# ForgeHacks 2026 Scam Analysis MVP — Technical Design

## 1. Purpose

This document turns the approved PRD into a buildable MVP design. It is intentionally narrow: one useful scam-analysis workflow, one cloud multimodal model, a small curated corpus, explainable matching, honest uncertainty, and no unnecessary infrastructure.

Official ForgeHacks AI + Cybersecurity prompt:

> Build an AI-powered solution that helps people recognize, prevent, verify, or respond to scams, impersonation, and fraud enabled by AI or modern technologies.

The MVP addresses that prompt by helping a person submit suspicious online content, extracting scam-relevant evidence from that content, comparing it with documented scam types and examples, explaining the match and uncertainty, and giving bounded safe next actions.

## 2. Product Thesis

The product is not a generic "is this a scam?" chatbot. Its core hypothesis is:

> If AI can reliably turn messy suspicious content into structured scam signals, then simple explainable code can compare those signals with documented scam types and variants, giving users a more transparent and defensible result than a single black-box scam verdict.

The visible user experience is individual protection. The intelligence underneath is comparison with known scam types and documented variants.

## 3. Strict MVP Boundary

### Included

- one web application;
- pasted text/message input;
- one screenshot/image input;
- one URL input;
- optional platform/context input;
- Groq-hosted Qwen multimodal model for structured signal extraction;
- deterministic URL parsing and validation;
- weighted evidence scoring across eight scam types;
- comparison with a small local corpus of documented examples;
- three analysis outcomes: Strong match, Possible match, Insufficient evidence;
- traceable evidence for important findings;
- safe-action selection controlled by code, with AI allowed to phrase only approved actions inside simple boundaries;
- an optional How It Works page;
- a small deeper-details section showing related documented examples and how the submitted variant differs;
- evaluation against held-out test cases and simple baselines.

### Explicitly excluded

- user accounts or authentication;
- subscriptions, newsletters, paywalls, or signup gates;
- live Discord, WhatsApp, Telegram, Facebook, Instagram, marketplace, or email integrations;
- arbitrary file upload or malware scanning;
- execution, downloading, opening, or sandboxing of suspicious attachments;
- automatic browsing of submitted URLs;
- live threat-intelligence feeds or domain-reputation APIs;
- browser extensions;
- automatic blocking, reporting, takedowns, financial actions, or law-enforcement actions;
- community-report databases;
- embeddings, vector databases, RAG, clustering, or fine-tuning;
- multi-agent runtime architecture;
- full moderator/threat-intelligence dashboards;
- claims that an item is definitely safe or definitely criminal.

Post-hackathon features may be documented, but they must not enter the ForgeHacks build unless the approved MVP is already complete and stable.

## 4. Technology Stack

### Application

- **Framework:** Next.js
- **Language:** TypeScript
- **UI:** React through Next.js
- **Server logic:** Next.js server/API routes written in TypeScript
- **Data storage:** local JSON files committed with the project
- **External AI:** Groq API
- **Primary model candidate:** `qwen/qwen3.8-27b`
- **Model configuration:** the model ID is read from a server-side environment variable so a deprecated/unavailable model can be replaced without changing the analysis architecture.

Next.js is the framework; TypeScript is the main programming language. The MVP does not use a separate Python backend because no approved feature requires Python-specific data-science or machine-learning libraries.

### Why one application

A single Next.js application reduces deployment and debugging risk. The browser UI and server-side analysis logic live in one repository and one deployable application. The Groq API key exists only on the server side.

The architecture must not depend on a specific hosting vendor. A single serverless Next.js host is sufficient.

## 5. High-Level Architecture

```text
User
  |
  | text / screenshot / URL / context
  v
Homepage analysis form
  |
  v
POST /api/analyze
  |
  +--> input validation
  |
  +--> deterministic URL parsing
  |
  +--> Groq multimodal structured extraction
  |       |
  |       v
  |   structured scam signals
  |
  +--> weighted scam-type matching
  |
  +--> documented-example comparison
  |
  +--> result-status decision
  |
  +--> safe-action policy
  |       |
  |       +--> allowed action IDs
  |       +--> simple AI boundaries
  |       +--> optional AI wording
  |
  v
Structured AnalysisResult
  |
  v
Result UI
  |
  +--> result status
  +--> what to do now
  +--> why
  +--> likely scam type
  +--> what changed
  +--> what is uncertain
  +--> related documented examples / sources
```

The external model does **not** decide the final scam type or the final Strong/Possible/Insufficient status. Its primary responsibility is structured extraction from messy human content.

## 6. User Flow

### Homepage

The homepage opens directly to the analysis tool. There is no account wall, marketing gate, newsletter prompt, or disruptive popup.

The first screen contains only:

- short headline;
- one short supporting sentence;
- input controls;
- platform/context control;
- one Analyze action;
- compact privacy/safety warning;
- small navigation links such as How It Works.

Long explanations belong on `/how-it-works`.

### Submission

The user may provide any combination of the approved inputs, but at least one of text, screenshot, or URL is required.

The user may optionally select a platform/context such as:

- Discord;
- WhatsApp;
- Telegram;
- Facebook;
- Instagram;
- email;
- marketplace;
- website;
- SMS;
- other / unknown.

The platform is contextual evidence, never proof of a scam by itself.

### Result hierarchy

The result UI follows the approved order:

1. **Result** — Strong match / Possible match / Insufficient evidence;
2. **What to do now** — immediate safe action;
3. **Why** — strongest evidence-backed warning signals;
4. **Likely scam type** — when evidence supports one;
5. **What is different** — meaningful differences from related documented examples;
6. **What is uncertain** — missing, conflicting, or unreadable evidence;
7. **More details** — related examples, source links, and deeper comparison.

The product does not show a fake precision percentage such as "93.7% scam."

## 7. Input Contract and Validation

`POST /api/analyze` accepts multipart form data so text fields and one image can be submitted together.

### Supported inputs

- `text`: optional string, maximum 10,000 characters;
- `image`: optional, maximum one image, JPEG/PNG/WebP, maximum 5 MB;
- `url`: optional string, maximum 2,048 characters;
- `platform`: optional enum/string from the approved platform list;
- `context`: optional short free-text context, maximum 1,000 characters.

At least one of `text`, `image`, or `url` must be present.

### Rejected inputs

- empty submissions;
- unsupported image formats;
- images over 5 MB;
- malformed URLs;
- arbitrary documents or executable files;
- multiple screenshot uploads in one analysis.

The UI must explain the rejection and preserve the other valid user inputs so the user can correct the problem without starting over.

## 8. URL Handling

Submitted URLs are **not automatically visited** by the MVP.

The server uses ordinary parsing to inspect only information already present in the URL string. Safe deterministic checks may include:

- valid `http` or `https` scheme;
- hostname and subdomain structure;
- raw IP address used as hostname;
- punycode / internationalized hostname marker;
- embedded username/password syntax;
- unusual hostname length or excessive subdomain depth;
- unusually long path/query structure;
- clearly encoded or obfuscated URL structure.

These checks are evidence, not a malware verdict. The system must not claim that a domain is malicious merely because one structural warning is present.

The MVP does not maintain an organization-to-official-domain registry, so it must not make unsupported claims that a domain is an impersonation domain unless the evidence is explicit in the submitted content or corpus.

## 9. AI Signal Extraction

### Model responsibility

The Groq-hosted multimodal model converts the submitted material into a strict structured object. It may read text and screenshots and interpret the user-provided context. It should not output the final scam type or final result status.

Use JSON Schema / structured output support so the server receives predictable fields. The server still validates the response itself and does not assume every provider/model combination guarantees strict schema decoding.

### Structured extraction object

The model output is conceptually:

```text
ExtractionResult
- summary
- claimedIdentity
- requestedActions[]
- requestedInformation[]
- moneyRequest
- credentialRequest
- attachmentReference
- extractedUrls[]
- presentSignals[]
- contradictingSignals[]
- uncertainties[]
```

### Signal observation

Each signal observation contains:

```text
SignalObservation
- id: standard signal identifier
- evidence: short exact or near-exact evidence from submitted content
- source: text | image | url | context
- explanation: short plain-language interpretation
```

Evidence is required for a signal to count toward matching. If the model cannot point to supporting material, that signal is ignored by the scoring layer.

### Standard signal vocabulary

The MVP uses a controlled vocabulary so the scoring code can remain deterministic. The vocabulary should cover only signals needed by the eight approved scam types. The initial set is:

- `unexpected_contact`
- `claimed_authority_or_institution`
- `claimed_friend_or_known_contact`
- `claimed_recruiter_or_employer`
- `claimed_seller_or_buyer`
- `claimed_tech_support`
- `urgency_pressure`
- `fear_or_threat`
- `reward_or_easy_money`
- `relationship_or_romance_trust`
- `career_opportunity_pressure`
- `authority_pressure`
- `sunk_cost_pressure`
- `request_money_or_transfer`
- `request_deposit_or_fee`
- `request_credentials`
- `request_otp_or_security_code`
- `request_download_or_install`
- `request_remote_access`
- `request_move_to_other_platform`
- `off_platform_payment_request`
- `investment_or_profit_claim`
- `small_initial_payout`
- `account_compromise_claim`
- `device_infection_claim`
- `suspicious_link_present`
- `login_or_credential_capture_link`
- `ordinary_looking_attachment_used_as_lure`
- `professional_workflow_or_invoice_request`

This list may be reduced during implementation if a signal is not used by any approved scam type. It must not be expanded merely to make the system appear sophisticated.

### Unknowns

The model should be allowed to say it cannot determine:

- who the sender really is;
- whether a URL is malicious;
- whether an account is genuinely compromised;
- whether a payment has actually occurred;
- whether a claim is true;
- text that is unreadable in an image.

Unknown information remains unknown; the model must not fill gaps with invented facts.

## 10. Eight Scam Types

The local corpus covers these approved top-level scam types:

1. compromised-account / friend scams;
2. job / task scams;
3. relationship / investment scams;
4. bank / government / institution impersonation scams;
5. online shopping / marketplace scams;
6. tech support / pop-up scams;
7. professional-targeted scams, including fake recruiter/developer scams and business email compromise (BEC);
8. malicious ordinary-looking document / attachment scams.

Phishing is treated as a method that may appear within several scam types, not as a ninth top-level type.

## 11. Local Data Model

No database is used for the ForgeHacks MVP.

### `data/scam-types.json`

Each scam type contains:

```text
ScamTypeProfile
- id
- name
- shortDescription
- recurringStructure
- signalWeights{}
- contradictionPenalties{}
- safeActionIds[]
```

Signal weights use a four-level integer scale:

- `4` = core signal;
- `3` = strong signal;
- `2` = supporting signal;
- `1` = weak/contextual signal.

This scale keeps the scoring explainable to the user and judges.

### `data/examples.json`

Each documented example contains:

```text
DocumentedExample
- id
- scamTypeId
- title
- shortParaphrase
- platform
- claimedIdentity
- requestedActions[]
- signalIds[]
- source
    - organizationOrPublisher
    - title
    - url
    - publishedDate (when known)
- notes
```

The corpus target is **3–6 documented examples per scam type**.

Use provenance-traceable material. Prefer official warnings, reputable security organizations, established news/research sources, and responsibly de-identified public examples. Store concise paraphrases rather than unnecessary full copies of copyrighted or personally identifying messages.

### `data/safe-actions.json`

Contains the approved safety actions and their default deterministic wording.

### `data/demo-fixtures.json`

Contains a very small set of preselected demo cases and expected/precomputed outputs for testing and presentation backup. These fixtures must be clearly treated as demo/test data and never silently substituted for arbitrary live user submissions.

## 12. Weighted Scam-Type Matching

### Goal

The scoring layer converts evidence-backed signals into an explainable ranking across the eight scam types.

### Score calculation

For each scam type:

1. load the profile's positive signal weights;
2. add the weight for every profile signal that appears in the evidence-backed extracted signals;
3. subtract configured contradiction penalties for evidence that clearly conflicts with the profile;
4. divide the resulting positive score by the total positive signal weight in the profile;
5. clamp the normalized score to `0.0–1.0`.

Signals that are simply missing are treated as unknown, not as contradictions.

A platform match may contribute only low supporting weight; platform alone can never create a Strong match.

### Initial status rules

These are initial transparent thresholds that must be frozen before final holdout evaluation:

**Strong match**

- top normalized score `>= 0.65`;
- at least one matched signal with weight `4` or at least two matched signals with weight `3`;
- top score leads the second-best score by at least `0.10`;
- no major contradiction that would make the label misleading.

**Possible match**

- top normalized score `>= 0.40`;
- at least two evidence-backed signals, or one core signal with supporting context;
- evidence is not strong enough or unique enough for Strong match.

**Insufficient evidence**

- top score `< 0.40`; or
- there is only weak contextual evidence; or
- several scam types remain similarly plausible; or
- evidence is unreadable, missing, or contradictory enough that a type label would be misleading.

The internal normalized score is for ranking and evaluation. It is not displayed as a percentage of scam certainty.

Thresholds may be adjusted **once during calibration** using a small calibration set. After adjustment, they are frozen before the final holdout evaluation. Any changed values must be recorded in the evaluation notes.

## 13. Documented-Example Comparison

After selecting the top scam type candidate, the system compares the submission with examples belonging to that type.

No embeddings are used.

For each example:

1. find the intersection between the submission's evidence-backed signal IDs and the example's signal IDs;
2. sum the scam-type profile weights for those shared signals;
3. divide by the total profile weight represented by the example's signals;
4. use the result only to rank examples within the selected type.

The UI may show the top 1–3 related examples.

### Shared evidence

The result lists important signals present in both the submission and a related documented example.

### What changed

The result compares structured fields and surfaces differences such as:

- platform changed;
- claimed identity changed;
- requested action changed;
- domain/link changed;
- lure/reward changed;
- attachment type/name changed;
- wording changed while the underlying request stayed similar.

Only differences supported by structured fields or explicit evidence are shown.

## 14. Result Construction and Traceability

Every important result statement must trace back to one of:

- evidence from the user's submission;
- a deterministic URL observation;
- a documented corpus example;
- an explicit unknown/uncertainty statement.

The system must not create untraceable warning signs merely to make the result look more complete.

### Result object

```text
AnalysisResult
- status: strong_match | possible_match | insufficient_evidence
- likelyScamType: ScamTypeSummary | null
- immediateActions[]
- strongestEvidence[]
- relatedExamples[]
- differences[]
- uncertainties[]
- urlObservations[]
- technicalWarnings[]
```

A technical failure does not produce an `AnalysisResult`; it produces an error response.

## 15. Safe-Action Policy

### Principle

**Code controls safety; AI may control wording.**

The server selects a small set of approved action IDs based on extracted signals and the matched scam type. It also passes simple boundaries to the model. The model may phrase those approved actions in context, but it may not invent new security actions outside the allowed set.

### Example approved action IDs

- `do_not_send_money`
- `do_not_share_credentials`
- `do_not_share_otp`
- `do_not_open_or_install_attachment`
- `do_not_use_provided_link`
- `verify_via_official_channel`
- `contact_person_via_separate_trusted_channel`
- `use_official_app_or_site_directly`
- `stop_remote_access_session`
- `report_or_block_on_platform`
- `contact_financial_institution_via_official_channel`

Only actions relevant to the detected evidence are selected.

### Simple AI boundaries

The recommendation-generation prompt must explicitly prohibit the model from:

- inventing phone numbers, email addresses, websites, or official contacts;
- telling the user to interact with a suspicious link, account, file, or payment instruction;
- asking the user to provide passwords, OTPs, private keys, payment credentials, or remote access;
- claiming that an item is definitely safe;
- claiming criminal guilt as a proven fact;
- inventing a new action that is not present in the allowed action list;
- claiming that an authority, bank, platform, or company has verified something when it has not.

### Output validation and fallback

The AI recommendation output must reference only the provided allowed action IDs. If it violates the action list, fails schema validation, or times out, the UI uses deterministic default wording from `safe-actions.json` instead.

This makes AI wording optional rather than a single point of safety failure.

## 16. Privacy and Data Handling

- no accounts;
- no persistent database of user submissions;
- submitted content exists only long enough to process the request in the application runtime;
- Groq API key is server-side only;
- logs must not intentionally record full submitted messages or screenshot contents;
- errors may log request IDs and technical metadata, not sensitive content;
- the UI warns users not to submit passwords, OTPs, private keys, payment credentials, or highly sensitive personal information;
- curated examples must be public, responsibly de-identified, or intentionally prepared for testing;
- screenshots in the curated corpus should be redacted when personal identifiers are not necessary.

The ForgeHacks MVP is not positioned as a privacy-certified production security service.

## 17. Failure and Uncertainty Behavior

### Analysis outcomes

Only three user-facing analysis outcomes exist:

- **Strong match**
- **Possible match**
- **Insufficient evidence**

There is no "Safe" or "Verified legitimate" status.

### Technical failures

Technical errors are separate from analysis outcomes. Examples:

- invalid or empty input;
- unreadable/unsupported image;
- Groq timeout;
- Groq rate limit;
- malformed structured model response;
- unexpected server error.

The UI must say that analysis could not be completed. It must never convert a provider failure into "Insufficient evidence" or "Safe."

### Partial readability

If the model reports unreadable image content or missing context, the result includes the uncertainty visibly. The system may still return a match only if enough independent evidence remains.

## 18. Provider Reliability and Demo Fallback

### Live behavior

The primary model call uses Groq with the configured model ID. Provider errors return a clear technical error.

One automatic retry is allowed only for transient provider failures such as HTTP 429 or 5xx responses. The retry uses a short delay and does not occur for validation errors.

### Demo fallback

The repository contains several fixed demo fixtures, for example:

- one clear documented scam example;
- one changed variant of the same underlying scam type;
- one benign/ambiguous example.

A prerecorded or deterministic demonstration may use these fixtures if the external API is unavailable during judging. The fallback must be clearly understood by the builder as a demo backup, not fake live analysis.

The public analysis endpoint never silently replaces an arbitrary user submission with a fixture result.

## 19. Evaluation Design

Evaluation is built before heavy UI polish.

### Data splits

**Reference corpus**

- 3–6 documented examples per scam type;
- used to define profiles and show related examples;
- not counted as holdout evaluation cases.

**Calibration set**

- minimum 8 cases, approximately one per scam type;
- used only to adjust score weights/thresholds once;
- threshold changes are recorded.

**Final holdout set**

Minimum 16 cases not copied from the reference corpus:

- 8 scam variants: at least one per scam type;
- 4 benign/non-scam cases;
- 4 ambiguous or deliberately difficult cases.

A larger holdout set is a stretch goal only after the minimum evaluation runs successfully.

### Primary metrics

1. **Top-1 scam-type accuracy** on holdout cases that have a labeled scam type.
2. **Correct abstention rate** on benign/ambiguous cases where the expected behavior is Insufficient evidence.
3. **Key-signal recall**: proportion of manually expected important signals successfully extracted.
4. **Unsupported-signal count**: extracted/scored signals that are not supported by the submission.
5. **Structured-output validity**: percentage of model responses that pass the JSON/schema validation path.

Latency may be recorded as an operational metric but is not the main product claim.

### Baseline A: rules-only raw text

A simple baseline scans raw text/URL content for a small keyword/phrase list and applies basic rules without AI signal extraction.

Purpose: test whether the AI extraction step provides value when wording changes or evidence appears in screenshots/context.

### Baseline B: direct generic LLM classification

Use the same cloud model with a simple prompt that directly chooses a scam type/status and provides a short explanation, without the structured extraction + deterministic scoring architecture.

Purpose: test whether the project's structured pipeline offers better consistency, abstention, traceability, or evaluation behavior than a generic one-prompt wrapper.

### Reporting

The final presentation reports measured results honestly, including failures. Synthetic or prepared examples must be labeled as such and not presented as real-world evidence.

## 20. Testing Strategy

### Unit tests

Test deterministic functions independently:

- input validation;
- URL parsing;
- weighted score calculation;
- status threshold logic;
- example-overlap ranking;
- action selection;
- AI-boundary validation;
- result construction.

### Fixture tests

Use fixed extraction objects to test matching without calling Groq. This lets the core decision logic remain testable even when the API is offline.

### Integration tests

Test the server analysis route with:

- normal text case;
- image case;
- URL case;
- mixed text + URL + context case;
- benign case;
- ambiguous case;
- simulated provider error;
- malformed provider output.

### Manual UI checks

Verify:

- homepage main action is immediately visible;
- no signup or popup blocks usage;
- loading state is clear;
- errors preserve user input where possible;
- result hierarchy follows the approved order;
- mobile layout remains usable;
- long evidence text wraps correctly;
- body text remains readable despite retro styling.

## 21. Proposed Repository Structure

```text
forgehacks-scam-analysis/
|
+-- app/
|   +-- page.tsx                    # homepage + analysis/result state
|   +-- how-it-works/
|   |   +-- page.tsx
|   +-- api/
|       +-- analyze/
|           +-- route.ts            # POST analysis endpoint
|
+-- components/
|   +-- analysis-form.tsx
|   +-- analysis-result.tsx
|   +-- evidence-list.tsx
|   +-- related-examples.tsx
|   +-- safe-actions.tsx
|
+-- lib/
|   +-- groq.ts                     # model call + structured extraction
|   +-- extraction-schema.ts        # structured-output schema
|   +-- validate-input.ts
|   +-- url-analysis.ts
|   +-- matching.ts                 # weighted evidence scoring
|   +-- example-comparison.ts
|   +-- action-policy.ts
|   +-- recommendation-wording.ts
|   +-- result-builder.ts
|
+-- data/
|   +-- scam-types.json
|   +-- examples.json
|   +-- safe-actions.json
|   +-- demo-fixtures.json
|
+-- types/
|   +-- analysis.ts
|   +-- scam-data.ts
|
+-- tests/
|   +-- matching.test.ts
|   +-- url-analysis.test.ts
|   +-- action-policy.test.ts
|   +-- result-builder.test.ts
|   +-- fixtures/
|
+-- docs/
    +-- evaluation.md
    +-- sources.md
```

The exact filenames may be adjusted to normal Next.js conventions during implementation, but responsibilities must remain separated. No single file should contain the entire analysis pipeline.

## 22. Visual Design Constraints

The UI is utility-first, not marketing-first.

- dark interface inspired by the restrained feel of Discord/GitHub;
- centered primary analysis controls similar in directness to VirusTotal/QRCode Monkey;
- restrained retro-computing influence inspired by Atarimania;
- blocky/digital display font only for short headings, labels, buttons, or branding;
- readable modern body font for explanations and evidence;
- visible panel boundaries and clear hierarchy;
- no excessive animations;
- no giant marketing hero sections;
- no ads, newsletter popups, account prompts, or artificial one-use restrictions.

Accessibility and readability override decorative retro styling.

## 23. Security and Abuse Boundaries

This is a defensive analysis tool.

The MVP must not:

- fetch or execute malware;
- open arbitrary submitted links server-side;
- provide instructions for evading platform/security defenses;
- generate phishing content or scam scripts as part of normal product behavior;
- expose the Groq API key to the browser;
- store user secrets intentionally;
- claim that a structural URL warning proves maliciousness.

User-submitted content is treated as untrusted input and never executed as code or HTML.

## 24. Technical Debt Intentionally Accepted

The ForgeHacks MVP consciously accepts:

- JSON files instead of a database;
- no user history or persistence;
- manually curated scam profiles and weights;
- a small fixed signal vocabulary;
- no live reputation enrichment;
- no automatic corpus updates;
- one primary AI provider;
- no multi-language-specific UI or translation layer;
- simple local examples instead of a large threat-intelligence graph.

These choices are deliberate scope control, not accidental omissions.

## 25. Post-Hackathon Opportunities

Only after the MVP is stable, a portfolio version could consider:

- larger verified corpus;
- embeddings for semantic similarity;
- clustering/report aggregation for evolving scam campaigns;
- live threat-intelligence enrichment;
- browser extension;
- platform integrations;
- community reporting and moderator workflow;
- persistent history and accounts;
- richer multilingual evaluation;
- Python/data-science service if larger-scale analysis justifies it.

None of these are dependencies for the ForgeHacks submission.

## 26. Build Order Constraint

Implementation must follow a vertical-slice-first strategy:

1. text input;
2. server route;
3. one structured Groq extraction;
4. one scam profile + deterministic match;
5. minimal result UI;
6. tests for that path;
7. expand to all eight scam types;
8. screenshot input;
9. URL analysis;
10. safe-action policy;
11. documented-example comparison;
12. evaluation harness and baselines;
13. UI polish and How It Works page;
14. demo/submission hardening.

Do not start with authentication, elaborate visual polish, a large corpus, or secondary dashboards.

## 27. Definition of Done for the MVP

The ForgeHacks MVP is considered technically complete when:

- a user can submit text, one screenshot, or a URL with optional context;
- Groq returns schema-valid structured scam signals for normal test inputs;
- deterministic code ranks the eight scam types using weighted evidence;
- the app can return Strong match, Possible match, or Insufficient evidence without using a fake percentage;
- important result claims show traceable supporting evidence;
- the result can show related documented examples and at least one meaningful difference for a changed variant;
- safe actions are selected by code, AI wording is bounded, and deterministic action wording is available as fallback;
- technical failures are not confused with safe/unknown results;
- no arbitrary file is opened or executed and no submitted URL is automatically visited;
- the minimum holdout evaluation and both baselines have been run and recorded;
- at least one failure mode is documented honestly;
- the homepage is immediately usable without signup or intrusive popups;
- the demo has a live path and fixed backup fixtures;
- the builder can explain the input flow, AI extraction, scoring logic, uncertainty behavior, safety boundaries, and evaluation method.

## 28. Final Architecture Decision Summary

Approved architecture:

> **Next.js + TypeScript web app → Groq/Qwen structured multimodal extraction → deterministic URL observations → weighted scam-type scoring → documented-example overlap comparison → code-controlled safety actions with bounded AI wording → traceable result UI.**

The MVP intentionally does **not** use embeddings, RAG, vector databases, a separate Python service, a persistent database, arbitrary malware/file analysis, or live platform integrations.
