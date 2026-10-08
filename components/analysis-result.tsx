import { EvidenceList } from "@/components/evidence-list";
import { SafeActions } from "@/components/safe-actions";
import type { AnalysisResult as AnalysisResultData } from "@/types/analysis";

const statusCopy = {
  strong_match: {
    label: "Strong match",
    detail: "The supported warning signs closely match a documented scam pattern.",
  },
  possible_match: {
    label: "Possible match",
    detail: "Some supported warning signs match a documented scam pattern.",
  },
  insufficient_evidence: {
    label: "Insufficient evidence",
    detail: "There is not enough supported evidence to identify a scam pattern.",
  },
} as const;

export function AnalysisResult({ result }: { result: AnalysisResultData }) {
  const status = statusCopy[result.status];
  const uncertainties = [
    ...result.uncertainties,
    ...result.technicalWarnings,
  ];

  return (
    <section className="result" aria-labelledby="result-heading">
      <h2 id="result-heading">Result</h2>
      <p className={`status status-${result.status}`}>{status.label}</p>
      <p>{status.detail}</p>

      <section>
        <h2>What to do now</h2>
        <SafeActions actions={result.immediateActions} />
      </section>

      <section>
        <h2>Why</h2>
        <EvidenceList evidence={result.strongestEvidence} />
      </section>

      <section>
        <h2>Likely scam type</h2>
        {result.likelyScamType ? (
          <p>{result.likelyScamType.name}</p>
        ) : (
          <p>No likely scam type is shown because the evidence is insufficient.</p>
        )}
      </section>

      <section>
        <h2>What is different</h2>
        <TextList
          items={result.differences}
          empty="No supported differences were identified."
        />
      </section>

      <section>
        <h2>What is uncertain</h2>
        <TextList
          items={uncertainties}
          empty="No additional uncertainties were reported."
        />
      </section>

      <section>
        <h2>More details</h2>
        {result.relatedExamples.length === 0 &&
        result.urlObservations.length === 0 ? (
          <p>No related documented examples or URL observations are available.</p>
        ) : null}

        {result.relatedExamples.map((example) => (
          <article className="related-example" key={example.exampleId}>
            <p>
              <strong>{example.title}</strong>
            </p>
            <p>{example.shortParaphrase}</p>
            <p>
              Source:{" "}
              <a
                href={example.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {example.sourceLabel}
              </a>
            </p>
          </article>
        ))}

        {result.urlObservations.length > 0 ? (
          <ul>
            {result.urlObservations.map((observation) => (
              <li key={observation.id}>{observation.explanation}</li>
            ))}
          </ul>
        ) : null}
      </section>
    </section>
  );
}

function TextList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) {
    return <p>{empty}</p>;
  }

  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
