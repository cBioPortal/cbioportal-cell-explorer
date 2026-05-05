import type { ChipDef, ContextResponse, ObsColumnInfo } from "./types";

const LOW_CARDINALITY_MAX = 50;

function isLowCardinalityCategorical(col: ObsColumnInfo): boolean {
  return (
    col.dtype === "categorical" &&
    col.cardinality !== null &&
    col.cardinality <= LOW_CARDINALITY_MAX
  );
}

export function deriveSuggestionChips(ctx: ContextResponse): ChipDef[] {
  const chips: ChipDef[] = [];

  const hasCategorical = ctx.obs_columns.some((c) => c.dtype === "categorical");
  chips.push(
    hasCategorical
      ? { label: "What cell types are here?", prompt: "What cell types are here?" }
      : { label: "Describe this dataset", prompt: "Describe this dataset" },
  );

  const firstLowCardCat = ctx.obs_columns.find(isLowCardinalityCategorical);
  const firstCatCol = ctx.obs_columns.find((c) => c.dtype === "categorical");

  if (firstLowCardCat) {
    if (firstLowCardCat.values && firstLowCardCat.values.length > 0) {
      const v = firstLowCardCat.values[0];
      chips.push({
        label: `Top genes in ${v}`,
        prompt: `Top genes in ${v}`,
      });
    }
    chips.push({
      label: `Compare groups in ${firstLowCardCat.name}`,
      prompt: `Compare two groups in ${firstLowCardCat.name}`,
    });
  } else if (firstCatCol) {
    chips.push({
      label: `Compare groups in ${firstCatCol.name}`,
      prompt: `Compare two groups in ${firstCatCol.name}`,
    });
  }

  if (ctx.embedding_keys.length > 0) {
    chips.push({
      label: "Show me on the UMAP",
      prompt: "Show me an interesting view on the UMAP",
    });
  }

  return chips.slice(0, 4);
}
