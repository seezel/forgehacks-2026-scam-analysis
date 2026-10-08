import type { SignalObservation } from "@/types/analysis";

export function EvidenceList({ evidence }: { evidence: SignalObservation[] }) {
  if (evidence.length === 0) {
    return <p>No supported warning-sign evidence was found.</p>;
  }

  return (
    <div className="evidence-list">
      {evidence.map((item) => (
        <blockquote key={`${item.id}-${item.source}-${item.evidence}`}>
          <p>&ldquo;{item.evidence}&rdquo;</p>
          <footer>{item.explanation}</footer>
        </blockquote>
      ))}
    </div>
  );
}
