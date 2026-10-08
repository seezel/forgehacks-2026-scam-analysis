import type { SignalObservation, UrlObservation } from "@/types/analysis";

const RAW_IP_HOSTNAME = /^\d{1,3}(?:\.\d{1,3}){3}$/;

export function analyzeUrl(rawUrl: string): UrlObservation[] {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    return [];
  }

  const observations: UrlObservation[] = [];
  const addObservation = (id: string, explanation: string) => {
    observations.push({ id, evidence: rawUrl, explanation });
  };

  if (RAW_IP_HOSTNAME.test(url.hostname)) {
    addObservation(
      "raw_ip_hostname",
      "The hostname is a raw IP address instead of a named domain.",
    );
  }

  if (url.hostname.split(".").some((part) => part.startsWith("xn--"))) {
    addObservation(
      "punycode_hostname",
      "The hostname uses punycode, which can make look-alike characters harder to notice.",
    );
  }

  if (url.username || url.password) {
    addObservation(
      "embedded_credentials",
      "The URL contains an embedded username or password.",
    );
  }

  const subdomainDepth = Math.max(0, url.hostname.split(".").length - 2);
  if (subdomainDepth > 2) {
    addObservation(
      "deep_subdomain",
      "The hostname has an unusually deep subdomain structure.",
    );
  }

  if (rawUrl.length > 180) {
    addObservation(
      "very_long_url",
      "The URL is unusually long and may hide important parts.",
    );
  }

  return observations;
}

export function urlObservationsToSignals(
  observations: UrlObservation[],
): SignalObservation[] {
  if (observations.length === 0) {
    return [];
  }

  return [
    {
      id: "suspicious_link_present",
      evidence: observations[0].evidence,
      source: "url",
      explanation:
        "The submitted URL has structural warning signs that deserve caution.",
    },
  ];
}
