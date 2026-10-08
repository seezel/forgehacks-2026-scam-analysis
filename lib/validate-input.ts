import type { AnalyzeInput } from "@/types/analysis";

const MAX_TEXT = 10_000;
const MAX_CONTEXT = 1_000;
const MAX_URL = 2_048;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type AnalyzeInputValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

export function validateAnalyzeInput(
  input: AnalyzeInput,
): AnalyzeInputValidationResult {
  const errors: string[] = [];
  const hasText = input.text.trim().length > 0;
  const hasUrl = input.url.trim().length > 0;

  if (!hasText && input.image === null && !hasUrl) {
    errors.push("Provide text, an image, or a URL to analyze.");
  }

  if (input.text.length > MAX_TEXT) {
    errors.push("Text must be 10,000 characters or fewer.");
  }

  if (input.context.length > MAX_CONTEXT) {
    errors.push("Context must be 1,000 characters or fewer.");
  }

  if (input.url.length > MAX_URL) {
    errors.push("URL must be 2,048 characters or fewer.");
  } else if (hasUrl && !isHttpUrl(input.url)) {
    errors.push("Enter a valid HTTP or HTTPS URL.");
  }

  if (input.image !== null) {
    if (input.image.size > MAX_IMAGE_BYTES) {
      errors.push("Image must be 5 MB or smaller.");
    }

    if (!IMAGE_TYPES.has(input.image.type)) {
      errors.push("Image must be a JPEG, PNG, or WebP file.");
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
