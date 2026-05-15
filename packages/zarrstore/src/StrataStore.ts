import { ZarrStore } from "./ZarrStore";
import { ProfileCollector, startMeasure } from "./ProfileCollector";
import type { MeasureExtra } from "./ProfileCollector";
import { readArray, toStringArray } from "./decoders";

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
  #cache = new Map<string, Promise<unknown>>();
  #settled = new Set<string>();

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

  // --- Reads ---

  readCoarse(slug: string, signal?: AbortSignal): Promise<CoarseStrataTable> {
    if (!this.#coarseAxes.has(slug)) {
      throw new Error(`Unknown coarse slug: ${slug}`);
    }
    const cacheKey = `coarse:${slug}`;
    if (signal && this.#cache.has(cacheKey) && !this.#settled.has(cacheKey)) {
      this.#cache.delete(cacheKey);
    }
    return this.#cached(cacheKey, () =>
      this.#fetchCoarse(slug, signal),
    ) as Promise<CoarseStrataTable>;
  }

  async #fetchCoarse(slug: string, signal?: AbortSignal): Promise<CoarseStrataTable> {
    const groupPath = `uns/strata/coarse_${slug}`;
    const [sumX, sumXX, nnz, nCells, stratumKeys] = await Promise.all([
      this.#readFloat32(`${groupPath}/sum_x`, signal),
      this.#readFloat32(`${groupPath}/sum_xx`, signal),
      this.#readInt32(`${groupPath}/nnz`, signal),
      this.#readInt32(`${groupPath}/n_cells`, signal),
      this.#readStringMatrix(`${groupPath}/stratum_keys`, signal),
    ]);
    const schemaVersion = this.#readSchemaVersion(groupPath);
    return {
      kind: "coarse",
      slug,
      axes: this.coarseAxes(slug),
      stratumKeys,
      geneIndices: null,
      sumX,
      sumXX,
      nnz,
      nCells,
      schemaVersion,
    };
  }

  async #readFloat32(path: string, signal?: AbortSignal): Promise<Float32Array> {
    const arr = await this.zarrStore.openArray(path);
    const result = await readArray(arr, signal);
    return new Float32Array(result.data as ArrayLike<number>);
  }

  async #readInt32(path: string, signal?: AbortSignal): Promise<Int32Array> {
    const arr = await this.zarrStore.openArray(path);
    const result = await readArray(arr, signal);
    return new Int32Array(result.data as ArrayLike<number>);
  }

  async #readStringMatrix(path: string, signal?: AbortSignal): Promise<string[][]> {
    // Check consolidated metadata for the data_type — fixed_length_utf32 is not
    // supported by zarrita so we decode raw chunk bytes manually.
    const meta = this.zarrStore.consolidatedMetadata;
    const arrayMeta = meta?.[path] as Record<string, unknown> | undefined;
    const dataType = arrayMeta?.data_type;
    const isFixedUtf32 =
      dataType !== null &&
      typeof dataType === "object" &&
      (dataType as Record<string, unknown>).name === "fixed_length_utf32";

    if (isFixedUtf32) {
      return this.#readFixedUtf32Matrix(path, arrayMeta!, signal);
    }

    // Standard path: zarrita can open the array directly.
    const arr = await this.zarrStore.openArray(path);
    const result = await readArray(arr, signal);
    const flat = toStringArray(result.data);
    const nRows = result.shape[0];
    const nCols = result.shape[1] ?? 1;
    const matrix: string[][] = [];
    for (let i = 0; i < nRows; i++) {
      matrix.push(flat.slice(i * nCols, (i + 1) * nCols));
    }
    return matrix;
  }

  /**
   * Read a fixed_length_utf32 zarr v3 array by fetching raw chunk bytes and
   * decoding UTF-32LE manually (zarrita doesn't support this dtype).
   */
  async #readFixedUtf32Matrix(
    path: string,
    arrayMeta: Record<string, unknown>,
    _signal?: AbortSignal,
  ): Promise<string[][]> {
    const shape = arrayMeta.shape as number[];
    const nRows = shape[0];
    const nCols = shape[1] ?? 1;
    const dataType = arrayMeta.data_type as Record<string, unknown>;
    const dtConfig = dataType.configuration as Record<string, unknown>;
    const lengthBytes = dtConfig.length_bytes as number; // bytes per string
    const charsPerString = lengthBytes / 4; // UTF-32 = 4 bytes per code point

    // Determine chunk key. For a single chunk (chunk covers whole array), key = c/0/0
    // More generally: chunk grid index is 0 for each dim.
    const chunkGrid = arrayMeta.chunk_grid as Record<string, unknown>;
    const chunkConfig = chunkGrid.configuration as Record<string, unknown>;
    const chunkShape = chunkConfig.chunk_shape as number[];
    const nChunkRows = Math.ceil(nRows / chunkShape[0]);
    const nChunkCols = Math.ceil(nCols / (chunkShape[1] ?? 1));

    const codecs = arrayMeta.codecs as Array<Record<string, unknown>>;
    // Bytes-to-bytes codecs (all except the last "bytes" or "vlen-utf8" codec)
    // For fixed_length_utf32 with [bytes, zstd], bytes is array_to_bytes, zstd is bytes_to_bytes
    const bytesToBytesCodecs = codecs.filter(
      (c) => c.name !== "bytes" && c.name !== "vlen-utf8",
    );

    const flat: string[] = [];

    for (let ri = 0; ri < nChunkRows; ri++) {
      for (let ci = 0; ci < nChunkCols; ci++) {
        const chunkKey = `/${path}/c/${ri}/${ci}`;
        const rawBytes = await this.zarrStore.store.get(
          chunkKey as `/${string}`,
        );
        if (!rawBytes) {
          throw new Error(`Missing chunk: ${chunkKey}`);
        }

        // Decompress bytes-to-bytes codecs in reverse (only one: zstd here)
        let bytes: Uint8Array = rawBytes;
        for (let k = bytesToBytesCodecs.length - 1; k >= 0; k--) {
          const codecMeta = bytesToBytesCodecs[k];
          if (codecMeta.name === "zstd") {
            bytes = await StrataStore.#zstdDecompress(bytes);
          }
          // Other codecs (gzip, zlib) could be added here as needed
        }

        // Decode fixed_length_utf32 from raw bytes
        const chunkNRows = Math.min(chunkShape[0], nRows - ri * chunkShape[0]);
        const chunkNCols = chunkShape[1] ?? 1;
        const view = new DataView(
          bytes.buffer,
          bytes.byteOffset,
          bytes.byteLength,
        );
        for (let row = 0; row < chunkNRows; row++) {
          for (let col = 0; col < chunkNCols; col++) {
            const stringOffset = (row * chunkNCols + col) * lengthBytes;
            const chars: string[] = [];
            for (let c = 0; c < charsPerString; c++) {
              const cp = view.getUint32(stringOffset + c * 4, true /* little-endian */);
              if (cp !== 0) chars.push(String.fromCodePoint(cp));
            }
            flat.push(chars.join(""));
          }
        }
      }
    }

    const matrix: string[][] = [];
    for (let i = 0; i < nRows; i++) {
      matrix.push(flat.slice(i * nCols, (i + 1) * nCols));
    }
    return matrix;
  }

  static async #zstdDecompress(bytes: Uint8Array): Promise<Uint8Array> {
    // numcodecs/zstd is a transitive dependency via zarrita — safe to import.
    const { default: Zstd } = await import("numcodecs/zstd");
    const codec = Zstd.fromConfig({ id: "zstd", level: 0 });
    return codec.decode(bytes) as Promise<Uint8Array>;
  }

  #readSchemaVersion(groupPath: string): string {
    const meta = this.zarrStore.consolidatedMetadata;
    if (!meta) return "1.0";
    const attrs = StrataStore.#readGroupAttrs(meta, groupPath);
    return (attrs?.schema_version as string) ?? "1.0";
  }

  #cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.#cache.get(key);
    if (existing) {
      // Cache hit — fire a zero-duration measure
      const finish = startMeasure(`czl:strata:${key}`, true);
      const extra: MeasureExtra = { fetches: { requests: 0, bytes: 0, cacheHits: 0 } };
      finish(extra);
      return existing as Promise<T>;
    }
    const before = this.zarrStore.snapshotFetchStats();
    const finish = startMeasure(`czl:strata:${key}`, false);
    const promise = fn().then((result) => {
      this.#settled.add(key);
      const after = this.zarrStore.snapshotFetchStats();
      const fetches = {
        requests: after.requests - before.requests,
        bytes: after.bytes - before.bytes,
        cacheHits: after.cacheHits - before.cacheHits,
      };
      const extra: MeasureExtra = {};
      if (fetches.requests > 0 || fetches.bytes > 0) extra.fetches = fetches;
      finish(extra);
      return result;
    });
    promise.catch(() => {
      if (this.#cache.get(key) === promise) {
        this.#cache.delete(key);
        this.#settled.delete(key);
      }
    });
    this.#cache.set(key, promise);
    return promise as Promise<T>;
  }

  async readAtomic(signal?: AbortSignal): Promise<AtomicStrataTable> {
    if (!this.hasAtomic()) {
      throw new Error("no atomic table in this dataset");
    }
    const cacheKey = "atomic:full";
    if (signal && this.#cache.has(cacheKey) && !this.#settled.has(cacheKey)) {
      this.#cache.delete(cacheKey);
    }
    return this.#cached(cacheKey, () => this.#fetchAtomicFull(signal)) as Promise<AtomicStrataTable>;
  }

  async #fetchAtomicFull(signal?: AbortSignal): Promise<AtomicStrataTable> {
    const groupPath = "uns/strata/atomic";
    const [sumX, sumXX, nnz, nCells, stratumKeys] = await Promise.all([
      this.#readFloat32(`${groupPath}/sum_x`, signal),
      this.#readFloat32(`${groupPath}/sum_xx`, signal),
      this.#readInt32(`${groupPath}/nnz`, signal),
      this.#readInt32(`${groupPath}/n_cells`, signal),
      this.#readStringMatrix(`${groupPath}/stratum_keys`, signal),
    ]);
    const schemaVersion = this.#readSchemaVersion(groupPath);
    const axes = this.atomicAxes();
    if (!axes) throw new Error("no atomic axes after hasAtomic check");
    return {
      kind: "atomic",
      axes,
      stratumKeys,
      geneIndices: null,
      sumX,
      sumXX,
      nnz,
      nCells,
      schemaVersion,
    };
  }

  async readAtomicGenes(
    geneIndices: number[],
    signal?: AbortSignal,
  ): Promise<AtomicStrataTable> {
    if (!this.hasAtomic()) {
      throw new Error("no atomic table in this dataset");
    }
    const cacheKey = `atomic:genes:${geneIndices.join(",")}`;
    if (signal && this.#cache.has(cacheKey) && !this.#settled.has(cacheKey)) {
      this.#cache.delete(cacheKey);
    }
    return this.#cached(cacheKey, () => this.#fetchAtomicGenes(geneIndices, signal)) as Promise<AtomicStrataTable>;
  }

  async #fetchAtomicGenes(
    geneIndices: number[],
    signal?: AbortSignal,
  ): Promise<AtomicStrataTable> {
    const groupPath = "uns/strata/atomic";
    const [stratumKeys, nCells] = await Promise.all([
      this.#readStringMatrix(`${groupPath}/stratum_keys`, signal),
      this.#readInt32(`${groupPath}/n_cells`, signal),
    ]);
    const schemaVersion = this.#readSchemaVersion(groupPath);

    const axes = this.atomicAxes();
    if (!axes) throw new Error("no atomic axes after hasAtomic check");

    if (geneIndices.length === 0) {
      return {
        kind: "atomic",
        axes,
        stratumKeys,
        geneIndices: [],
        sumX: new Float32Array(0),
        sumXX: new Float32Array(0),
        nnz: new Int32Array(0),
        nCells,
        schemaVersion,
      };
    }

    const [sumX, sumXX, nnz] = await Promise.all([
      this.#readFloat32GenesSliced(`${groupPath}/sum_x`, geneIndices, signal),
      this.#readFloat32GenesSliced(`${groupPath}/sum_xx`, geneIndices, signal),
      this.#readInt32GenesSliced(`${groupPath}/nnz`, geneIndices, signal),
    ]);

    return {
      kind: "atomic",
      axes,
      stratumKeys,
      geneIndices: [...geneIndices],
      sumX,
      sumXX,
      nnz,
      nCells,
      schemaVersion,
    };
  }

  async #readFloat32GenesSliced(
    path: string,
    geneIndices: number[],
    _signal?: AbortSignal,
  ): Promise<Float32Array> {
    // v1 simplification: fetch the whole array, then slice in JS.
    // Future opt: zarrita fancy indexing to fetch only the gene-batch chunks
    // that contain geneIndices. Whole-fetch keeps the chunk-cache warm for
    // overlapping reads in the same session.
    const arr = await this.zarrStore.openArray(path);
    const result = await readArray(arr);
    const flat = result.data as ArrayLike<number>;
    const nGenes = result.shape[1];
    const nStrata = result.shape[0];
    const out = new Float32Array(nStrata * geneIndices.length);
    for (let row = 0; row < nStrata; row++) {
      for (let k = 0; k < geneIndices.length; k++) {
        out[row * geneIndices.length + k] = flat[row * nGenes + geneIndices[k]];
      }
    }
    return out;
  }

  async #readInt32GenesSliced(
    path: string,
    geneIndices: number[],
    _signal?: AbortSignal,
  ): Promise<Int32Array> {
    const arr = await this.zarrStore.openArray(path);
    const result = await readArray(arr);
    const flat = result.data as ArrayLike<number>;
    const nGenes = result.shape[1];
    const nStrata = result.shape[0];
    const out = new Int32Array(nStrata * geneIndices.length);
    for (let row = 0; row < nStrata; row++) {
      for (let k = 0; k < geneIndices.length; k++) {
        out[row * geneIndices.length + k] = flat[row * nGenes + geneIndices[k]];
      }
    }
    return out;
  }

  clearCache(): void {
    this.#cache.clear();
    this.#settled.clear();
  }
}

function setsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const aSet = new Set(a);
  for (const v of b) if (!aSet.has(v)) return false;
  return true;
}

/** Find a coarse slug whose axes match the given set exactly. Returns null if none match. */
export function findCoarseByAxes(
  strata: StrataStore,
  axes: string[],
): string | null {
  for (const slug of strata.coarseSlugs()) {
    if (setsEqual(strata.coarseAxes(slug), axes)) return slug;
  }
  return null;
}

/**
 * Find the smallest coarse table whose axes are a superset of the requested axes.
 * Useful when a query wants "by cell_type" and would accept any coarse containing
 * that axis. Returns null if no coarse covers all the requested axes.
 */
export function findCoarseCovering(
  strata: StrataStore,
  requiredAxes: string[],
): string | null {
  let best: { slug: string; size: number } | null = null;
  for (const slug of strata.coarseSlugs()) {
    const axes = strata.coarseAxes(slug);
    const covers = requiredAxes.every((a) => axes.includes(a));
    if (!covers) continue;
    if (!best || axes.length < best.size) {
      best = { slug, size: axes.length };
    }
  }
  return best?.slug ?? null;
}
