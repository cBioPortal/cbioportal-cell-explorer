import { parseArgs } from "node:util";
import type { GlobalOpts } from "../util/args.ts";
import { openStore } from "../util/args.ts";
import { printTable, printJson } from "../util/format.ts";
import { GENE_SYMBOL_COLUMNS } from "@cbioportal-cell-explorer/zarrstore";

export async function varCmd(opts: GlobalOpts): Promise<void> {
  const { values } = parseArgs({
    args: opts.rest,
    options: {
      url: { type: "string" },
      json: { type: "boolean" },
      help: { type: "boolean", short: "h" },
      search: { type: "string", short: "s" },
      limit: { type: "string", short: "n" },
    },
    allowPositionals: true,
    strict: false,
  });

  const search = values.search as string | undefined;
  const limit = values.limit ? parseInt(values.limit as string, 10) : undefined;

  const adata = await openStore(opts.url);
  const varNames = await adata.varNames();

  // Try to find a gene symbol column for display
  const varCols = await adata.varColumns();
  let symbolCol: string | undefined;
  for (const candidate of GENE_SYMBOL_COLUMNS) {
    if (varCols.includes(candidate)) {
      symbolCol = candidate;
      break;
    }
    const idx = varCols.findIndex((c) => c.toLowerCase() === candidate.toLowerCase());
    if (idx !== -1) {
      symbolCol = varCols[idx];
      break;
    }
  }

  let symbols: (string | number | null)[] | null = null;
  if (symbolCol) {
    symbols = await adata.varColumn(symbolCol) as (string | number | null)[];
  }

  // Build display list with index
  type GeneEntry = { id: string; symbol: string | null; index: number };
  let entries: GeneEntry[] = varNames.map((name, i) => ({
    id: String(name),
    symbol: symbols ? String(symbols[i] ?? "") : null,
    index: i,
  }));

  if (search) {
    const pattern = search.toLowerCase();
    entries = entries.filter(
      (e) =>
        e.id.toLowerCase().includes(pattern) ||
        (e.symbol && e.symbol.toLowerCase().includes(pattern)),
    );
  }

  const total = entries.length;
  const cap = opts.json ? (limit ?? total) : (limit ?? 50);
  const display = entries.slice(0, cap);

  if (opts.json) {
    printJson({ total, genes: display });
  } else {
    if (search) {
      console.log(`Genes matching "${search}" (${total} results):`);
    } else {
      console.log(`Genes (${total} total):`);
    }
    console.log();
    if (symbols) {
      printTable(
        ["ID", "Symbol"],
        display.map((e) => [e.id, e.symbol ?? ""]),
      );
    } else {
      for (const e of display) {
        console.log(`  ${e.id}`);
      }
    }
    if (total > cap) {
      console.log(`  ... and ${total - cap} more (use --limit or --json to see all)`);
    }
  }
}
