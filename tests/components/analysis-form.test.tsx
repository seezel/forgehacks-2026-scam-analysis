import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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
  it("renders the approved controls and complete privacy note", () => {
    render(<AnalysisForm />);

    expect(screen.getByLabelText("Suspicious text")).toBeInTheDocument();
    expect(screen.getByLabelText("Screenshot or image")).toHaveAttribute(
      "accept",
      "image/jpeg,image/png,image/webp",
    );
    expect(screen.getByLabelText("URL")).toBeInTheDocument();
    expect(screen.getByLabelText("Platform")).toBeInTheDocument();
    expect(screen.getByLabelText("Context")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analyze" })).toBeInTheDocument();
    expect(screen.queryByText(/sign up/i)).not.toBeInTheDocument();
    expect(screen.getByText(/sent to groq for analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/does not intentionally store/i)).toBeInTheDocument();
    expect(screen.getByText(/passwords/i)).toBeInTheDocument();
    expect(screen.getByText(/one-time codes/i)).toBeInTheDocument();
    expect(screen.getByText(/private keys/i)).toBeInTheDocument();
    expect(screen.getByText(/financial credentials/i)).toBeInTheDocument();
  });

  it("submits a valid image-only analysis under the image field", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ result }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<AnalysisForm />);
    const image = new File([new Uint8Array(128)], "screenshot.png", {
      type: "image/png",
    });

    await user.upload(screen.getByLabelText("Screenshot or image"), image);

    expect(screen.getByText("screenshot.png")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Analyze" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const requestBody = fetchMock.mock.calls[0][1]?.body as FormData;
    const submittedImage = requestBody.get("image");
    expect(submittedImage).toBeInstanceOf(File);
    expect((submittedImage as File).name).toBe("screenshot.png");
    expect((submittedImage as File).type).toBe("image/png");
    expect((submittedImage as File).size).toBe(128);
    expect(requestBody.get("text")).toBe("");
    expect(requestBody.get("url")).toBe("");
  });

  it("rejects an image larger than 5 MB without sending a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<AnalysisForm />);
    const image = new File(
      [new Uint8Array(5 * 1024 * 1024 + 1)],
      "large.png",
      { type: "image/png" },
    );

    await user.upload(screen.getByLabelText("Screenshot or image"), image);
    await user.click(screen.getByRole("button", { name: "Analyze" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Image must be 5 MB or smaller.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an unsupported image type without sending a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<AnalysisForm />);
    const image = new File([new Uint8Array(128)], "document.gif", {
      type: "image/gif",
    });

    fireEvent.change(screen.getByLabelText("Screenshot or image"), {
      target: { files: [image] },
    });
    await user.click(screen.getByRole("button", { name: "Analyze" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Image must be a JPEG, PNG, or WebP file.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("continues to submit text and URL fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ result }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<AnalysisForm />);

    await user.type(screen.getByLabelText("Suspicious text"), "Review this");
    await user.type(screen.getByLabelText("URL"), "https://example.com/offer");
    await user.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const requestBody = fetchMock.mock.calls[0][1]?.body as FormData;
    expect(requestBody.get("text")).toBe("Review this");
    expect(requestBody.get("url")).toBe("https://example.com/offer");
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
