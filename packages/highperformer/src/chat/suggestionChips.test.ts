import { describe, expect, it } from "vitest";
import { deriveSuggestionChips } from "./suggestionChips";
import type { ContextResponse } from "./types";

const baseCtx: ContextResponse = {
  slug: "spectrum",
  name: "Spectrum",
  description: "test",
  n_obs: 100,
  n_var: 10,
  obs_columns: [],
  embedding_keys: ["X_umap"],
  available_tools: [],
};

describe("deriveSuggestionChips", () => {
  it("returns all 4 chips for a categorical fixture with values populated", () => {
    const ctx: ContextResponse = {
      ...baseCtx,
      obs_columns: [
        {
          name: "cell_type",
          dtype: "categorical",
          cardinality: 3,
          values: ["T cells", "B cells", "Myeloid"],
        },
      ],
    };
    const chips = deriveSuggestionChips(ctx);
    expect(chips).toHaveLength(4);
    expect(chips[0].prompt).toMatch(/cell types/i);
    expect(chips[1].prompt).toMatch(/T cells/);
    expect(chips[2].prompt).toMatch(/cell_type/);
    expect(chips[3].prompt).toMatch(/UMAP/i);
  });

  it("falls back to generic chips when no categorical columns exist", () => {
    const ctx: ContextResponse = {
      ...baseCtx,
      obs_columns: [
        { name: "percent_mt", dtype: "numeric", cardinality: null, values: null },
      ],
    };
    const chips = deriveSuggestionChips(ctx);
    expect(chips).toHaveLength(2);
    expect(chips[0].prompt).toMatch(/describe/i);
    expect(chips[1].prompt).toMatch(/UMAP/i);
  });

  it("skips specific-group chip when categorical column has no values", () => {
    const ctx: ContextResponse = {
      ...baseCtx,
      obs_columns: [
        { name: "donor", dtype: "categorical", cardinality: 200, values: null },
      ],
    };
    const chips = deriveSuggestionChips(ctx);
    expect(chips.some((c) => c.prompt.match(/Top genes in/))).toBe(false);
    expect(chips.some((c) => c.prompt.match(/Compare two groups in/))).toBe(true);
  });

  it("uses the first low-cardinality categorical column for specific chips", () => {
    const ctx: ContextResponse = {
      ...baseCtx,
      obs_columns: [
        { name: "donor", dtype: "categorical", cardinality: 200, values: null },
        {
          name: "cell_type",
          dtype: "categorical",
          cardinality: 3,
          values: ["T", "B", "M"],
        },
      ],
    };
    const chips = deriveSuggestionChips(ctx);
    expect(chips.find((c) => c.prompt.includes("Top genes in T"))).toBeDefined();
  });

  it("always returns between 1 and 4 chips", () => {
    const minimal: ContextResponse = {
      ...baseCtx,
      obs_columns: [],
      embedding_keys: [],
    };
    const chips = deriveSuggestionChips(minimal);
    expect(chips.length).toBeGreaterThanOrEqual(1);
    expect(chips.length).toBeLessThanOrEqual(4);
  });
});
