import { ZarrStore } from "./ZarrStore";
import { ProfileCollector } from "./ProfileCollector";

export type StrataTable = CoarseStrataTable | AtomicStrataTable;

interface BaseStrataTable {
  /** obs/ column names that define this table's stratification. */
  axes: string[];
  /** (nStrata, nAxes) — runtime labels per row, e.g. [['B cell', 'd1'], ...]. */
  stratumKeys: string[][];
  /** null = full-table read; otherwise the specific gene columns the caller requested. */
  geneIndices: number[] | null;
  /** Row-major (nStrata * geneCount) — sum of expression per (stratum, gene). */
  sumX: Float32Array;
  /** Row-major (nStrata * geneCount) — sum of squared expression. */
  sumXX: Float32Array;
  /** Row-major (nStrata * geneCount) — count of nonzero cells. */
  nnz: Int32Array;
  /** (nStrata,) — cell count per stratum. */
  nCells: Int32Array;
  /** Mirrors uns/strata/<group>/.attrs.schema_version, e.g. "1.0". */
  schemaVersion: string;
}

export interface CoarseStrataTable extends BaseStrataTable {
  kind: "coarse";
  /** Group name suffix in zarr, e.g. "cell_type" for uns/strata/coarse_cell_type. */
  slug: string;
}

export interface AtomicStrataTable extends BaseStrataTable {
  kind: "atomic";
}

/**
 * Companion to AnnDataStore that reads uns/strata/* groups produced by
 * `cell2zarr build-strata`. See the design spec at
 * docs/superpowers/specs/2026-05-15-frontend-stratastore-design.md.
 */
export class StrataStore {
  private constructor(
    private readonly zarrStore: ZarrStore,
    readonly profiler: ProfileCollector,
  ) {}

  static async fromZarrStore(
    zarrStore: ZarrStore,
    profiler?: ProfileCollector,
  ): Promise<StrataStore> {
    return new StrataStore(zarrStore, profiler ?? new ProfileCollector());
  }

  static async open(url: string, overrides?: RequestInit): Promise<StrataStore> {
    const zarrStore = await ZarrStore.open(url, overrides);
    return new StrataStore(zarrStore, new ProfileCollector());
  }
}
