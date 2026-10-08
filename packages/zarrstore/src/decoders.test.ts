import { describe, it, expect, vi } from "vitest";
import { decodeDataframe, decodeIndex, sparseToDense, toStringArray } from "./decoders";
// Lets a test substitute zarr.get for stub arrays; passes through to zarrita otherwise
const getOverride = vi.hoisted(() => ({ fn: null as null | ((...a: unknown[]) => unknown) }));
vi.mock("zarrita", async (orig) => {
  const actual = await orig<typeof import("zarrita")>();
  return {
    ...actual,
    get: (...a: unknown[]) =>
      getOverride.fn ? getOverride.fn(...a) : (actual.get as (...a: unknown[]) => unknown)(...a),
  };
});

import type { OpenFn, SparseMatrix } from "./decoders";

describe("sparseToDense", () => {
  it("converts a CSR sparse matrix to dense", () => {
    // 3x3 matrix:
    // [1, 0, 2]
    // [0, 0, 3]
    // [4, 5, 0]
    const sparse: SparseMatrix = {
      format: "csr",
      data: new Float64Array([1, 2, 3, 4, 5]),
      indices: new Int32Array([0, 2, 2, 0, 1]),
      indptr: new Int32Array([0, 2, 3, 5]),
      shape: [3, 3],
    };

    const result = sparseToDense(sparse);

    expect(result.shape).toEqual([3, 3]);
    expect(Array.from(result.data as Float64Array)).toEqual([1, 0, 2, 0, 0, 3, 4, 5, 0]);
  });

  it("converts a CSC sparse matrix to dense", () => {
    // 3x3 matrix:
    // [1, 0, 2]
    // [0, 0, 3]
    // [4, 5, 0]
    const sparse: SparseMatrix = {
      format: "csc",
      data: new Float64Array([1, 4, 5, 2, 3]),
      indices: new Int32Array([0, 2, 2, 0, 1]),
      indptr: new Int32Array([0, 2, 3, 5]),
      shape: [3, 3],
    };

    const result = sparseToDense(sparse);

    expect(result.shape).toEqual([3, 3]);
    expect(Array.from(result.data as Float64Array)).toEqual([1, 0, 2, 0, 0, 3, 4, 5, 0]);
  });

  it("handles an empty sparse matrix", () => {
    const sparse: SparseMatrix = {
      format: "csr",
      data: new Float64Array([]),
      indices: new Int32Array([]),
      indptr: new Int32Array([0, 0, 0]),
      shape: [2, 3],
    };

    const result = sparseToDense(sparse);

    expect(result.shape).toEqual([2, 3]);
    expect(Array.from(result.data as Float64Array)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it("handles a 1x1 sparse matrix", () => {
    const sparse: SparseMatrix = {
      format: "csr",
      data: new Float64Array([7]),
      indices: new Int32Array([0]),
      indptr: new Int32Array([0, 1]),
      shape: [1, 1],
    };

    const result = sparseToDense(sparse);

    expect(result.shape).toEqual([1, 1]);
    expect(Array.from(result.data as Float64Array)).toEqual([7]);
  });

  it("throws on unknown sparse format", () => {
    const sparse: SparseMatrix = {
      format: "coo",
      data: new Float64Array([1]),
      indices: new Int32Array([0]),
      indptr: new Int32Array([0, 1]),
      shape: [1, 1],
    };

    expect(() => sparseToDense(sparse)).toThrow('Unknown sparse format: "coo"');
  });
});

describe("toStringArray", () => {
  it("returns plain arrays as-is", () => {
    const input = ["a", "b", "c"];
    expect(toStringArray(input)).toBe(input);
  });

  it("converts array-like of strings", () => {
    const input = { 0: "x", 1: "y", length: 2, [Symbol.iterator]: Array.prototype[Symbol.iterator] };
    // toStringArray should handle iterables with string elements
    const result = toStringArray(Array.from(input as Iterable<string>));
    expect(result).toEqual(["x", "y"]);
  });

  it("converts non-string typed array elements to strings", () => {
    const input = new Int32Array([1, 2, 3]);
    const result = toStringArray(input);
    expect(result).toEqual(["1", "2", "3"]);
  });
});

// Minimal stand-ins for zarrita nodes: only what the decoders touch
const fakeGroup = (attrs: Record<string, unknown> = {}) =>
  ({ attrs, resolve: (path: string) => ({ path }) }) as never;

describe("decodeIndex error handling", () => {
  it("propagates a read error from a plain-array index instead of probing for a group", async () => {
    const kinds: string[] = [];
    // zarr.get on the stub array fails with a distinctive error
    const boom = new Error("HTTP 503 reading chunk");
    const arr = {
      get shape(): number[] {
        throw boom;
      },
    };
    const open = (async (_loc: unknown, opts: { kind: string }) => {
      kinds.push(opts.kind);
      if (opts.kind === "array") return arr;
      throw new Error("node not found");
    }) as unknown as OpenFn;
    await expect(decodeIndex(fakeGroup(), "_index", open)).rejects.toBe(boom);
    expect(kinds).toEqual(["array"]);
  });
});

describe("decodeDataframe missing index entries", () => {
  it("keeps a missing index entry as null rather than the string 'null'", async () => {
    const group = fakeGroup({ _index: "_index", "column-order": [] });
    const nullableIndex = {
      attrs: { "encoding-type": "nullable-string-array" },
      resolve: (path: string) => ({ path }),
    };
    const arrays: Record<string, unknown> = {
      values: { data: ["a", "x", "y"] },
      mask: { data: new Uint8Array([0, 1, 1]) },
    };
    const open = (async (loc: { path: string }, opts: { kind: string }) => {
      if (loc.path === "_index") {
        if (opts.kind === "array") throw new Error("is a group");
        return nullableIndex;
      }
      return { __arr: arrays[loc.path] };
    }) as unknown as OpenFn;
    getOverride.fn = async (a: unknown) => ({
      data: (a as { __arr: { data: unknown } }).__arr.data,
      shape: [3],
    });
    try {
      const df = await decodeDataframe(group, open);
      expect(df.index).toEqual(["a", null, null]);
    } finally {
      getOverride.fn = null;
    }
  });
});
