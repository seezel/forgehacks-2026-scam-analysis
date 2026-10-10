# Project name

Scam Analysis

# One-line summary

Scam Analysis extracts grounded warning signs from suspicious messages, screenshots, and links, then matches them against eight documented scam patterns.

# Inspiration

Scam messages can change their wording, identity, platform, and appearance while keeping the same underlying behavior. I wanted to test whether an AI model could help extract those behaviors without giving the model sole control over the final classification.

# What it does

Scam Analysis accepts suspicious text, screenshots or images, URL strings, and optional context. It returns one of three statuses: Strong match, Possible match, or Insufficient evidence. The result shows supported warning signs, immediate safety actions, a likely scam type when justified, differences, uncertainties, and related documented examples.

The tool intentionally avoids labeling content as safe. When the submitted evidence does not support a stronger conclusion, it abstains with Insufficient evidence.

# How I built it

The application uses Next.js 16, React, and TypeScript. A Groq-hosted Qwen model extracts observations into a Zod-controlled schema. TypeScript code grounds each observation in the submitted text, context, URL string, or visible image content. A deterministic weighted matcher then compares the grounded signals with eight local scam profiles, selects the final status, and adds documented-example context and deterministic safety actions.

The project stores scam profiles, 16 documented examples, and safety actions in local JSON. It does not use a database, vector database, RAG pipeline, multi-agent runtime, automatic URL fetching, or malware execution. Vercel hosts the deployed application.

# Challenges I ran into

- Stabilizing structured LLM output so downstream code receives only approved signal identifiers.
- Avoiding duplicate retries when Groq returns a rate-limit response.
- Grounding extracted observations in the submitted evidence instead of trusting unsupported model output.
- Distinguishing scam types that share urgency, payment, identity, or download signals.
- Adding screenshot analysis without expanding the product into arbitrary file scanning.
- Keeping the result honest when the available evidence is insufficient.

# Accomplishments that I'm proud of

- Working analysis for text, screenshots, URL strings, and combined inputs.
- Eight controlled scam types and 16 documented examples from the FTC, FBI Internet Crime Complaint Center, CISA, and GitHub Security.
- Deterministic evidence-based classification after AI extraction.
- Explicit abstention instead of labeling low-evidence submissions as safe.
- A reproducible evaluation against rules-only and direct LLM baselines.
- 122 automated tests across 14 files.

# What I learned

Separating AI extraction from deterministic decisions made the system easier to inspect and test. Evidence grounding matters because a valid schema does not guarantee that every extracted observation is supported. I also learned that uncertainty needs its own product state, and that baseline comparisons are more useful when their limitations and better results remain visible.

# What's next

- Evaluate on a broader and more varied set of real-world examples.
- Improve extraction for professional-targeted and malicious-attachment cases.
- Expand the documented-example corpus.
- Strengthen grounding for evidence found in images.
- Explore optional safety-action personalization while keeping deterministic safety controls.

# Built with

- Next.js
- React
- TypeScript
- Groq
- Qwen
- Zod
- Vitest
- Testing Library
- Vercel

# Evaluation

The evaluation contains 16 synthetic holdout cases: 8 scam, 4 benign, and 4 ambiguous.

| System | Correct scam type | Non-scam abstention | Overall |
| --- | ---: | ---: | ---: |
| Hybrid | 6/8 | 8/8 | 14/16 |
| Rules-only | 8/8 | 8/8 | 16/16 |
| Direct LLM | 1/8 | 8/8 | 9/16 |

The hybrid system substantially outperformed direct generic LLM classification on this set and abstained on every benign and ambiguous case. The rules-only baseline scored perfectly on the deliberately small, keyword-clear synthetic set. The hybrid missed the professional-targeted and malicious-attachment cases because structured extraction returned no supported signals for those inputs.

This is a small synthetic hackathon evaluation, not a production benchmark.

# Links

- Live app: `LIVE_DEMO_URL_HERE`
- GitHub: https://github.com/seezel/forgehacks-2026-scam-analysis
- Demo video: `DEMO_VIDEO_URL_HERE`

# Demo checklist

- [ ] Live app URL inserted: `LIVE_DEMO_URL_HERE`
- [x] GitHub URL inserted: https://github.com/seezel/forgehacks-2026-scam-analysis
- [ ] Public 2 to 4 minute demo video URL inserted: `DEMO_VIDEO_URL_HERE`
- [ ] Screenshots uploaded
- [ ] Submission text proofread
- [x] Correct track selected: AI + Cybersecurity
- [ ] Final submission submitted before the deadline
