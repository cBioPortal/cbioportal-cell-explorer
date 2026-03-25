import { parseArgs } from "node:util";
import type { GlobalOpts } from "../util/args.ts";
import { openStore } from "../util/args.ts";
import { printTable, printJson, formatNumber } from "../util/format.ts";
import { computeStats } from "../util/stats.ts";

export async function obs(opts: GlobalOpts): Promise<void> {
  const { positionals } = parseArgs({
    args: opts.rest,
    options: {
      url: { type: "string" },
      json: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
    strict: false,
  });

  const columnName = positionals[0];
  const adata = await openStore(opts.url);

  if (!columnName) {
    const columns = await adata.obsColumns();
    if (opts.json) {
      printJson(columns);
    } else {
      console.log(`Obs columns (${columns.length}):`);
      for (const col of columns) {
        console.log(`  ${col}`);
      }
    }
    return;
  }

  const data = await adata.obsColumn(columnName);

  // Check if it's a TypedArray (numeric) or regular array (categorical)
  if (ArrayBuffer.isView(data)) {
    const stats = computeStats(data as ArrayLike<number>);
    if (opts.json) {
      printJson({ column: columnName, type: "numeric", ...stats });
    } else {
      console.log(`Column: ${columnName} (numeric, ${stats.count.toLocaleString("en-US")} values)`);
      console.log();
      printTable(
        ["Stat", "Value"],
        [
          ["Count", stats.count],
          ["Mean", stats.mean],
          ["Median", stats.median],
          ["Std", stats.std],
          ["Min", stats.min],
          ["Max", stats.max],
          ["Non-zero", `${stats.nonzeroCount.toLocaleString("en-US")} (${formatNumber(stats.nonzeroPct)}%)`],
        ],
      );
    }
    return;
  }

  // Categorical: compute value counts
  const counts = new Map<string, number>();
  for (const val of data) {
    const key = String(val ?? "null");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

  if (opts.json) {
    printJson({
      column: columnName,
      type: "categorical",
      nCategories: sorted.length,
      valueCounts: Object.fromEntries(sorted),
    });
  } else {
    console.log(`Column: ${columnName} (categorical, ${sorted.length} categories, ${data.length.toLocaleString("en-US")} values)`);
    console.log();
    printTable(
      ["Value", "Count", "Pct"],
      sorted.map(([val, count]) => [val, count, `${((count / data.length) * 100).toFixed(1)}%`]),
    );
  }
}
