import { describe, it, expect } from "vitest";
import type {
  StrataTable,
  CoarseStrataTable,
  AtomicStrataTable,
} from "./StrataStore";
import { StrataStore } from "./StrataStore";

describe("StrataStore type definitions", () => {
  it("exports a StrataTable union resolvable to coarse or atomic", () => {
    const coarse: CoarseStrataTable = {
      kind: "coarse",
      slug: "cell_type",
      axes: ["cell_type"],
      stratumKeys: [["A"], ["B"]],
      geneIndices: null,
      sumX: new Float32Array([1, 2, 3, 4]),
      sumXX: new Float32Array([1, 4, 9, 16]),
      nnz: new Int32Array([1, 1, 1, 1]),
      nCells: new Int32Array([2, 2]),
      schemaVersion: "1.0",
    };
    const table: StrataTable = coarse;
    expect(table.kind).toBe("coarse");
  });

  it("exports StrataStore as a class", () => {
    expect(StrataStore).toBeDefined();
    expect(typeof StrataStore).toBe("function");
  });
});
