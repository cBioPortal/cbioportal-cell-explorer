import * as zarr from "zarrita";
import type { Readable } from "zarrita";

type ZarrGroup = zarr.Group<Readable>;
type ZarrArray = zarr.Array<zarr.DataType, Readable>;
type ZarrLocation = zarr.Location<Readable>;

export type OpenFn = (
  location: ZarrLocation,
  opts: { kind: "array" | "group" },
) => Promise<ZarrArray | ZarrGroup>;

export interface ArrayResult {
  data: zarr.TypedArray<zarr.DataType>;
  shape: number[];
}

export interface SparseMatrix {
  format: string;
  data: zarr.TypedArray<zarr.DataType>;
  indices: zarr.TypedArray<zarr.DataType>;
  indptr: zarr.TypedArray<zarr.DataType>;
  shape: number[];
}

export interface Categorical {
  values: (string | number | null)[];
  categories: zarr.TypedArray<zarr.DataType> | string[];
  ordered: boolean;
}

export interface Nullable {
  values: (number | boolean | null)[];
  mask: zarr.TypedArray<zarr.DataType>;
}

export interface NullableString {
  values: (string | null)[];
  mask: zarr.TypedArray<zarr.DataType>;
}

export interface Dataframe {
  index: (string | null)[];
  columns: Record<string, zarr.TypedArray<zarr.DataType> | (string | number | null)[]>;
  columnOrder: string[];
}

// Default opener tries v2 first, then v3
const defaultOpen: OpenFn = async (location, opts) => {
  try {
    return await zarr.open.v2(location, opts as { kind: "array" });
  } catch {
    return await zarr.open.v3(location, opts as { kind: "array" });
  }
};

export async function readArray(
  arr: ZarrArray,
  signal?: AbortSignal,
): Promise<ArrayResult> {
  const chunk = await zarr.get(arr, null, signal ? { opts: { signal } } : {});
  return { data: chunk.data, shape: chunk.shape };
}

export async function readArraySliced(
  arr: ZarrArray,
  dims: number,
  signal?: AbortSignal,
): Promise<ArrayResult> {
  if (arr.shape.length < 2 || arr.shape[1] <= dims) {
    return readArray(arr, signal);
  }
  const chunk = await zarr.get(
    arr,
    [null, zarr.slice(0, dims)],
    signal ? { opts: { signal } } : {},
  );
  return { data: chunk.data, shape: chunk.shape };
}

export function toStringArray(
  data: zarr.TypedArray<zarr.DataType> | string[],
): string[] {
  if (Array.isArray(data)) return data as string[];
  if (typeof (data as unknown as Record<number, unknown>)[0] === "string")
    return Array.from(data as Iterable<string>);
  // zarrita may return a TypedArray of bytes for vlen-utf8; decode if needed
  if (data instanceof Uint8Array) {
    const decoder = new TextDecoder();
    return decoder.decode(data).split("\0").filter(Boolean);
  }
  return Array.from(data as ArrayLike<unknown>, (v) => String(v));
}

/**
 * View a mask's bytes without copying. zarrita returns a BoolArray for bool data (no numeric
 * indexing, one byte per element, exposing buffer/byteOffset/length); plain typed arrays also work.
 */
function maskBytes(data: zarr.TypedArray<zarr.DataType> | string[]): Uint8Array {
  const d = data as unknown as { buffer: ArrayBuffer; byteOffset: number; length: number };
  return new Uint8Array(d.buffer, d.byteOffset, d.length);
}

/** Open the values and mask arrays of a nullable-* group and read them concurrently. */
async function readValuesAndMask(
  group: ZarrGroup,
  open: OpenFn,
  signal?: AbortSignal,
): Promise<{
  valuesData: zarr.TypedArray<zarr.DataType>;
  maskData: zarr.TypedArray<zarr.DataType>;
  mask: Uint8Array;
  anyMissing: boolean;
}> {
  const [valuesArr, maskArr] = (await Promise.all([
    open(group.resolve("values"), { kind: "array" }),
    open(group.resolve("mask"), { kind: "array" }),
  ])) as [ZarrArray, ZarrArray];
  const [valuesResult, maskResult] = await Promise.all([
    readArray(valuesArr, signal),
    readArray(maskArr, signal),
  ]);
  const mask = maskBytes(maskResult.data);
  return {
    valuesData: valuesResult.data,
    maskData: maskResult.data,
    mask,
    anyMissing: mask.indexOf(1) !== -1,
  };
}

/**
 * Open a node as an array, falling back to a group only when opening as an array fails.
 * Read errors are the caller's to surface, so they are never mistaken for "not an array".
 */
async function openArrayOrGroup(
  location: ZarrLocation,
  open: OpenFn,
): Promise<{ array: ZarrArray; group?: undefined } | { group: ZarrGroup; array?: undefined }> {
  // Array first: plain columns/indexes are the common case, and on v2 stores a group probe is an extra 404
  let array: ZarrArray;
  try {
    array = (await open(location, { kind: "array" })) as ZarrArray;
  } catch {
    return { group: (await open(location, { kind: "group" })) as ZarrGroup };
  }
  return { array };
}

export async function decodeNullableString(
  group: ZarrGroup,
  open: OpenFn = defaultOpen,
  signal?: AbortSignal,
): Promise<(string | null)[]> {
  const { valuesData, mask, anyMissing } = await readValuesAndMask(group, open, signal);
  const values: (string | null)[] = toStringArray(valuesData);
  // Nothing missing: return the values as-is, no copy
  if (!anyMissing) return values;
  const out = values.slice();
  for (let i = 0; i < out.length; i++) if (mask[i]) out[i] = null;
  return out;
}

/** Read a dataframe index stored as a plain array, a categorical group or a nullable-string group. */
export async function decodeIndex(
  group: ZarrGroup,
  indexKey: string,
  open: OpenFn = defaultOpen,
  signal?: AbortSignal,
): Promise<(string | number | null)[]> {
  const opened = await openArrayOrGroup(group.resolve(indexKey), open);
  if (opened.array) return toStringArray((await readArray(opened.array, signal)).data);
  const node = opened.group;
  if (node.attrs?.["encoding-type"] === "nullable-string-array") {
    return decodeNullableString(node, open, signal);
  }
  return (await decodeCategorical(node, open, signal)).values;
}

export async function decodeCategorical(
  group: ZarrGroup,
  open: OpenFn = defaultOpen,
  signal?: AbortSignal,
): Promise<Categorical> {
  const codes = (await open(group.resolve("codes"), { kind: "array" })) as ZarrArray;
  const categories = (await open(group.resolve("categories"), {
    kind: "array",
  })) as ZarrArray;
  const codesResult = await readArray(codes, signal);
  const categoriesResult = await readArray(categories, signal);
  const ordered = (group.attrs?.ordered as boolean) ?? false;

  const catValues =
    typeof (categoriesResult.data as unknown as Record<number, unknown>)[0] === "string" ||
    categoriesResult.data instanceof Array
      ? toStringArray(categoriesResult.data)
      : categoriesResult.data;

  const values = Array.from(codesResult.data as ArrayLike<number>, (code) =>
    code < 0 ? null : (catValues as ArrayLike<string | number>)[code],
  );

  return { values, categories: catValues, ordered };
}

export async function decodeColumn(
  group: ZarrGroup,
  colName: string,
  open: OpenFn = defaultOpen,
  signal?: AbortSignal,
): Promise<zarr.TypedArray<zarr.DataType> | (string | number | null)[]> {
  let node: ZarrGroup;
  try {
    // Group first: categorical and nullable columns are groups, and on v2 consolidated
    // stores their .zgroup is served from the metadata cache
    node = (await open(group.resolve(colName), { kind: "group" })) as ZarrGroup;
  } catch {
    // not a group — open as array
    const arr = (await open(group.resolve(colName), { kind: "array" })) as ZarrArray;
    const result = await readArray(arr, signal);
    if (
      typeof (result.data as unknown as Record<number, unknown>)[0] === "string" ||
      result.data instanceof Array
    ) {
      return toStringArray(result.data);
    }
    return result.data;
  }

  const encodingType = node.attrs?.["encoding-type"] as string | undefined;
  if (encodingType === "categorical") {
    const decoded = await decodeCategorical(node, open, signal);
    return decoded.values;
  }
  if (
    encodingType === "nullable-integer" ||
    encodingType === "nullable-boolean"
  ) {
    const decoded = await decodeNullable(node, open, signal);
    return decoded.values;
  }
  if (encodingType === "nullable-string-array") {
    return decodeNullableString(node, open, signal);
  }
  // fallback: try reading as categorical (common even without explicit encoding-type)
  try {
    const decoded = await decodeCategorical(node, open, signal);
    return decoded.values;
  } catch {
    throw new Error(
      `Unknown column encoding-type "${encodingType}" for column "${colName}"`,
    );
  }
}

export async function decodeDataframe(
  group: ZarrGroup,
  open: OpenFn = defaultOpen,
): Promise<Dataframe> {
  const attrs = group.attrs;
  const indexKey = attrs["_index"] as string;
  const columnOrder = attrs["column-order"] as string[];

  const rawIndex = await decodeIndex(group, indexKey, open);
  // Only copy when some entry isn't already a string or null (e.g. a numeric index);
  // missing entries stay null, matching obsNames()/varNames()
  const index = rawIndex.every((v) => v === null || typeof v === "string")
    ? (rawIndex as (string | null)[])
    : rawIndex.map((v) => (v === null ? null : String(v)));

  const columns: Record<string, zarr.TypedArray<zarr.DataType> | (string | number | null)[]> = {};
  for (const colName of columnOrder) {
    columns[colName] = await decodeColumn(group, colName, open);
  }

  return { index, columns, columnOrder: Array.from(columnOrder) };
}

export async function decodeNullable(
  group: ZarrGroup,
  open: OpenFn = defaultOpen,
  signal?: AbortSignal,
): Promise<Nullable> {
  const { valuesData, maskData, mask, anyMissing } = await readValuesAndMask(group, open, signal);
  const values = Array.from(
    valuesData as ArrayLike<number | boolean>,
    (v, i) => {
      if (anyMissing && mask[i]) return null;
      // Convert BigInt to number if needed
      return typeof v === "bigint" ? Number(v) : v;
    },
  );

  return { values, mask: maskData };
}

export async function decodeSparseMatrix(
  group: ZarrGroup,
  open: OpenFn = defaultOpen,
): Promise<SparseMatrix> {
  const attrs = group.attrs;
  const format = (attrs["encoding-type"] as string)?.replace("_matrix", ""); // "csr" or "csc"
  const shape = attrs.shape as number[];

  const dataArr = (await open(group.resolve("data"), { kind: "array" })) as ZarrArray;
  const indicesArr = (await open(group.resolve("indices"), {
    kind: "array",
  })) as ZarrArray;
  const indptrArr = (await open(group.resolve("indptr"), {
    kind: "array",
  })) as ZarrArray;

  const [dataResult, indicesResult, indptrResult] = await Promise.all([
    readArray(dataArr),
    readArray(indicesArr),
    readArray(indptrArr),
  ]);

  return {
    format,
    data: dataResult.data,
    indices: indicesResult.data,
    indptr: indptrResult.data,
    shape,
  };
}

export function sparseToDense(sparse: SparseMatrix): ArrayResult {
  const { format, data, indices, indptr, shape } = sparse;
  const [nRows, nCols] = shape;
  const dense = new Float64Array(nRows * nCols);

  const numData = data as ArrayLike<number>;
  const numIndices = indices as ArrayLike<number>;
  const numIndptr = indptr as ArrayLike<number>;

  if (format === "csr") {
    for (let row = 0; row < nRows; row++) {
      for (let j = numIndptr[row]; j < numIndptr[row + 1]; j++) {
        dense[row * nCols + numIndices[j]] = numData[j];
      }
    }
  } else if (format === "csc") {
    for (let col = 0; col < nCols; col++) {
      for (let j = numIndptr[col]; j < numIndptr[col + 1]; j++) {
        dense[numIndices[j] * nCols + col] = numData[j];
      }
    }
  } else {
    throw new Error(`Unknown sparse format: "${format}"`);
  }

  return { data: dense, shape };
}

export type DecodeNodeResult =
  | Dataframe
  | SparseMatrix
  | Categorical
  | Nullable
  | NullableString
  | ArrayResult
  | { attrs: Record<string, unknown> };

export async function decodeNode(
  location: ZarrGroup,
  open: OpenFn = defaultOpen,
): Promise<DecodeNodeResult> {
  const attrs = location.attrs;
  const encodingType = attrs?.["encoding-type"] as string | undefined;

  switch (encodingType) {
    case "anndata":
      throw new Error(
        'Use AnnDataStore.open() to read an anndata root, not decodeNode()',
      );
    case "dataframe":
      return decodeDataframe(location, open);
    case "csr_matrix":
    case "csc_matrix":
      return decodeSparseMatrix(location, open);
    case "categorical":
      return decodeCategorical(location, open);
    case "nullable-integer":
    case "nullable-boolean":
      return decodeNullable(location, open);
    case "nullable-string-array": {
      const { valuesData, maskData, mask, anyMissing } = await readValuesAndMask(location, open);
      const values: (string | null)[] = toStringArray(valuesData);
      const out = anyMissing ? values.map((v, i) => (mask[i] ? null : v)) : values;
      return { values: out, mask: maskData };
    }
    default: {
      // Dense array or unknown group — try as array first
      try {
        const arr = (await open(location, { kind: "array" })) as ZarrArray;
        return readArray(arr);
      } catch {
        // Return the group attrs for unrecognized groups
        return { attrs };
      }
    }
  }
}
