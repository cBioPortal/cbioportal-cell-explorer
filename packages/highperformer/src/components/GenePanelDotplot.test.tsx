import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import GenePanelDotplot from "./GenePanelDotplot";

afterEach(() => cleanup());

const sampleData = {
  obs_column: "cell_type",
  genes: ["CD8A", "CD4"],
  categories: ["T cell", "B cell"],
  mean: [
    [3.0, 0.2],
    [1.5, 0.1],
  ],
  frac_expressing: [
    [0.8, 0.1],
    [0.6, 0.05],
  ],
};

describe("GenePanelDotplot", () => {
  it("renders heading with obs_column", () => {
    const { container } = render(<GenePanelDotplot data={sampleData} />);
    expect(container.textContent).toContain("cell_type");
  });

  it("renders genes and categories", () => {
    const { container } = render(<GenePanelDotplot data={sampleData} />);
    expect(container.textContent).toContain("CD8A");
    expect(container.textContent).toContain("CD4");
    expect(container.textContent).toContain("T cell");
    expect(container.textContent).toContain("B cell");
  });

  it("returns null for empty genes", () => {
    const { container } = render(
      <GenePanelDotplot data={{ ...sampleData, genes: [], mean: [], frac_expressing: [] }} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null for empty categories", () => {
    const { container } = render(
      <GenePanelDotplot data={{ ...sampleData, categories: [], mean: [[], []], frac_expressing: [[], []] }} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
