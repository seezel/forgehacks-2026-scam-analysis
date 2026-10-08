import { describe, expect, it } from "vitest";
import {
  analyzeUrl,
  urlObservationsToSignals,
} from "@/lib/url-analysis";

describe("analyzeUrl", () => {
  it("flags raw IP hostnames", () => {
    expect(analyzeUrl("https://192.0.2.10/login").map((x) => x.id)).toContain(
      "raw_ip_hostname",
    );
  });

  it("flags punycode hostnames", () => {
    expect(
      analyzeUrl("https://xn--pple-43d.com/login").map((x) => x.id),
    ).toContain("punycode_hostname");
  });

  it("flags embedded credentials", () => {
    expect(
      analyzeUrl("https://user:pass@example.com/").map((x) => x.id),
    ).toContain("embedded_credentials");
  });

  it("flags more than two subdomain levels", () => {
    expect(
      analyzeUrl("https://a.b.c.example.com/login").map((x) => x.id),
    ).toContain("deep_subdomain");
  });

  it("does not flag two subdomain levels as deep", () => {
    expect(
      analyzeUrl("https://a.b.example.com/login").map((x) => x.id),
    ).not.toContain("deep_subdomain");
  });

  it("flags URLs longer than 180 characters", () => {
    const rawUrl = `https://example.com/${"x".repeat(161)}`;

    expect(analyzeUrl(rawUrl).map((x) => x.id)).toContain("very_long_url");
  });

  it("does not flag a short ordinary URL", () => {
    expect(analyzeUrl("https://example.com/help")).toEqual([]);
  });

  it("uses the exact submitted URL as observation evidence", () => {
    const rawUrl = "https://user:pass@example.com/Login?Next=%2FAccount";

    expect(analyzeUrl(rawUrl)[0]?.evidence).toBe(rawUrl);
  });
});

describe("urlObservationsToSignals", () => {
  it("creates one controlled suspicious-link signal for URL observations", () => {
    const rawUrl = "https://192.0.2.10/login";
    const signals = urlObservationsToSignals(analyzeUrl(rawUrl));

    expect(signals).toEqual([
      {
        id: "suspicious_link_present",
        evidence: rawUrl,
        source: "url",
        explanation:
          "The submitted URL has structural warning signs that deserve caution.",
      },
    ]);
  });

  it("does not create a signal when there are no URL observations", () => {
    expect(urlObservationsToSignals([])).toEqual([]);
  });
});
