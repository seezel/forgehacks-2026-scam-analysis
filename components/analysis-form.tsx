"use client";

import { FormEvent, useRef, useState } from "react";
import { AnalysisResult } from "@/components/analysis-result";
import type { AnalysisResult as AnalysisResultData } from "@/types/analysis";

type ErrorPayload = { error?: { message?: string } };
type SuccessPayload = { result: AnalysisResultData };

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function AnalysisForm() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalysisResultData | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const submissionPending = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionPending.current) {
      return;
    }

    if (selectedImage && selectedImage.size > MAX_IMAGE_BYTES) {
      setError("Image must be 5 MB or smaller.");
      setResult(null);
      return;
    }

    if (selectedImage && !IMAGE_TYPES.has(selectedImage.type)) {
      setError("Image must be a JPEG, PNG, or WebP file.");
      setResult(null);
      return;
    }

    submissionPending.current = true;
    setSubmitting(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData(event.currentTarget);
      if (selectedImage) {
        formData.set("image", selectedImage);
      }

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
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
        <div className="form-intro">
          <p className="section-label">Scanner</p>
          <h2>Submit suspicious content</h2>
          <p>
            Add any combination of message text, an image, or a URL. Platform
            and context help explain the result.
          </p>
        </div>

        <div className="field-group field-span">
          <label htmlFor="text">Suspicious text</label>
          <textarea
            id="text"
            name="text"
            rows={9}
            maxLength={10_000}
            placeholder="Paste the message or offer here"
          />
        </div>

        <div className="field-group field-span">
          <label htmlFor="image">Screenshot or image</label>
          <input
            id="image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-describedby="image-help"
            onChange={(event) => {
              setSelectedImage(event.target.files?.[0] ?? null);
              setError("");
            }}
          />
          <p id="image-help" className="field-help">
            JPEG, PNG, or WebP. Maximum 5 MB.
          </p>
          {selectedImage ? (
            <p className="selected-file" aria-live="polite">
              <span className="selected-file-label">Selected:</span>{" "}
              <span>{selectedImage.name}</span>
            </p>
          ) : null}
        </div>

        <div className="field-group">
          <label htmlFor="url">URL</label>
          <input
            id="url"
            name="url"
            type="url"
            maxLength={2_048}
            placeholder="https://example.com"
          />
        </div>

        <div className="field-group">
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
        </div>

        <div className="field-group field-span">
          <label htmlFor="context">Context</label>
          <textarea
            id="context"
            name="context"
            rows={3}
            maxLength={1_000}
            placeholder="How did you receive it? What happened before this?"
          />
        </div>

        <div className="form-footer field-span">
          <p className="privacy-note">
            Submitted content is sent to Groq for analysis and this app does not
            intentionally store submissions. Do not submit passwords, one-time
            codes, private keys, or highly sensitive financial credentials.
          </p>

          <button type="submit" disabled={submitting}>
            {submitting ? "Analyzing…" : "Analyze"}
          </button>
        </div>
        {error ? (
          <p className="form-error field-span" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      {result ? <AnalysisResult result={result} /> : null}
    </>
  );
}
