#!/usr/bin/env tsx

import { Float16Array } from "@petamoriken/float16";
if (!globalThis.Float16Array) {
  (globalThis as any).Float16Array = Float16Array;
}

import { parseGlobalArgs } from "./util/args.ts";
import { info } from "./commands/info.ts";
import { obs } from "./commands/obs.ts";
import { varCmd } from "./commands/var.ts";
import { expression } from "./commands/expression.ts";
import { embedding } from "./commands/embedding.ts";

const COMMANDS: Record<string, (opts: ReturnType<typeof parseGlobalArgs>) => Promise<void>> = {
  info,
  obs,
  var: varCmd,
  expression,
  embedding,
};

const USAGE = `Usage: cbioportal-cell-explorer <command> [options]

Commands:
  info                          Show dataset overview (shape, columns, embeddings)
  obs [column]                  List obs columns or show value counts for a column
  var [--search <pattern>]      List or search gene names
  expression <gene>             Show expression stats, optionally grouped
    [--group-by <obs_column>]
  embedding [key] [--limit N]   List or dump embedding coordinates

Global options:
  --url <zarr_url>              Zarr dataset URL (default: spectrum dataset)
  --json                        Output as JSON
  -h, --help                    Show help`;

async function main() {
  const opts = parseGlobalArgs(process.argv);

  if (opts.help && !opts.command) {
    console.log(USAGE);
    process.exit(0);
  }

  const handler = COMMANDS[opts.command];
  if (!handler) {
    if (opts.command) {
      console.error(`Unknown command: ${opts.command}`);
    }
    console.error(USAGE);
    process.exit(1);
  }

  await handler(opts);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
