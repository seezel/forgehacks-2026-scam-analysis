import { AnalysisForm } from "@/components/analysis-form";

export default function Home() {
  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">ForgeHacks 2026 · AI + Cybersecurity</p>
        <h1>Check suspicious messages, screenshots, and links.</h1>
        <p className="lede">
          Analyze suspicious content against structured warning signs and
          documented scam patterns.
        </p>
        <p className="uncertainty-note">
          The tool does not mark content as &ldquo;safe.&rdquo; Low evidence
          means the result is uncertain.
        </p>
      </header>

      <AnalysisForm />

      <section className="process" aria-labelledby="process-heading">
        <div className="process-intro">
          <p className="section-label">Analysis method</p>
          <h2 id="process-heading">Evidence first, claims second.</h2>
        </div>
        <ol className="process-list">
          <li>
            <h3>Extract evidence</h3>
            <p>
              AI identifies supported warning signs in the submitted content.
            </p>
          </li>
          <li>
            <h3>Compare patterns</h3>
            <p>
              Deterministic code compares those signals with known scam types
              and documented examples.
            </p>
          </li>
          <li>
            <h3>Explain uncertainty</h3>
            <p>
              Results show evidence, differences, next steps, and uncertainty
              without claiming content is automatically safe.
            </p>
          </li>
        </ol>
      </section>
    </main>
  );
}
