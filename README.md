# Scam Analysis

An AI-assisted scam analysis tool that extracts structured warning signs from messages, screenshots, and links, then compares them with known scam patterns and documented examples.

- Live demo: `https://forgehacks-2026-scam-analysis-pzyn.vercel.app/`
- Source: [GitHub repository](https://github.com/seezel/forgehacks-2026-scam-analysis)

## What it does

Users can submit suspicious text, a screenshot or image, a URL, or a combination of inputs. A Groq-hosted model extracts observations into a controlled schema. The application then grounds those observations in the submitted content, applies deterministic weighted matching across eight scam types, and compares the result with documented examples.

The result includes:

- Strong match
- Possible match
- Insufficient evidence
- The strongest supported evidence
- A likely scam type when the evidence supports one
- Differences, uncertainties, documented examples, and deterministic safety actions

Scam Analysis intentionally does not label content as “safe.” Insufficient evidence means the tool cannot support a stronger conclusion from the submitted content.

## Why I built it

Modern scam messages can change their wording, identity, platform, and appearance while preserving the same underlying behavior. Instead of asking an LLM to make the final scam decision directly, Scam Analysis separates AI extraction from deterministic evidence-based matching. This makes the reasoning visible and allows the application to abstain when the evidence is weak.

## Supported inputs

- Text or message content
- Screenshot or image in JPEG, PNG, or WebP format, up to 5 MB
- URL string
- Optional platform and context

URLs are analyzed as submitted strings. The application does not automatically visit or fetch submitted URLs.

## Scam types

- Compromised-account / friend scam
- Job / task scam
- Relationship / investment scam
- Bank / government / institution impersonation scam
- Online shopping / marketplace scam
- Tech support / pop-up scam
- Professional-targeted scam
- Malicious document / attachment scam

## How it works

```text
Input
→ validation
→ structured AI signal extraction
→ evidence grounding
→ deterministic weighted matching
→ documented-example comparison
→ safe actions + explanation
```

1. **Validation** checks input types, lengths, image formats, and image size.
2. **AI extraction** asks the configured Groq model for observations from a controlled warning-sign vocabulary.
3. **Evidence grounding** removes unsupported observations that cannot be mapped back to the submitted text, context, URL string, or visible image content.
4. **Weighted matching** scores the grounded signals against eight local scam profiles.
5. **Example comparison** adds context from documented scam examples related to the leading profile.
6. **Result building** selects deterministic actions and explains the evidence, differences, and uncertainty.

AI extracts observations. It does not directly choose the final Strong match, Possible match, or Insufficient evidence status.

## Architecture

| Area | Implementation |
| --- | --- |
| Frontend and API | Next.js 16, React, TypeScript |
| AI | Groq with `qwen/qwen3.8-27b` |
| Validation and schemas | Zod |
| Matching | Deterministic TypeScript weighted scoring |
| Data | Local JSON scam profiles, documented examples, and safety actions |
| Deployment | Vercel |

The project does not use a database, vector database, RAG pipeline, multi-agent runtime, automatic URL fetching, or malware execution.

## Evidence and safety design

- Text and context evidence must map back to the submitted content.
- URL observations come from the submitted URL string.
- Image observations come from visible image content.
- The grounding step removes extracted observations that the submitted evidence does not support.
- The only statuses are Strong match, Possible match, and Insufficient evidence.
- Insufficient evidence does not mean safe.

## Evaluation

The evaluation uses 16 synthetic holdout cases: 8 scam cases, 4 benign cases, and 4 ambiguous cases.

| System | Correct scam type | Non-scam abstention | Overall |
| --- | ---: | ---: | ---: |
| Hybrid | 6/8 | 8/8 | 14/16 |
| Rules-only | 8/8 | 8/8 | 16/16 |
| Direct LLM | 1/8 | 8/8 | 9/16 |

On this small set, the hybrid system substantially outperformed direct generic LLM classification and abstained on every benign and ambiguous case. The rules-only baseline scored 16/16 because the synthetic cases were deliberately small and keyword-clear. The hybrid system missed the professional-targeted and malicious-attachment cases because structured extraction returned no supported signals for those inputs.

See the [detailed evaluation results](evaluation/results.md).

This is a small synthetic hackathon evaluation, not a production benchmark.

## Privacy and limitations

- The application has no user accounts and does not intentionally store submissions permanently.
- Submitted content is sent to Groq for analysis.
- Users should not submit passwords, one-time passwords, private keys, or highly sensitive financial credentials.
- The application does not block, report, or take financial action automatically.
- It does not execute malware, perform file antivirus scanning, or use live reputation services.
- A result provides decision support. It is not proof that content is legitimate or fraudulent.

## Running locally

Install dependencies:

```bash
npm install
```

Create a repository-root `.env.local` file:

```dotenv
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=qwen/qwen3.8-27b
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Run the project checks:

```bash
npm run test:run
npm run typecheck
npm run lint
npm run build
```

## Testing

The current verified suite contains 122 passing tests across 14 files. It covers schemas, input validation, evidence grounding, matching, result construction, API behavior, component behavior, data integrity, and deterministic evaluation logic.

## Hackathon

- ForgeHacks 2026
- Track: AI + Cybersecurity
- Team project
