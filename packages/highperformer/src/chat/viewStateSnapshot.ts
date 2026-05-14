/**
 * Build a compact JSON snapshot of the current view state for the agent.
 *
 * Only fields that differ from their defaults are included. Gene names are
 * resolved through `geneLabelMap` so the agent sees symbols (CD8A) rather
 * than internal var indices (ENSG00000...).
 *
 * Shipped with each chat turn request so the agent has context for relative
 * queries like "zoom in more" or "change to a different gene" without a
 * separate tool call.
 */

import useAppStore from "../store/useAppStore";

export type FilterSnapshot =
  | { kind: "ids"; obsColumn: string; matchedCount: number }
  | { kind: "expression"; gene: string; min: number | null; max: number | null }
  | { kind: "spatial" };

export type ViewStateSnapshot = {
  embedding?: string;
  colorMode?: "gene" | "category";
  gene?: string;
  category?: string;
  colorScale?: string;
  highlightedCategories?: string[];
  geneLabelColumn?: string;
  pointSize?: number;
  opacity?: number;
  summaryContext?: "all" | "selections";
  summaryObsColumns?: string[];
  summaryGenes?: string[];
  selectionDisplayMode?: "dim" | "hide";
  filter?: FilterSnapshot;
  showCategoryLabels?: boolean;
  categoryLabelsObsColumn?: string;
};

export function buildViewStateSnapshot(): ViewStateSnapshot {
  const s = useAppStore.getState();
  const snap: ViewStateSnapshot = {};

  if (s.selectedEmbedding) snap.embedding = s.selectedEmbedding;

  if (s.colorMode === "gene" && s.selectedGene) {
    snap.colorMode = "gene";
    snap.gene = s.geneLabelMap?.get(s.selectedGene) ?? s.selectedGene;
  } else if (s.colorMode === "category" && s.selectedObsColumn) {
    snap.colorMode = "category";
    snap.category = s.selectedObsColumn;
  }

  if (s.colorScaleName !== "viridis") snap.colorScale = s.colorScaleName;

  if (s.highlightedCategories.size > 0) {
    snap.highlightedCategories = Array.from(s.highlightedCategories).map(
      (code) => s.categoryMap[code]?.label ?? String(code),
    );
  }

  if (s.geneLabelColumn) snap.geneLabelColumn = s.geneLabelColumn;
  if (s.pointRadius !== 0.5) snap.pointSize = s.pointRadius;
  if (s.opacity !== 0.5) snap.opacity = s.opacity;

  // Map store's internal value ('all' | 'selections' | 'compare') to the
  // agent-facing surface. 'compare' is intentionally UI-only.
  if (s.summaryContext === "selections") snap.summaryContext = "selections";
  // 'all' is the default — omit. 'compare' is also omitted (UI-only).

  if (s.summaryObsColumns.length > 0)
    snap.summaryObsColumns = [...s.summaryObsColumns];

  if (s.summaryGenes.length > 0) {
    snap.summaryGenes = s.summaryGenes.map(
      (g) => s.geneLabelMap?.get(g) ?? g,
    );
  }

  if (s.showCategoryLabels) snap.showCategoryLabels = true;
  if (s.categoryLabelsObsColumn) snap.categoryLabelsObsColumn = s.categoryLabelsObsColumn;

  // Filter / selection state. Only include if there's a filter buffer
  // (something actually selected on the canvas).
  if (s.selectionFilterBuffer) {
    if (s.selectionDisplayMode !== "dim") {
      snap.selectionDisplayMode = s.selectionDisplayMode;
    }
    const expressionGroup = s.selectionGroups.find(
      (g) => g.type === "expression",
    );
    const customGroup = s.selectionGroups.find((g) => g.type === "custom");
    if (expressionGroup && expressionGroup.type === "expression") {
      snap.filter = {
        kind: "expression",
        gene:
          s.geneLabelMap?.get(expressionGroup.gene) ?? expressionGroup.gene,
        min: expressionGroup.min,
        max: expressionGroup.max,
      };
    } else if (customGroup && customGroup.type === "custom") {
      snap.filter = {
        kind: "ids",
        obsColumn: s.customGroupColumn ?? customGroup.column,
        matchedCount: s.customGroupCommittedCount,
      };
    } else {
      snap.filter = { kind: "spatial" };
    }
  }

  return snap;
}
