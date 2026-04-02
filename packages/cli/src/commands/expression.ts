import { parseArgs } from "node:util";
import type { GlobalOpts } from "../util/args.ts";
import { openStore } from "../util/args.ts";
import { printTable, printJson, formatNumber } from "../util/format.ts";
import { computeStats, computeGroupedStats } from "../util/stats.ts";
import { resolveGeneName } from "../util/gene.ts";

export async function expression(opts: GlobalOpts): Promise<void> {
  const { values, positionals } = parseArgs({
    args: opts.rest,
    options: {
      url: { type: "string" },
      json: { type: "boolean" },
      help: { type: "boolean", short: "h" },
      "group-by": { type: "string", short: "g" },
      sort: { type: "string" },
    },
    allowPositionals: true,
    strict: false,
  });

  const geneInput = positionals[0];
  if (!geneInput) {
    console.error("Usage: cell-explorer expression <gene> [--group-by <obs_column>]");
    process.exit(1);
  }

  const groupBy = values["group-by"] as string | undefined;
  const sortBy = (values.sort as string | undefined) ?? "count";

  const adata = await openStore(opts.url);

  const geneName = await resolveGeneName(adata, geneInput);
  const displayName = geneName === geneInput ? geneName : `${geneInput} (${geneName})`;
  const expr = await adata.geneExpression(geneName);

  if (!groupBy) {
    const stats = computeStats(expr as ArrayLike<number>);
    if (opts.json) {
      printJson({ gene: geneInput, resolvedId: geneName, ...stats });
    } else {
      console.log(`Gene: ${displayName} | ${stats.count.toLocaleString("en-US")} cells`);
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

  const labels = await adata.obsColumn(groupBy);
  const grouped = computeGroupedStats(expr as ArrayLike<number>, labels as ArrayLike<string | number | null>);

  // Sort
  const sortKey = sortBy as keyof (typeof grouped)[0];
  if (sortKey && sortKey !== "count") {
    grouped.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === "number" && typeof vb === "number") return vb - va;
      return 0;
    });
  }

  if (opts.json) {
    printJson({ gene: geneInput, resolvedId: geneName, groupBy, groups: grouped });
  } else {
    const totalCells = grouped.reduce((s, g) => s + g.count, 0);
    console.log(`Gene: ${displayName} | Grouped by: ${groupBy} | ${totalCells.toLocaleString("en-US")} cells`);
    console.log();
    printTable(
      ["Group", "Count", "Mean", "Median", "Std", "Min", "Max", "NonZero%"],
      grouped.map((g) => [
        g.group,
        g.count,
        g.mean,
        g.median,
        g.std,
        g.min,
        g.max,
        `${g.nonzeroPct.toFixed(1)}%`,
      ]),
    );
  }
}
