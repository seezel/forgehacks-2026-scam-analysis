import { AnalysisForm } from "@/components/analysis-form";

export default function Home() {
  return (
    <main>
      <header>
        <p className="eyebrow">ForgeHacks 2026</p>
        <h1>Scam message analysis</h1>
        <p>
          Paste suspicious content to compare its warning signs with documented
          scam patterns.
        </p>
      </header>
      <AnalysisForm />
    </main>
  );
}
