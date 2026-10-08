"use client";

import { FormEvent, useRef, useState } from "react";
import { AnalysisResult } from "@/components/analysis-result";
import type { AnalysisResult as AnalysisResultData } from "@/types/analysis";

type ErrorPayload = { error?: { message?: string } };
type SuccessPayload = { result: AnalysisResultData };

export function AnalysisForm() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalysisResultData | null>(null);
  const submissionPending = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionPending.current) {
      return;
    }

    submissionPending.current = true;
    setSubmitting(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const body = (await response.json()) as SuccessPayload | ErrorPayload;

      if (!response.ok) {
        const message =
          "error" in body && body.error?.message
            ? body.error.message
            : "Analysis failed. Please try again.";
        throw new Error(message);
      }

      if (!("result" in body)) {
        throw new Error("Analysis returned an unreadable response.");
      }

      setResult(body.result);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Analysis failed. Please try again.",
      );
    } finally {
      submissionPending.current = false;
      setSubmitting(false);
    }
  }

  return (
    <>
      <form
        className="analysis-form"
        aria-label="Scam analysis"
        onSubmit={handleSubmit}
      >
        <label htmlFor="text">Suspicious text</label>
        <textarea
          id="text"
          name="text"
          rows={9}
          maxLength={10_000}
          placeholder="Paste the message or offer here"
        />

        <label htmlFor="url">URL</label>
        <input
          id="url"
          name="url"
          type="url"
          maxLength={2_048}
          placeholder="https://example.com"
        />

        <label htmlFor="platform">Platform</label>
        <select id="platform" name="platform" defaultValue="">
          <option value="">Select a platform</option>
          <option>Discord</option>
          <option>WhatsApp</option>
          <option>Telegram</option>
          <option>Email</option>
          <option>Marketplace</option>
          <option>Website</option>
          <option>SMS</option>
          <option>Other / unknown</option>
        </select>

        <label htmlFor="context">Context</label>
        <textarea
          id="context"
          name="context"
          rows={3}
          maxLength={1_000}
          placeholder="How did you receive it? What happened before this?"
        />

        <p className="privacy-note">
          Submitted content is sent to Groq for analysis and this app does not
          intentionally store submissions. Do not submit passwords, one-time
          codes, private keys, or highly sensitive financial credentials.
        </p>

        <button type="submit" disabled={submitting}>
          {submitting ? "Analyzing…" : "Analyze"}
        </button>
        {error ? <p role="alert">{error}</p> : null}
      </form>

      {result ? <AnalysisResult result={result} /> : null}
    </>
  );
}
