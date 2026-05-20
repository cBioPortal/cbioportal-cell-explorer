import { describe, it, expect } from "vitest";
import { DotPlotMatrix } from "./ExpressionDotPlot";
import type { DotPlotDatum } from "./ExpressionDotPlot";

describe("ExpressionDotPlot named exports", () => {
  it("exports DotPlotMatrix and DotPlotDatum", () => {
    expect(typeof DotPlotMatrix).toBe("function");
    const d: DotPlotDatum = {
      gene: "CD8A",
      geneLabel: "CD8A",
      category: "T cell",
      meanExpression: 1.2,
      fractionExpressing: 0.5,
    };
    expect(d.gene).toBe("CD8A");
  });
});
