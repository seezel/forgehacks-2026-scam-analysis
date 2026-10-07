import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("test harness", () => {
  it("renders React in jsdom with jest-dom matchers", () => {
    render(<main>Test harness ready</main>);

    expect(screen.getByRole("main")).toBeInTheDocument();
  });
});
