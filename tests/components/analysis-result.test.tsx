import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AnalysisResult } from "@/components/analysis-result";
import type { AnalysisResult as AnalysisResultData } from "@/types/analysis";

const result: AnalysisResultData = {
  status: "strong_match",
  likelyScamType: { id: "job_task", name: "Job / task scam" },
  immediateActions: [
    { id: "do_not_send_money", text: "Do not send money." },
  ],
  strongestEvidence: [
    {
      id: "request_deposit_or_fee",
      evidence: "Pay a deposit to unlock tasks",
      source: "text",
      explanation: "The message requests an upfront deposit.",
    },
  ],
  relatedExamples: [
    {
      exampleId: "ftc-task-scam-2025",
      title: "Unexpected online task offer followed by deposit request",
      shortParaphrase: "An unexpected task offer later asks for a deposit.",
      sourceUrl:
        "https://consumer.ftc.gov/consumer-alerts/2025/08/how-spot-avoid-task-scams",
      sourceLabel: "U.S. Federal Trade Commission",
      sharedSignalIds: ["request_deposit_or_fee"],
      differences: ["The submitted message names a different company."],
      overlapScore: 0.8,
    },
  ],
  differences: ["The submitted message names a different company."],
  uncertainties: ["The sender's identity could not be verified."],
  urlObservations: [],
  technicalWarnings: [],
};

afterEach(cleanup);

describe("AnalysisResult", () => {
  it("renders the required hierarchy, evidence, actions, and cited source", () => {
    render(<AnalysisResult result={result} />);

    const headings = screen.getAllByRole("heading").map((heading) => heading.textContent);
    expect(headings).toEqual([
      "Result",
      "What to do now",
      "Why",
      "Likely scam type",
      "What is different",
      "What is uncertain",
      "More details",
    ]);
    expect(screen.getByText("Strong match")).toBeInTheDocument();
    expect(screen.getByText("Do not send money.")).toBeInTheDocument();
    expect(screen.getByText(/Pay a deposit to unlock tasks/)).toBeInTheDocument();
    const source = screen.getByRole("link", {
      name: "U.S. Federal Trade Commission",
    });
    expect(source).toHaveAttribute("target", "_blank");
    expect(source).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("does not claim safety or a likely type for insufficient evidence", () => {
    render(
      <AnalysisResult
        result={{
          ...result,
          status: "insufficient_evidence",
          likelyScamType: null,
          relatedExamples: [],
        }}
      />,
    );

    expect(screen.getByText("Insufficient evidence")).toBeInTheDocument();
    expect(screen.getByText(/no likely scam type is shown/i)).toBeInTheDocument();
    expect(screen.queryByText("Job / task scam")).not.toBeInTheDocument();
    expect(screen.queryByText(/^safe$/i)).not.toBeInTheDocument();
  });
});
