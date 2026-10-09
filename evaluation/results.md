# ForgeHacks Evaluation

## Setup

- Date: 2026-10-09
- Model: qwen/qwen3.8-27b
- 16 synthetic holdout cases
- 8 scam / 4 benign / 4 ambiguous
- Same eight scam categories as production

## Hybrid System

- Exact scam-type correct: 6/8
- Scam detected/non-abstained: 6/8
- Benign + ambiguous abstained: 8/8
- Overall correct decisions: 14/16
- Schema/provider failures: 0
- Unsupported observations removed by grounding: 0
- Cases with grounding removals: 0

## Rules-Only Baseline

- Exact scam-type correct: 8/8
- Scam detected/non-abstained: 8/8
- Benign + ambiguous abstained: 8/8
- Overall correct decisions: 16/16
- Schema/provider failures: 0

## Direct LLM Baseline

- Exact scam-type correct: 1/8
- Scam detected/non-abstained: 1/8
- Benign + ambiguous abstained: 8/8
- Overall correct decisions: 9/16
- Schema/provider failures: 0

## Per-Case Results

| Case | Expected | Hybrid | Rules | Direct LLM | Pass/fail |
| --- | --- | --- | --- | --- | --- |
| scam-compromised-friend | compromised_friend | compromised_friend (possible_match) | compromised_friend | abstain | H:pass R:pass L:fail |
| scam-job-task | job_task | job_task (possible_match) | job_task | abstain | H:pass R:pass L:fail |
| scam-relationship-investment | relationship_investment | relationship_investment (possible_match) | relationship_investment | abstain | H:pass R:pass L:fail |
| scam-institution-impersonation | institution_impersonation | institution_impersonation (strong_match) | institution_impersonation | abstain | H:pass R:pass L:fail |
| scam-marketplace | marketplace | marketplace (strong_match) | marketplace | abstain | H:pass R:pass L:fail |
| scam-tech-support | tech_support | tech_support (strong_match) | tech_support | tech_support | H:pass R:pass L:pass |
| scam-professional-targeted | professional_targeted | abstain (top: compromised_friend) | professional_targeted | abstain | H:fail R:pass L:fail |
| scam-malicious-attachment | malicious_attachment | abstain (top: compromised_friend) | malicious_attachment | abstain | H:fail R:pass L:fail |
| benign-dinner-plans | abstain | abstain (top: compromised_friend) | abstain | abstain | H:pass R:pass L:pass |
| benign-interview-scheduling | abstain | abstain (top: professional_targeted) | abstain | abstain | H:pass R:pass L:pass |
| benign-bank-statement | abstain | abstain (top: compromised_friend) | abstain | abstain | H:pass R:pass L:pass |
| benign-marketplace-pickup | abstain | abstain (top: compromised_friend) | abstain | abstain | H:pass R:pass L:pass |
| ambiguous-invoice-review | abstain | abstain (top: compromised_friend) | abstain | abstain | H:pass R:pass L:pass |
| ambiguous-account-support | abstain | abstain (top: compromised_friend) | abstain | abstain | H:pass R:pass L:pass |
| ambiguous-crypto-interest | abstain | abstain (top: compromised_friend) | abstain | abstain | H:pass R:pass L:pass |
| ambiguous-recruiter-interest | abstain | abstain (top: compromised_friend) | abstain | abstain | H:pass R:pass L:pass |

## Interpretation

- rules-only produced more correct decisions than hybrid (16/16 vs 14/16).
- Hybrid produced more correct decisions than direct LLM (14/16 vs 9/16).
- Hybrid and rules-only both abstained on 8/8 benign or ambiguous cases.
- Hybrid missed: scam-professional-targeted, scam-malicious-attachment.

This is a small synthetic hackathon evaluation, not a production benchmark.
