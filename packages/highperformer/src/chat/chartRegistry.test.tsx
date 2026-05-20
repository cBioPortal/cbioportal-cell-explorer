import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { getChartRenderer, getChartTableRenderer } from "./chartRegistry";

afterEach(() => cleanup());

describe("getChartRenderer", () => {
  it("returns a renderer for top_genes_bar", () => {
    const R = getChartRenderer({
      type: "top_genes_bar",
      data: {
        obs_column: "cell_type",
        group_value: "T cell",
        genes: [{ symbol: "CD8A", mean: 3.0, fraction_expressing: 0.8 }],
      },
    });
    expect(R).toBeDefined();
    if (R) {
      const { container } = render(
        <R
          data={{
            obs_column: "cell_type",
            group_value: "T cell",
            genes: [{ symbol: "CD8A", mean: 3.0, fraction_expressing: 0.8 }],
          }}
        />,
      );
      expect(container.textContent).toContain("CD8A");
    }
  });

  it("returns a renderer for gene_panel_dotplot", () => {
    const R = getChartRenderer({
      type: "gene_panel_dotplot",
      data: { genes: ["CD8A"], categories: ["T cell"] },
    });
    expect(R).toBeDefined();
    if (R) {
      const { container } = render(
        <R
          data={{
            obs_column: "cell_type",
            genes: ["CD8A"],
            categories: ["T cell"],
            mean: [[1.0]],
            frac_expressing: [[0.5]],
          }}
        />,
      );
      expect(container.textContent).toContain("cell_type");
    }
  });

  it("returns undefined for unknown chart type", () => {
    const R = getChartRenderer({ type: "future_chart_xyz", data: {} });
    expect(R).toBeUndefined();
  });

  it("returns undefined for null/undefined hint", () => {
    expect(getChartRenderer(null)).toBeUndefined();
    expect(getChartRenderer(undefined)).toBeUndefined();
  });
});

describe("getChartTableRenderer", () => {
  it("returns a table renderer for top_genes_bar", () => {
    const T = getChartTableRenderer({
      type: "top_genes_bar",
      data: {
        obs_column: "cell_type",
        group_value: "T cell",
        genes: [{ symbol: "CD8A", mean: 3.0, fraction_expressing: 0.8 }],
      },
    });
    expect(T).toBeDefined();
    if (T) {
      const { container } = render(
        <T
          data={{
            obs_column: "cell_type",
            group_value: "T cell",
            genes: [{ symbol: "CD8A", mean: 3.0, fraction_expressing: 0.8 }],
          }}
        />,
      );
      expect(container.querySelector("table")).toBeDefined();
      expect(container.textContent).toContain("CD8A");
      expect(container.textContent).toContain("80.0%");
    }
  });

  it("returns a table renderer for gene_panel_dotplot", () => {
    const T = getChartTableRenderer({
      type: "gene_panel_dotplot",
      data: { genes: ["CD8A"], categories: ["T cell"] },
    });
    expect(T).toBeDefined();
    if (T) {
      const { container } = render(
        <T
          data={{
            obs_column: "cell_type",
            genes: ["CD8A"],
            categories: ["T cell"],
            mean: [[1.0]],
            frac_expressing: [[0.5]],
          }}
        />,
      );
      expect(container.querySelector("table")).toBeDefined();
      expect(container.textContent).toContain("CD8A");
      expect(container.textContent).toContain("T cell");
    }
  });

  it("returns undefined for unknown chart type", () => {
    expect(getChartTableRenderer({ type: "future_chart_xyz", data: {} })).toBeUndefined();
  });

  it("returns undefined for null/undefined hint", () => {
    expect(getChartTableRenderer(null)).toBeUndefined();
    expect(getChartTableRenderer(undefined)).toBeUndefined();
  });
});
