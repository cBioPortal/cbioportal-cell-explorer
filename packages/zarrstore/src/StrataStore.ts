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

interface DiscoveredStrata {
  atomicAxes: string[] | null;
  atomicStrataCount: number | null;
  coarseSlugs: string[];
  coarseAxes: Map<string, string[]>;
  coarseStrataCount: Map<string, number>;
}

/**
 * Companion to AnnDataStore that reads uns/strata/* groups produced by
 * `cell2zarr build-strata`. See the design spec at
 * docs/superpowers/specs/2026-05-15-frontend-stratastore-design.md.
 */
export class StrataStore {
  #atomicAxes: string[] | null;
  #atomicStrataCount: number | null;
  #coarseSlugs: string[];
  #coarseAxes: Map<string, string[]>;
  #coarseStrataCount: Map<string, number>;

  private constructor(
    private readonly zarrStore: ZarrStore,
    readonly profiler: ProfileCollector,
    discovered: DiscoveredStrata,
  ) {
    this.#atomicAxes = discovered.atomicAxes;
    this.#atomicStrataCount = discovered.atomicStrataCount;
    this.#coarseSlugs = discovered.coarseSlugs;
    this.#coarseAxes = discovered.coarseAxes;
    this.#coarseStrataCount = discovered.coarseStrataCount;
  }

  static async fromZarrStore(
    zarrStore: ZarrStore,
    profiler?: ProfileCollector,
  ): Promise<StrataStore> {
    const discovered = StrataStore.#discover(zarrStore);
    return new StrataStore(zarrStore, profiler ?? new ProfileCollector(), discovered);
  }

  static async open(url: string, overrides?: RequestInit): Promise<StrataStore> {
    const zarrStore = await ZarrStore.open(url, overrides);
    const discovered = StrataStore.#discover(zarrStore);
    return new StrataStore(zarrStore, new ProfileCollector(), discovered);
  }

  /** Walk consolidated metadata to find what uns/strata/* groups exist. */
  static #discover(zarrStore: ZarrStore): DiscoveredStrata {
    const meta = zarrStore.consolidatedMetadata;
    let atomicAxes: string[] | null = null;
    let atomicStrataCount: number | null = null;
    const coarseSlugs: string[] = [];
    const coarseAxes = new Map<string, string[]>();
    const coarseStrataCount = new Map<string, number>();

    if (!meta) {
      return { atomicAxes, atomicStrataCount, coarseSlugs, coarseAxes, coarseStrataCount };
    }

    // Atomic group attrs.
    const atomicAttrs = StrataStore.#readGroupAttrs(meta, "uns/strata/atomic");
    if (atomicAttrs && atomicAttrs.schema_version != null) {
      atomicAxes = Array.isArray(atomicAttrs.axes) ? [...(atomicAttrs.axes as string[])] : null;
      atomicStrataCount = typeof atomicAttrs.n_strata === "number"
        ? atomicAttrs.n_strata
        : null;
    }

    // Coarse_* siblings. v3 keys are direct paths (e.g. "uns/strata/coarse_cell_type").
    // v2 keys are sub-files like "uns/strata/coarse_cell_type/.zattrs" or .zgroup.
    const seen = new Set<string>();
    for (const key of Object.keys(meta)) {
      const m = key.match(/^uns\/strata\/(coarse_[^/]+)(\/\.zattrs|\/\.zgroup)?$/);
      if (!m) continue;
      const groupName = m[1]; // e.g. "coarse_cell_type"
      if (seen.has(groupName)) continue;
      seen.add(groupName);

      const groupPath = `uns/strata/${groupName}`;
      const attrs = StrataStore.#readGroupAttrs(meta, groupPath);
      if (!attrs || attrs.schema_version == null) continue;

      const slug = groupName.slice("coarse_".length);
      coarseSlugs.push(slug);
      coarseAxes.set(slug, Array.isArray(attrs.axes) ? [...(attrs.axes as string[])] : []);
      coarseStrataCount.set(
        slug,
        typeof attrs.n_strata === "number" ? attrs.n_strata : 0,
      );
    }
    coarseSlugs.sort();

    return { atomicAxes, atomicStrataCount, coarseSlugs, coarseAxes, coarseStrataCount };
  }

  /** Resolve a group's attributes from consolidated metadata, v2 or v3. */
  static #readGroupAttrs(
    meta: Record<string, unknown>,
    path: string,
  ): Record<string, unknown> | null {
    // v3: attrs live inline on the group node, keyed by path
    const v3 = meta[path] as Record<string, unknown> | undefined;
    if (v3 && typeof v3 === "object" && v3.attributes && typeof v3.attributes === "object") {
      return v3.attributes as Record<string, unknown>;
    }
    // v2: attrs live in <path>/.zattrs
    const v2 = meta[`${path}/.zattrs`] as Record<string, unknown> | undefined;
    if (v2 && typeof v2 === "object") return v2;
    return null;
  }

  // --- Discovery (sync) ---

  hasAtomic(): boolean {
    return this.#atomicAxes !== null;
  }

  atomicAxes(): string[] | null {
    return this.#atomicAxes ? [...this.#atomicAxes] : null;
  }

  atomicStrataCount(): number | null {
    return this.#atomicStrataCount;
  }

  coarseSlugs(): string[] {
    return [...this.#coarseSlugs];
  }

  coarseAxes(slug: string): string[] {
    const axes = this.#coarseAxes.get(slug);
    if (!axes) throw new Error(`Unknown coarse slug: ${slug}`);
    return [...axes];
  }

  coarseStrataCount(slug: string): number {
    const count = this.#coarseStrataCount.get(slug);
    if (count == null) throw new Error(`Unknown coarse slug: ${slug}`);
    return count;
  }
}
