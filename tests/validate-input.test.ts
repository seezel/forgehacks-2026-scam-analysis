import { describe, expect, it } from "vitest";
import { validateAnalyzeInput } from "@/lib/validate-input";

const base = { text: "", image: null, url: "", platform: "", context: "" };

describe("validateAnalyzeInput", () => {
  it("rejects empty input with a readable error", () => {
    expect(validateAnalyzeInput(base)).toEqual({
      ok: false,
      errors: ["Provide text, an image, or a URL to analyze."],
    });
  });

  it("accepts text input", () => {
    expect(
      validateAnalyzeInput({ ...base, text: "Suspicious message" }),
    ).toEqual({ ok: true });
  });

  it("accepts text at the 10,000 character limit", () => {
    expect(validateAnalyzeInput({ ...base, text: "x".repeat(10_000) }).ok).toBe(
      true,
    );
  });

  it("rejects text above 10,000 characters", () => {
    expect(
      validateAnalyzeInput({ ...base, text: "x".repeat(10_001) }),
    ).toEqual({
      ok: false,
      errors: ["Text must be 10,000 characters or fewer."],
    });
  });

  it("rejects context above 1,000 characters", () => {
    expect(
      validateAnalyzeInput({
        ...base,
        text: "Suspicious message",
        context: "x".repeat(1_001),
      }),
    ).toEqual({
      ok: false,
      errors: ["Context must be 1,000 characters or fewer."],
    });
  });

  it("rejects a URL above 2,048 characters", () => {
    const url = `https://example.com/${"x".repeat(2_030)}`;

    expect(validateAnalyzeInput({ ...base, url })).toEqual({
      ok: false,
      errors: ["URL must be 2,048 characters or fewer."],
    });
  });

  it("rejects a malformed URL", () => {
    expect(validateAnalyzeInput({ ...base, url: "not a url" })).toEqual({
      ok: false,
      errors: ["Enter a valid HTTP or HTTPS URL."],
    });
  });

  it("rejects a URL with a non-HTTP protocol", () => {
    expect(validateAnalyzeInput({ ...base, url: "ftp://example.com" })).toEqual({
      ok: false,
      errors: ["Enter a valid HTTP or HTTPS URL."],
    });
  });

  it.each(["image/jpeg", "image/png", "image/webp"])(
    "accepts a supported %s image",
    (type) => {
      const image = new File([new Uint8Array(10)], "shot", { type });

      expect(validateAnalyzeInput({ ...base, image })).toEqual({ ok: true });
    },
  );

  it("rejects an image larger than 5 MB", () => {
    const image = new File(
      [new Uint8Array(5 * 1024 * 1024 + 1)],
      "shot.png",
      { type: "image/png" },
    );

    expect(validateAnalyzeInput({ ...base, image })).toEqual({
      ok: false,
      errors: ["Image must be 5 MB or smaller."],
    });
  });

  it("rejects an unsupported image MIME type", () => {
    const image = new File([new Uint8Array(10)], "document.pdf", {
      type: "application/pdf",
    });

    expect(validateAnalyzeInput({ ...base, image })).toEqual({
      ok: false,
      errors: ["Image must be a JPEG, PNG, or WebP file."],
    });
  });
});
