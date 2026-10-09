# Scam Analysis Demo Script

Target duration: approximately 2 to 3 minutes.

## 0:00-0:20 | Problem

Scam messages rarely stay identical. A scammer can change the wording, identity, platform, link, or screenshot while asking for the same risky action. That makes a simple keyword check fragile, and a generic AI verdict can be difficult to verify.

## 0:20-0:40 | Product

*[Show the homepage.]*

This is Scam Analysis. It accepts suspicious messages, screenshots, and links. Instead of asking AI to make a final verdict immediately, the app extracts specific warning signs that it can support with evidence from the submission.

## 0:40-1:20 | Text demo

For a clear example, I will paste this institution impersonation message:

> Bank Security: Your account will be frozen today. Verify it now at https://bank-check.example and enter your password and one-time code. Do not call the number on your card.

The result leads with the status and safest immediate actions. It identifies institution impersonation as the likely scam type and shows the strongest evidence, including the urgent account threat, credential request, and supplied login link. The result also includes a documented example so the user can compare the submitted message with a real scam pattern.

## 1:20-1:50 | Screenshot demo

The same form also accepts JPEG, PNG, and WebP images. I will upload the screenshot that already passed the live deployment check. The model reads the visible content, extracts supported warning signs, and sends them through the same grounding and matching pipeline. The application does not claim to perform antivirus scanning or execute anything from the image.

## 1:50-2:15 | Architecture

Groq, using Qwen, extracts structured warning signs. Deterministic TypeScript code then checks that evidence against the submission and compares it with eight known scam profiles. The model does not directly decide the final classification. The code chooses Strong match, Possible match, or Insufficient evidence from the grounded scores.

## 2:15-2:35 | Evaluation

On a small 16-case synthetic evaluation, the hybrid system made 14 out of 16 correct decisions. A direct generic LLM made 9 out of 16, while a simple rules baseline made 16 out of 16. The rules benefited from keyword-clear synthetic cases. The hybrid approach also provides grounded explanations, documented-example context, and explicit uncertainty rather than only a label.

This is a small synthetic hackathon evaluation, not a production benchmark.

## 2:35-end | Close

The goal is not to claim that something is automatically safe. Scam Analysis gives users supported evidence, clear uncertainty, and safer next steps so they can make a better-informed decision.
