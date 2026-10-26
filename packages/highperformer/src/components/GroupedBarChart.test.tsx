import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import GroupedBarChart, { type GroupedBarData } from "./GroupedBarChart";
import GroupedBarTable from "./GroupedBarTable";

afterEach(() => cleanup());

const composition: GroupedBarData = {
  title: "author_cell_type composition by author_tumor_supersite",
  value_kind: "fraction",
  obs_column: "author_tumor_supersite",
  categories: ["T.cell", "Monocyte"],
  series: ["Adnexa", "Omentum"],
  values: [
    [0.425, 0.53],
    [0.505, 0.331],
  ],
  n_cells: [157110, 106262],
  where: { author_sort_parameters: "singlet, live, CD45+" },
};

describe("GroupedBarChart", () => {
  it("draws one bar per (category, series) with percent labels", () => {
    const { container } = render(<GroupedBarChart data={composition} />);
    expect(container.querySelectorAll("svg rect")).toHaveLength(4);
    const titles = Array.from(container.querySelectorAll("svg title")).map((t) => t.textContent);
    expect(titles).toContain("T.cell — Adnexa: 42.5%");
    expect(titles).toContain("Monocyte — Omentum: 33.1%");
  });

  it("shows a legend with group sizes and the where subset", () => {
    const { container } = render(<GroupedBarChart data={composition} />);
    expect(container.textContent).toContain("Adnexa");
    expect(container.textContent).toContain("(n=157,110)");
    expect(container.textContent).toContain(
      "Only cells where author_sort_parameters = singlet, live, CD45+",
    );
  });

  it("omits the legend for a single series", () => {
    const { container } = render(
      <GroupedBarChart
        data={{
          ...composition,
          value_kind: "count",
          categories: ["Adnexa", "Omentum"],
          series: ["cells"],
          values: [[320166], [208894]],
          where: null,
        }}
      />,
    );
    expect(container.textContent).not.toContain("n=");
    expect(container.textContent).toContain("320,166");
  });

  it("draws negative values left of zero", () => {
    const { container } = render(
      <GroupedBarChart
        data={{
          ...composition,
          value_kind: "mean_expression",
          categories: ["CD8A"],
          values: [[-0.5, 1.0]],
        }}
      />,
    );
    const [neg, pos] = Array.from(container.querySelectorAll("svg rect"));
    expect(Number(neg.getAttribute("x"))).toBeLessThan(Number(pos.getAttribute("x")));
  });

  it("returns null when there are no categories", () => {
    const { container } = render(
      <GroupedBarChart data={{ ...composition, categories: [], values: [] }} />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("GroupedBarTable", () => {
  it("renders a row per category and a column per series", () => {
    const { container } = render(<GroupedBarTable data={composition} />);
    const headers = Array.from(container.querySelectorAll("th")).map((t) => t.textContent);
    expect(headers).toEqual(["", "Adnexa", "Omentum"]);
    expect(container.textContent).toContain("42.5%");
    expect(container.textContent).toContain("157,110");
  });
});
