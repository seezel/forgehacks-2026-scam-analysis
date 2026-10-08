import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AnalysisForm } from "@/components/analysis-form";
import type { AnalysisResult } from "@/types/analysis";

const result: AnalysisResult = {
  status: "insufficient_evidence",
  likelyScamType: null,
  immediateActions: [],
  strongestEvidence: [],
  relatedExamples: [],
  differences: [],
  uncertainties: [],
  urlObservations: [],
  technicalWarnings: [],
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AnalysisForm", () => {
  it("renders the approved text-first controls and complete privacy note", () => {
    render(<AnalysisForm />);

    expect(screen.getByLabelText("Suspicious text")).toBeInTheDocument();
    expect(screen.getByLabelText("URL")).toBeInTheDocument();
    expect(screen.getByLabelText("Platform")).toBeInTheDocument();
    expect(screen.getByLabelText("Context")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analyze" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/screenshot/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sign up/i)).not.toBeInTheDocument();
    expect(screen.getByText(/sent to groq for analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/does not intentionally store/i)).toBeInTheDocument();
    expect(screen.getByText(/passwords/i)).toBeInTheDocument();
    expect(screen.getByText(/one-time codes/i)).toBeInTheDocument();
    expect(screen.getByText(/private keys/i)).toBeInTheDocument();
    expect(screen.getByText(/financial credentials/i)).toBeInTheDocument();
  });

  it("disables duplicate submissions while an analysis is pending", async () => {
    const pending = new Promise<Response>(() => undefined);
    const fetchMock = vi.fn().mockReturnValue(pending);
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<AnalysisForm />);

    await user.type(screen.getByLabelText("Suspicious text"), "Review this offer");
    await user.click(screen.getByRole("button", { name: "Analyze" }));

    expect(screen.getByRole("button", { name: "Analyzing…" })).toBeDisabled();
    fireEvent.submit(screen.getByRole("form", { name: "Scam analysis" }));
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("preserves entered fields and shows an API error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ error: { message: "Analysis is unavailable." } }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    const user = userEvent.setup();
    render(<AnalysisForm />);
    const text = screen.getByLabelText("Suspicious text");

    await user.type(text, "Keep this message");
    await user.click(screen.getByRole("button", { name: "Analyze" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Analysis is unavailable.",
    );
    expect(text).toHaveValue("Keep this message");
  });

  it("renders the result returned by the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ result }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const user = userEvent.setup();
    render(<AnalysisForm />);

    await user.type(screen.getByLabelText("Suspicious text"), "A suspicious offer");
    await user.click(screen.getByRole("button", { name: "Analyze" }));

    expect(await screen.findByRole("heading", { name: "Result" })).toBeInTheDocument();
  });

  it("removes an earlier result when a later analysis fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { message: "Analysis is unavailable." } }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<AnalysisForm />);

    await user.type(screen.getByLabelText("Suspicious text"), "First message");
    await user.click(screen.getByRole("button", { name: "Analyze" }));
    expect(await screen.findByRole("heading", { name: "Result" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Analyze" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Analysis is unavailable.",
    );
    expect(screen.queryByRole("heading", { name: "Result" })).not.toBeInTheDocument();
  });
});
