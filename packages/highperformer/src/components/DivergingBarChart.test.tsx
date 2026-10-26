import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import DivergingBarChart, { type DivergingBarData } from "./DivergingBarChart";
import DivergingBarTable from "./DivergingBarTable";

afterEach(() => cleanup());

const data: DivergingBarData = {
  obs_column: "cell_type",
  group_a: "T cell",
  group_b: "B cell",
  genes: [
    { symbol: "MS4A1", cohens_d: -2.1 },
    { symbol: "CD8A", cohens_d: 1.8 },
    { symbol: "BAD", cohens_d: Number.NaN },
    { symbol: "CD3E", cohens_d: 2.5 },
  ],
};

describe("DivergingBarChart", () => {
  it("orders genes from most A-higher to most B-higher and skips non-finite d", () => {
    const { container } = render(<DivergingBarChart data={data} />);
    const titles = Array.from(container.querySelectorAll("svg title")).map((t) => t.textContent);
    expect(titles).toEqual(["CD3E: d = 2.50", "CD8A: d = 1.80", "MS4A1: d = -2.10"]);
  });

  it("puts B-higher bars left of A-higher bars", () => {
    const { container } = render(<DivergingBarChart data={data} />);
    const [cd3e, , ms4a1] = Array.from(container.querySelectorAll("svg rect"));
    expect(Number(ms4a1.getAttribute("x"))).toBeLessThan(Number(cd3e.getAttribute("x")));
  });

  it("labels both directions", () => {
    const { container } = render(<DivergingBarChart data={data} />);
    expect(container.textContent).toContain("higher in T cell");
    expect(container.textContent).toContain("higher in B cell");
  });
});

describe("DivergingBarTable", () => {
  it("lists each gene with the group it is higher in", () => {
    const { container } = render(<DivergingBarTable data={data} />);
    const rows = Array.from(container.querySelectorAll("tbody tr")).map((r) => r.textContent);
    expect(rows).toEqual(["CD3E2.500T cell", "CD8A1.800T cell", "MS4A1-2.100B cell"]);
  });
});
