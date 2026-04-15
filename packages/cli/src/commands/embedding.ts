import { parseArgs } from "node:util";
import type { GlobalOpts } from "../util/args.ts";
import { openStore } from "../util/args.ts";
import { printTable, printJson } from "../util/format.ts";

export async function embedding(opts: GlobalOpts): Promise<void> {
  const { values, positionals } = parseArgs({
    args: opts.rest,
    options: {
      url: { type: "string" },
      json: { type: "boolean" },
      help: { type: "boolean", short: "h" },
      limit: { type: "string", short: "n" },
    },
    allowPositionals: true,
    strict: false,
  });

  const key = positionals[0];
  const limit = values.limit ? parseInt(values.limit as string, 10) : undefined;

  const adata = await openStore(opts.url);

  if (!key) {
    const keys = adata.obsmKeys();
    if (opts.json) {
      printJson(keys);
    } else {
      console.log(`Embeddings (${keys.length}):`);
      for (const k of keys) {
        console.log(`  ${k}`);
      }
    }
    return;
  }

  const result = await adata.obsm(key);

  if (!("data" in result) || !("shape" in result)) {
    console.error("Embedding data is not a dense array (sparse not supported for display).");
    process.exit(1);
  }

  const { data, shape } = result;
  const nRows = shape[0];
  const nDims = shape.length > 1 ? shape[1] : 1;
  const cap = opts.json ? (limit ?? nRows) : (limit ?? 10);
  const display = Math.min(cap, nRows);

  if (opts.json) {
    const rows: number[][] = [];
    for (let i = 0; i < display; i++) {
      const row: number[] = [];
      for (let d = 0; d < nDims; d++) {
        row.push((data as ArrayLike<number>)[i * nDims + d]);
      }
      rows.push(row);
    }
    printJson({ key, shape, rows });
    return;
  }

  console.log(`Embedding: ${key} | Shape: ${nRows.toLocaleString("en-US")} x ${nDims}`);
  console.log();

  const headers = ["Index", ...Array.from({ length: nDims }, (_, d) => `Dim${d + 1}`)];
  const rows: (string | number)[][] = [];
  for (let i = 0; i < display; i++) {
    const row: (string | number)[] = [i];
    for (let d = 0; d < nDims; d++) {
      row.push((data as ArrayLike<number>)[i * nDims + d]);
    }
    rows.push(row);
  }

  printTable(headers, rows);
  if (display < nRows) {
    console.log(`  ... ${(nRows - display).toLocaleString("en-US")} more rows (use --limit or --json)`);
  }
}
