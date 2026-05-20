import { describe, it, expect } from "vitest";
import type { ToolProgress, ToolPart, ChartHint } from "./types";

describe("chart types", () => {
  it("ToolProgress accepts an optional chart field", () => {
    const evt: ToolProgress = {
      type: "tool_progress",
      tool: "top_expressed_genes",
      status: "ok",
      chart: { type: "top_genes_bar", data: { genes: ["CD8A"] } },
    };
    expect(evt.chart?.type).toBe("top_genes_bar");
  });

  it("ToolProgress without chart still typechecks", () => {
    const evt: ToolProgress = {
      type: "tool_progress",
      tool: "x",
      status: "started",
    };
    expect(evt.chart).toBeUndefined();
  });

  it("ToolPart accepts a chart field", () => {
    const part: ToolPart = {
      kind: "tool",
      tool: "gene_panel_by_obs",
      status: "ok",
      chart: { type: "gene_panel_dotplot", data: { genes: [], categories: [] } },
    };
    expect(part.chart?.type).toBe("gene_panel_dotplot");
  });

  it("ToolPart without chart still typechecks", () => {
    const part: ToolPart = {
      kind: "tool",
      tool: "some_tool",
      status: "ok",
    };
    expect(part.chart).toBeUndefined();
  });

  it("ChartHint with null data is valid", () => {
    const hint: ChartHint = {
      type: "some_chart",
      data: null,
    };
    expect(hint.type).toBe("some_chart");
    expect(hint.data).toBeNull();
  });
});
