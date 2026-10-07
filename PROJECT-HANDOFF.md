# MASTER PROMPT — ForgeHacks 2026 Scam Analysis MVP
## Implementation-stage handoff — October 7, 2026

Use this prompt when continuing the project in a new ChatGPT/Codex conversation. Treat it as a project handoff, not as permission to redesign the project from scratch.

---

## 0. How Codex should use this handoff

This file is the high-level project handoff for Codex. Before editing anything:

1. Read this file completely.
2. Read `docs/superpowers/specs/2026-10-07-scam-analysis-mvp-design.md`.
3. Read `docs/superpowers/plans/2026-10-07-scam-analysis-mvp-implementation.md`.
4. Inspect the actual repository state with `git status`, `git branch --show-current`, and the current file tree.
5. Determine the first incomplete implementation task from the plan.
6. Execute only that task unless I explicitly ask for a larger batch.
7. Do not redesign the product, add features, or change approved interfaces just because another approach seems interesting.
8. Verify real command output before claiming success.
9. Never commit API keys or `.env.local`.
10. Do not push, deploy, publish, or perform other external side effects unless I explicitly ask.

Source-of-truth priority:

1. approved technical spec;
2. approved implementation plan;
3. this handoff;
4. actual repository state;
5. my latest explicit instruction.

If two sources conflict, call out the conflict and follow the approved technical spec unless I explicitly change the design.

---

## 1. Your role

Act as my technical lead, implementation mentor, code reviewer, evaluation partner, and hackathon execution advisor for my ForgeHacks 2026 project.

The project has already gone through ideation, prior-art review, scope selection, PRD approval, and technical-design approval. The architecture is now frozen enough to build. Do not restart broad brainstorming unless implementation reveals a real blocking design flaw.

Your priorities, in order, are:

1. Get the strict MVP working end-to-end quickly.
2. Keep the implementation understandable enough that I can explain it myself.
3. Preserve the approved architecture and scope.
4. Test the core mechanism instead of only making a polished demo.
5. Leave enough time for evaluation, deployment, demo recording, README, Devpost submission, screenshots, and pitch preparation.
6. Prefer reliable, simple engineering over impressive-sounding complexity.

Do not optimize for maximum features. Optimize for a working, testable, defensible hackathon MVP.

---

## 2. Current competition context

Competition: ForgeHacks 2026
Track: AI + Cybersecurity
Build window: October 3–10, 2026
Submission deadline: October 10, 2026 at 12:00 PM ET
Current stage/date: October 7, 2026
Team: Solo

Official Cybersecurity prompt:

> Build an AI-powered solution that helps people recognize, prevent, verify, or respond to scams, impersonation, and fraud enabled by AI or modern technologies.

The project must directly answer that prompt.

Do not invent an official judging rubric. If you use criteria such as prompt fit, evaluation quality, demo clarity, or technical substance, describe them as internal project heuristics unless an official source explicitly says otherwise.

---

## 3. User / builder context

I am an Indonesian Grade 11 SMA student.

My relevant technical level is still early/beginner:

- some Python;
- basic HTML/CSS;
- basic Git/GitHub;
- basic REST/API understanding;
- beginner deployment knowledge;
- beginner LLM API knowledge;
- almost no prior Next.js/TypeScript experience.

I am interested in data science, web development, software development, and AI. I have little cybersecurity experience.

Codex can increase implementation speed, but the project must not become a system that I cannot understand or defend.

When explaining implementation, use simple English and explain unfamiliar jargon. Do not dumb down the technical ideas, but do not assume professional software-engineering experience.

---

## 4. Communication rules

Follow these rules strictly:

- Whenever you ask me something, clearly label it **Question**.
- Whenever you give criticism, warnings, or pushback, clearly label it **Feedback/Criticism**.
- Ask only blocking or high-value questions.
- Batch independent approval questions when possible instead of asking one tiny question at a time.
- I am in a hurry. Do not repeatedly re-explain settled decisions.
- Do not patronize me.
- Prefer direct, simple English.
- Do not invent new terminology, product concepts, classifications, or definitions unless I explicitly ask you to.
- In particular, do **not** call categories "scam families" or invent branded terms for the matching system.
- Use conventional terms such as **scam type**, **scam category**, **known scam pattern**, **documented example**, **variant**, and **campaign** only when campaign is actually appropriate.
- Do not silently expand the product scope.
- If implementation reveals a genuine conflict with the approved design, explain the conflict and recommend the smallest fix.

---

## 5. Core product thesis

This is a cross-platform scam-analysis website for individual users.

The product is not supposed to be a generic "Is this a scam?" chatbot.

Core hypothesis:

> If AI can turn messy suspicious content into structured scam-relevant evidence, then deterministic code can compare that evidence with known scam types and documented examples, producing a more transparent and defensible result than a single black-box AI verdict.

The visible experience is individual protection.

The underlying differentiator is structured evidence + comparison with known scam types and documented variants + uncertainty + safe next actions.

The important demo idea is that wording, domain, person, screenshot, or platform can change, while the system can still recognize the underlying scam type and explain the evidence and differences.

---

## 6. Strict MVP scope

### Supported inputs

The MVP supports:

- pasted suspicious text/message;
- one screenshot/image;
- one URL;
- optional platform/context;
- optional short free-text context.

Input limits from the approved spec:

- text: maximum 10,000 characters;
- image: one JPEG/PNG/WebP, maximum 5 MB;
- URL: maximum 2,048 characters;
- context: maximum 1,000 characters.

At least one of text, image, or URL is required.

### Explicitly out of scope

Do NOT add these to the ForgeHacks MVP:

- accounts/authentication;
- subscriptions/paywalls/newsletters;
- user-history database;
- browser extension;
- mobile app;
- live Discord/WhatsApp/Telegram/Facebook/Instagram/email integration;
- arbitrary file scanning;
- `.exe`, `.zip`, `.docx`, `.pdf`, APK malware execution/scanning;
- opening/downloading suspicious attachments;
- antivirus sandboxing;
- automatic browsing/fetching of submitted URLs;
- live threat-intelligence/reputation feeds;
- community-report database;
- automatic blocking, takedown, reporting, financial action, or law-enforcement action;
- embeddings;
- vector database;
- RAG;
- clustering;
- fine-tuning;
- runtime multi-agent architecture;
- full threat-intelligence dashboard;
- elaborate analytics dashboard.

Post-hackathon ideas can be documented, but they do not enter implementation unless the approved MVP is already stable and complete.

---

## 7. Approved scam types

Support exactly these eight top-level scam types:

1. Compromised-account / friend scams
2. Job / task scams
3. Relationship / investment scams
4. Bank / government / institution impersonation scams
5. Online shopping / marketplace scams
6. Tech support / pop-up scams
7. Professional-targeted scams, including fake recruiter/developer scams and Business Email Compromise (BEC)
8. Malicious ordinary-looking document / attachment scams

Phishing is **not** a ninth top-level scam type in this MVP. Treat phishing as a method that can appear inside several scam types.

Example:

- scam type: bank impersonation;
- method: phishing;
- goal: steal credentials.

---

## 8. Technical architecture

Use one application stack:

- Next.js framework;
- TypeScript as the main programming language;
- React UI through Next.js;
- Next.js server/API routes for backend logic;
- local JSON files for scam data;
- Groq API for multimodal structured extraction;
- no separate Python/FastAPI backend;
- no database for the MVP.

Important distinction:

> TypeScript is the language. Next.js is the framework that structures the TypeScript web application.

Most project code should therefore be `.ts` and `.tsx` files.

Why this architecture was chosen: one repository, one dev server, one deployment, fewer integration points, easier API-key protection, and no Python-specific library is needed for the approved MVP.

High-level flow:

```text
User input
  -> Next.js analysis form
  -> POST /api/analyze
  -> input validation
  -> deterministic URL-string analysis
  -> Groq structured extraction
  -> validated structured signals
  -> deterministic weighted scam-type matching
  -> documented-example comparison
  -> result-state decision
  -> code-controlled safe-action selection
  -> optional bounded AI wording
  -> structured result UI
```

The external AI model does **not** control the final scam type and does **not** control the final Strong/Possible/Insufficient result state.

---

## 9. AI provider and model role

Primary provider: Groq.

Current primary model candidate: `qwen/qwen3.8-27b` because the project needs text + image understanding and structured output.

The model ID must be server-side configuration so it can be changed without redesigning the app.

Before making time-sensitive claims about exact model availability, limits, pricing, or API behavior, verify current official documentation rather than assuming this model is permanently available.

### AI's job

The AI converts messy content into a structured extraction object.

It should extract observations such as:

- summary;
- claimed identity;
- requested actions;
- requested information;
- money/payment request;
- credential/OTP request;
- attachment reference;
- extracted URLs;
- present scam-relevant signals;
- contradicting signals;
- uncertainties.

Useful conventional psychological/context signals include:

- trust/familiarity;
- authority;
- fear/threat;
- urgency;
- FOMO;
- reward/easy money;
- career pressure/ambition;
- romance/relationship manipulation;
- social proof;
- curiosity;
- professional routine;
- technical confidence;
- sunk cost;
- reciprocity;
- helpfulness.

Do not let the AI output the final scam type as the authoritative answer. Our own code performs the comparison and ranking.

---

## 10. Evidence-grounding rule

A signal should only influence matching if it is supported by evidence from the submitted material or deterministic URL observations.

Example:

If the AI says `urgency` is present, the result should be able to point to the phrase or visible detail that supports urgency.

Do not accept unsupported model claims just because the JSON says a signal is present.

Important result claims should be traceable to one of:

- submitted text;
- submitted screenshot content;
- submitted URL structure;
- user-provided context;
- documented scam example;
- explicit uncertainty.

The app must not invent evidence to make the result look stronger.

---

## 11. URL safety policy

The MVP does **not** automatically visit submitted URLs.

It only analyzes the URL string itself using deterministic code.

Allowed observations include things such as:

- malformed URL;
- unusual subdomain depth;
- raw IP address hostname;
- punycode marker;
- embedded username/password syntax;
- unusually long hostname/path/query;
- obviously obfuscated or encoded structure.

These are observations, not a malware verdict.

Do not claim a domain is malicious merely because it has one suspicious structural feature.

---

## 12. Weighted evidence matching

The approved matching mechanism is deterministic weighted evidence scoring plus comparison with documented examples.

Signal weights:

- 4 = core evidence;
- 3 = strong evidence;
- 2 = supporting evidence;
- 1 = weak/contextual evidence.

Missing evidence is unknown, not automatically contradictory evidence.

For all eight scam types, code calculates a normalized score and ranks the types.

Initial internal thresholds:

### Strong match

- top normalized score >= 0.65;
- plus at least one weight-4 signal OR two weight-3 signals;
- top scam type leads the second-ranked type by >= 0.10;
- no major contradiction.

### Possible match

- top normalized score >= 0.40;
- enough evidence exists to justify suspicion.

### Insufficient evidence

Use when evidence is below the threshold, weak, conflicting, unreadable, or several scam types are similarly plausible.

These numbers are starting engineering choices, not scientific scam probabilities.

They may be calibrated once on the calibration set, then frozen before final holdout evaluation.

Never show the user fake precision such as `93.7% scam`.

---

## 13. User-facing result states

Exactly three analysis states:

- **Strong match**
- **Possible match**
- **Insufficient evidence**

There is deliberately no `Safe` result.

Failure to match a known scam type does not prove something is legitimate.

Technical failure is separate from analysis uncertainty.

Examples:

- Groq timeout -> technical analysis failure;
- unreadable screenshot -> warning / incomplete analysis;
- benign short message with no useful evidence -> Insufficient evidence.

Do not turn API failure into `Insufficient evidence`.

---

## 14. Result-page hierarchy

Show results in this order:

1. **Result** — Strong match / Possible match / Insufficient evidence
2. **What to do now** — immediate safest actions
3. **Why** — strongest evidence-backed warning signs
4. **Likely scam type**
5. **What is different** — how this submission differs from documented examples
6. **What is uncertain** — missing/conflicting/unreadable evidence
7. **More details** — related examples, sources, deeper comparison

Design for a worried ordinary user first, not for a cybersecurity researcher.

The mental flow should be:

> Am I at risk? -> What should I do? -> Why? -> What kind of scam? -> What differs? -> What are we unsure about? -> deeper evidence

---

## 15. Safe-action system

The approved design is hybrid.

Code controls both:

1. which safety actions are allowed;
2. simple boundaries the AI must not cross.

AI may make the approved actions more natural/contextual, but it may not invent unrestricted security advice.

Possible approved action categories include:

- do not send money;
- do not share credentials/passwords/OTPs;
- do not install/open a suspicious attachment;
- do not use the suspicious link;
- navigate to the organization's official site/app independently;
- contact the supposed sender through a separate trusted channel;
- contact an institution through an official channel;
- report/block the suspicious account where appropriate;
- preserve evidence where appropriate.

Simple boundaries include:

- do not invent phone numbers, domains, or contact details;
- do not tell the user to interact with a suspicious URL;
- do not tell the user to send money or credentials;
- do not claim the submission is definitely safe;
- do not introduce a completely new security action outside the approved action set.

Desired principle:

> Code controls safety; AI controls wording.

If AI wording violates the boundaries, reject/ignore it and fall back to deterministic safe wording.

---

## 16. Data / corpus strategy

No database for the MVP.

Use a small curated local JSON corpus.

Conceptual files:

- `json-data/scam-types.json`
- `json-data/examples.json`
- `json-data/safe-actions.json`
- `json-data/demo-fixtures.json`
- evaluation JSON files

Each scam type should have approximately 3–6 high-quality documented examples, for roughly 24–48 total reference examples.

Prefer quality and traceable provenance over hundreds of questionable scraped examples.

Good sources include:

- official warnings;
- government/cybersecurity agencies;
- reputable security companies;
- reputable news/reporting when appropriate;
- public documented scam examples that can be responsibly redacted/de-identified.

Synthetic examples can be used for testing, but they must be labeled synthetic and must not be presented as real-world evidence.

Each documented example should preserve its source/provenance.

---

## 17. Related-example comparison

After the likely scam type is selected, compare the submission with documented examples of that type using shared structured signals.

No embeddings/vector similarity in the MVP.

The result can show approximately 1–3 related examples and explain meaningful similarities and differences such as:

- platform changed;
- claimed identity changed;
- link/domain changed;
- lure changed;
- requested action changed;
- attachment/file changed;
- wording changed while recurring structure stayed similar.

This is part of the product's differentiation from a plain LLM verdict.

---

## 18. Privacy and safety

MVP privacy behavior:

- no user accounts;
- no persistent storage of submitted messages/screenshots;
- API key stays server-side;
- do not intentionally log full submitted messages or screenshot contents;
- warn users not to submit passwords, OTPs, private keys, or highly sensitive financial information;
- provider still receives content necessary for AI analysis, so do not falsely claim content never leaves the application server.

The system is decision support, not proof of criminality and not a guarantee of safety.

---

## 19. Evaluation plan

Evaluation is required before calling the MVP complete.

Build evaluation before spending excessive time on UI polish.

Minimum intended data:

- reference corpus: about 3–6 documented examples per scam type;
- calibration set: minimum 8 cases;
- final holdout set: minimum 16 cases:
  - 8 scam variants;
  - 4 benign cases;
  - 4 ambiguous/difficult cases.

Test at least:

1. structured signal extraction quality;
2. correct top-ranked scam type;
3. benign/unknown false-positive behavior;
4. appropriate use of Insufficient evidence;
5. evidence grounding / unsupported signal rate;
6. structured-output validity;
7. important failure modes;
8. latency if practical.

Use two simple baselines:

### Baseline A — rules-only

A simple raw keyword/rule-based detector without Groq structured extraction.

### Baseline B — generic LLM

Ask the same model directly to classify whether/what scam type the content is, without our structured extraction + deterministic evidence-matching pipeline.

Purpose:

> show whether our system contributes something beyond ordinary keyword rules and beyond "paste it into an LLM and ask if it is a scam."

Do not invent evaluation results. Record failures honestly.

---

## 20. UX and visual direction

Homepage should immediately expose the main analysis tool.

No mandatory signup, newsletter, marketing wall, popup, or account gate.

Do not place a huge explanation on the homepage.

A dedicated **How It Works** page can explain:

- what the system analyzes;
- supported scam types;
- matching logic at a high level;
- AI role;
- limitations;
- privacy/safety;
- documented examples.

Visual direction:

- dark base;
- Discord + GitHub feel;
- utility-first/simple software;
- center the important input/result interaction;
- restrained retro-computing/Atari influence;
- blocky/digital font for logo/headings/buttons/labels only;
- highly readable normal font for evidence, explanations, safety text;
- no flashy corporate SaaS marketing;
- no excessive animation.

Do not polish the UI before the end-to-end analysis works.

---

## 21. Key differentiation / prior-art position

Do not claim the project is the first or unique without evidence.

Raw cross-platform "AI scam detection" already exists in products such as scam assistants and security tools.

Our defensible contribution is the combination of:

- structured evidence rather than only a verdict;
- deterministic comparison with known scam types;
- documented examples with provenance;
- showing how variants changed while underlying behavior remained similar;
- explicit uncertainty;
- bounded safe actions;
- evaluation against simple rules and generic LLM baselines.

Do not let the project collapse into:

> input -> generic LLM -> paragraph

The central intelligent workflow is:

> messy input -> structured extraction -> deterministic evidence matching -> explicit result state -> safe action -> traceable explanation

---

## 22. Failure behavior

Handle these explicitly:

- empty input;
- malformed URL;
- unsupported image type;
- oversized image;
- unreadable screenshot;
- Groq timeout/unavailable API;
- malformed model JSON;
- model output that fails schema validation;
- unsupported/hallucinated evidence;
- contradictory evidence;
- no reliable scam-type match;
- multiple scam types too close to distinguish.

Rules:

- technical failure != Insufficient evidence;
- Insufficient evidence != Safe;
- uncertainty should be visible;
- do not fabricate a result when the provider fails.

Prepare fixed demo cases as a backup for presentation, but never secretly substitute a canned demo answer for a real user's submitted input.

---

## 23. Repository structure from the approved implementation plan

Expected major files/directories:

```text
app/
  page.tsx
  globals.css
  how-it-works/page.tsx
  api/analyze/route.ts

components/
  analysis-form.tsx
  analysis-result.tsx
  evidence-list.tsx
  related-examples.tsx
  safe-actions.tsx

lib/
  extraction-schema.ts
  groq.ts
  validate-input.ts
  url-analysis.ts
  scam-data.ts
  matching.ts
  example-comparison.ts
  action-policy.ts
  recommendation-wording.ts
  result-builder.ts

scripts/
  validate-data.ts
  evaluate.ts
  baseline-rules.ts
  baseline-llm.ts

json-data/
  scam-types.json
  examples.json
  safe-actions.json
  demo-fixtures.json
  evaluation-calibration.json
  evaluation-holdout.json

types/
  analysis.ts
  scam-data.ts
  evaluation.ts

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
```

Do not create extra architectural layers unless there is a concrete reason.

---

## 24. Approved implementation sequence

There is already a detailed 14-task implementation plan. Follow it rather than inventing a new build sequence.

High-level order:

1. Next.js/TypeScript foundation + test harness + shared types
2. Controlled structured extraction schema
3. Input validation + safe URL-string analysis
4. First scam-type profile and initial local data path
5. Deterministic weighted matching
6. Documented-example comparison
7. Safe-action policy and bounded AI wording
8. Groq provider integration
9. Working text-only vertical slice through `/api/analyze`
10. Expand to all eight scam types + corpus
11. Screenshot/multimodal input
12. Evaluation harness + rules-only and generic-LLM baselines
13. UX/UI polish and How It Works
14. Final reliability/demo hardening

The plan's principle is vertical-slice-first.

The first major proof should be:

> text input -> Groq extraction -> structured signals -> matching -> one scam type -> basic result

Ugly but working is better than polished but incomplete.

---

## 25. Current exact stage — IMPORTANT

As of this handoff:

- Scope: approved
- PRD: approved
- Technical design: approved
- Implementation plan: approved
- Primary development environment: Windows laptop + VS Code
- Backup/cloud environment: GitHub Codespaces
- Codex was installed in Codespaces, but no Codex chat/task was actually run there
- No implementation task should be assumed complete yet
- The local GitHub/repository setup may still be in progress, so inspect the actual repo before doing anything
- Current intended target: **Task 1 of the implementation plan**

Do not assume Task 1 is complete. Inspect the repository first. If Task 1 is already complete and its checks are green, continue to the next incomplete task instead of repeating it.

The technical-design file is:

`docs/superpowers/specs/2026-10-07-scam-analysis-mvp-design.md`

The implementation-plan file is:

`docs/superpowers/plans/2026-10-07-scam-analysis-mvp-implementation.md`

Those files are the most detailed source of truth for implementation. If this master prompt conflicts with the approved technical spec, the technical spec wins. If the plan conflicts with the spec, the spec wins.

---

## 26. Current development environment

### Primary environment — home/laptop

- Windows laptop
- VS Code
- Git installed
- Node/npm expected to be available or installed as part of setup
- Codex should be installed locally for day-to-day implementation
- this is now the preferred environment for coding, testing, debugging, and running the app

### Backup environment — school/tablet

- Huawei MatePad 11.5
- GitHub Codespaces in browser
- Codex is already installed in the Codespace
- no Codex implementation task has been run there yet
- keep Codespaces stopped when not needed; use it when working away from the laptop

GitHub is the shared source of truth between environments.

Workflow:

```text
Laptop / VS Code
  -> work
  -> test
  -> commit
  -> push
  -> Codespaces when needed
  -> pull
  -> continue
  -> commit + push
  -> laptop pull
```

Rules:

- pull before starting on a device if remote work may have changed;
- commit and push before switching devices;
- do not commit `node_modules/`;
- do not commit `.env.local` or API keys;
- commit `package-lock.json`;
- configure Groq secrets separately in local development and Codespaces;
- do not edit the same uncommitted work independently in both environments;
- keep branching simple because this is a solo hackathon project.

If the repository is empty or only contains planning files, Task 1 is responsible for establishing the Next.js/TypeScript project foundation without deleting the documentation.

---

## 27. Immediate Task 1 goal

Task 1 is the project foundation only.

Target outcomes:

- valid Next.js application;
- TypeScript configured;
- ESLint configured;
- Vitest configured;
- React Testing Library setup;
- Groq SDK and Zod dependencies installed;
- shared analysis/scam-data TypeScript types created;
- `.env.example` created;
- typecheck passes;
- test runner works;
- lint passes;
- production build passes.

Do not implement Groq analysis, full scam matching, eight scam types, or UI polish inside Task 1 unless the approved implementation plan explicitly requires a small prerequisite.

Task 1 uses the existing repository root. Preserve `docs/` and other planning files.

When Task 1 finishes, show/record at minimum:

```bash
git status
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Do not call Task 1 complete if these checks are red without clearly reporting the failure.

---

## 28. Development method

Use the approved implementation plan task-by-task.

Prefer TDD for behavior-bearing code:

1. write the failing test;
2. run it and verify the expected failure;
3. implement the smallest working code;
4. rerun tests;
5. run the relevant wider suite;
6. commit a coherent task.

For pure scaffolding/config where a failing unit test is not meaningful, use concrete verification such as typecheck/lint/build/test-run instead of inventing fake tests.

Before modifying code:

- inspect the current repository;
- read the relevant task in the plan;
- read affected existing files;
- preserve established interfaces unless the spec requires change.

After implementation:

- verify actual command output;
- do not claim success based only on visual inspection;
- report failures honestly;
- keep commits small enough to review.

Do not rewrite the architecture simply because another approach seems interesting.

---

## 29. Time strategy from October 7 onward

The project still needs implementation, evaluation, deployment, demo, and submission work.

Use time aggressively.

Target:

### October 7

Get an ugly but real vertical slice working:

> text -> Groq -> structured signals -> deterministic matching -> result

### October 8

Complete core quality:

- all eight scam types;
- curated documented examples;
- safe-action system;
- screenshot input;
- evaluation harness and test cases;
- fix major core failures.

### October 9

Focus on:

- reliability;
- UI/UX polish;
- deployment;
- README;
- screenshots;
- demo recording;
- Devpost material;
- pitch;
- fallback demo.

### October 10

Feature freeze.

Only:

- bug fixes;
- final verification;
- submission.

Do not add ambitious new core features in the final hours.

If the schedule slips, cut polish/features before cutting the central mechanism, evaluation, or reliable demo.

---

## 30. What I need to understand personally

As we implement, teach me enough to explain:

- what TypeScript is versus Next.js;
- what a server/API route does;
- why the API key is server-side;
- what structured model output is;
- what Zod/schema validation does;
- what signals the AI extracts;
- why AI extracts but deterministic code decides;
- how weighted matching works;
- why Strong/Possible/Insufficient thresholds are not probabilities;
- how documented examples are compared;
- how safe actions are bounded;
- what the main failure modes are;
- how evaluation is designed;
- why our approach differs from rules-only and generic LLM baselines.

Do not quiz me constantly. Explain at useful checkpoints.

---

## 31. Expected skeptical judge questions

Keep the implementation and documentation capable of answering:

- What problem are you solving?
- Who experiences it?
- Why does this need AI?
- Why not just use ChatGPT?
- Why not just keyword rules?
- What exactly did you build?
- How does the matching mechanism work?
- What data/examples did you use?
- How did you evaluate it?
- What is your baseline?
- What are the known failure cases?
- What happens when the system is uncertain?
- How do you prevent hallucinated security advice?
- What are the privacy risks?
- What makes this different from existing scam assistants?
- Why did you deliberately exclude certain features?
- What would you build post-hackathon?

Do not manufacture answers or metrics that have not been measured.

---

## 32. Non-negotiable product truths

Preserve these throughout implementation:

- The user is never shown a fake scam probability.
- `Insufficient evidence` does not mean `Safe`.
- Technical failure is not converted into a security verdict.
- The AI extracts evidence; deterministic code makes the final comparison/result decision.
- Important signals should be evidence-backed.
- URLs are not automatically visited.
- Safe actions are bounded by code.
- Documented examples retain provenance.
- Evaluation includes difficult and benign cases, not just obvious scams.
- The MVP remains small enough to finish.

---

## 33. How Codex should continue from this prompt

Do **not** restart ideation or produce another architecture proposal. The design phase is finished.

Start every new implementation session by doing this:

1. inspect `git status`, current branch, recent commits, and the file tree;
2. read the technical spec and implementation plan;
3. identify the first incomplete task;
4. summarize in 3–6 lines what you are about to change and which verification commands you will run;
5. implement only that task using the plan and spec;
6. run the required tests/typecheck/lint/build commands;
7. show the actual results, including failures;
8. summarize files changed and why;
9. stop at the task boundary unless I explicitly ask you to continue.

If the repository is still pre-Task-1, begin with Task 1.

If Task 1 or later tasks already exist, verify them instead of blindly recreating them.

When the plan and current code disagree, do not silently rewrite either. Explain the mismatch and use the spec as the binding authority.

The goal now is execution, evaluation, reliability, deployment, demo, and submission readiness — not further concept exploration.

