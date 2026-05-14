import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the WorkerPool before importing the store (same as useAppStore.test.ts).
vi.mock("../pool/WorkerPool", () => {
  return {
    WorkerPool: class MockPool {
      dispatch = vi.fn().mockResolvedValue({
        type: "colorBuffer",
        buffer: new Uint8Array(8),
        version: 1,
      });
      clearQueue = vi.fn();
      dispose() {}
    },
  };
});
vi.mock("../workers/universal.worker.ts?worker", () => {
  return { default: class MockWorker {} };
});

const { default: useAppStore } = await import("../store/useAppStore");
const { buildViewStateSnapshot } = await import("./viewStateSnapshot");

describe("buildViewStateSnapshot", () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState());
  });

  it("returns empty object when nothing is set", () => {
    expect(buildViewStateSnapshot()).toEqual({});
  });

  it("includes embedding when set", () => {
    useAppStore.setState({ selectedEmbedding: "X_umap" } as any);
    expect(buildViewStateSnapshot()).toEqual({ embedding: "X_umap" });
  });

  it("includes colorMode + gene (resolved to symbol via geneLabelMap)", () => {
    useAppStore.setState({
      colorMode: "gene",
      selectedGene: "ENSG_CD8A",
      geneLabelMap: new Map([["ENSG_CD8A", "CD8A"]]),
    } as any);
    const snap = buildViewStateSnapshot();
    expect(snap.colorMode).toBe("gene");
    expect(snap.gene).toBe("CD8A");
  });

  it("includes colorMode + category when in category mode", () => {
    useAppStore.setState({
      colorMode: "category",
      selectedObsColumn: "cell_type",
    } as any);
    const snap = buildViewStateSnapshot();
    expect(snap.colorMode).toBe("category");
    expect(snap.category).toBe("cell_type");
  });

  it("omits colorScale when default (viridis)", () => {
    useAppStore.setState({ colorScaleName: "viridis" } as any);
    expect(buildViewStateSnapshot().colorScale).toBeUndefined();
  });

  it("includes colorScale when non-default", () => {
    useAppStore.setState({ colorScaleName: "plasma" } as any);
    expect(buildViewStateSnapshot().colorScale).toBe("plasma");
  });

  it("includes highlightedCategories resolved to labels", () => {
    useAppStore.setState({
      categoryMap: [
        { label: "T cell", color: [255, 0, 0] },
        { label: "B cell", color: [0, 255, 0] },
      ],
      highlightedCategories: new Set([0]),
    } as any);
    expect(buildViewStateSnapshot().highlightedCategories).toEqual(["T cell"]);
  });

  it("omits pointSize/opacity when at defaults (0.5)", () => {
    useAppStore.setState({ pointRadius: 0.5, opacity: 0.5 } as any);
    const snap = buildViewStateSnapshot();
    expect(snap.pointSize).toBeUndefined();
    expect(snap.opacity).toBeUndefined();
  });

  it("includes pointSize/opacity when non-default", () => {
    useAppStore.setState({ pointRadius: 2, opacity: 0.3 } as any);
    const snap = buildViewStateSnapshot();
    expect(snap.pointSize).toBe(2);
    expect(snap.opacity).toBe(0.3);
  });

  it("includes summaryGenes resolved to symbols", () => {
    useAppStore.setState({
      summaryGenes: ["ENSG_CD8A", "ENSG_DAPL1"],
      geneLabelMap: new Map([
        ["ENSG_CD8A", "CD8A"],
        ["ENSG_DAPL1", "DAPL1"],
      ]),
    } as any);
    expect(buildViewStateSnapshot().summaryGenes).toEqual(["CD8A", "DAPL1"]);
  });

  it("emits filter snapshot when a custom group is active", () => {
    useAppStore.setState({
      selectionFilterBuffer: new Float32Array([1, 0, 1]),
      selectionGroups: [
        {
          id: 4,
          type: "custom" as const,
          column: "cell_type",
          ids: ["T.cell"],
          unmatchedIds: [],
          indices: new Uint32Array(0),
          color: [255, 149, 0] as [number, number, number],
        },
      ],
      customGroupColumn: "cell_type",
      customGroupCommittedCount: 250334,
    } as any);
    expect(buildViewStateSnapshot().filter).toEqual({
      kind: "ids",
      obsColumn: "cell_type",
      matchedCount: 250334,
    });
  });

  it("emits filter snapshot when an expression group is active (gene resolved)", () => {
    useAppStore.setState({
      selectionFilterBuffer: new Float32Array([1, 0]),
      selectionGroups: [
        {
          id: 5,
          type: "expression" as const,
          gene: "ENSG_CD8A",
          min: 2,
          max: null,
          indices: new Uint32Array(0),
          color: [175, 82, 222] as [number, number, number],
        },
      ],
      geneLabelMap: new Map([["ENSG_CD8A", "CD8A"]]),
    } as any);
    expect(buildViewStateSnapshot().filter).toEqual({
      kind: "expression",
      gene: "CD8A",
      min: 2,
      max: null,
    });
  });

  it("includes selectionDisplayMode when non-default ('hide') AND a filter is active", () => {
    useAppStore.setState({
      selectionFilterBuffer: new Float32Array([1, 0]),
      selectionDisplayMode: "hide",
      selectionGroups: [
        {
          id: 4,
          type: "custom" as const,
          column: "x",
          ids: [],
          unmatchedIds: [],
          indices: new Uint32Array(0),
          color: [255, 149, 0] as [number, number, number],
        },
      ],
      customGroupColumn: "x",
      customGroupCommittedCount: 1,
    } as any);
    expect(buildViewStateSnapshot().selectionDisplayMode).toBe("hide");
  });

  it("omits filter and selectionDisplayMode when no selection buffer", () => {
    useAppStore.setState({
      selectionFilterBuffer: null,
      selectionDisplayMode: "hide",
    } as any);
    const snap = buildViewStateSnapshot();
    expect(snap.filter).toBeUndefined();
    expect(snap.selectionDisplayMode).toBeUndefined();
  });

  it("omits showCategoryLabels when default (false)", () => {
    useAppStore.setState({ showCategoryLabels: false } as any);
    expect(buildViewStateSnapshot().showCategoryLabels).toBeUndefined();
  });

  it("includes showCategoryLabels when true", () => {
    useAppStore.setState({ showCategoryLabels: true } as any);
    expect(buildViewStateSnapshot().showCategoryLabels).toBe(true);
  });

  it("omits categoryLabelsObsColumn when null", () => {
    useAppStore.setState({ categoryLabelsObsColumn: null } as any);
    expect(buildViewStateSnapshot().categoryLabelsObsColumn).toBeUndefined();
  });

  it("includes categoryLabelsObsColumn when set", () => {
    useAppStore.setState({
      showCategoryLabels: true,
      categoryLabelsObsColumn: "leiden",
    } as any);
    const snap = buildViewStateSnapshot();
    expect(snap.showCategoryLabels).toBe(true);
    expect(snap.categoryLabelsObsColumn).toBe("leiden");
  });
});
