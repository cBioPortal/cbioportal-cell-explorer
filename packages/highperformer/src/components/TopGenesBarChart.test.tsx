import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import TopGenesBarChart from "./TopGenesBarChart";

afterEach(() => cleanup());

describe("TopGenesBarChart", () => {
  const genes = [
    { symbol: "CD8A", mean: 3.0, fraction_expressing: 0.8 },
    { symbol: "CD4", mean: 1.5, fraction_expressing: 0.6 },
    { symbol: "GZMB", mean: 0.5, fraction_expressing: 0.3 },
  ];

  it("renders a heading with the group value", () => {
    const { container } = render(
      <TopGenesBarChart obs_column="cell_type" group_value="T cell" genes={genes} />,
    );
    expect(container.textContent).toContain("Top 3 genes");
    expect(container.textContent).toContain("T cell");
  });

  it("renders a <title> per gene with its symbol", () => {
    const { container } = render(
      <TopGenesBarChart obs_column="cell_type" group_value="T cell" genes={genes} />,
    );
    const titles = container.querySelectorAll("svg title");
    expect(titles.length).toBe(3);
    const texts = Array.from(titles).map((t) => t.textContent);
    expect(texts.some((t) => t?.includes("CD8A"))).toBe(true);
    expect(texts.some((t) => t?.includes("CD4"))).toBe(true);
    expect(texts.some((t) => t?.includes("GZMB"))).toBe(true);
  });

  it("returns null for empty genes list", () => {
    const { container } = render(
      <TopGenesBarChart obs_column="cell_type" group_value="T cell" genes={[]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("bar width is proportional to mean", () => {
    const { container } = render(
      <TopGenesBarChart obs_column="cell_type" group_value="T cell" genes={genes} />,
    );
    // Each rect contains a <title> as a child — collect widths by matching title text
    const rects = Array.from(container.querySelectorAll("svg rect"));
    const symbolToWidth: Record<string, number> = {};
    rects.forEach((r) => {
      const title = r.querySelector("title");
      const sym = title?.textContent?.split(":")[0]?.trim();
      const w = parseFloat(r.getAttribute("width") ?? "0");
      if (sym) symbolToWidth[sym] = w;
    });
    expect(symbolToWidth["CD8A"]).toBeGreaterThan(symbolToWidth["CD4"]);
    expect(symbolToWidth["CD4"]).toBeGreaterThan(symbolToWidth["GZMB"]);
  });
});
