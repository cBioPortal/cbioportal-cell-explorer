import { parseArgs } from "node:util";
import { AnnDataStore } from "@cbioportal-cell-explorer/zarrstore";

export const DEFAULT_URL =
  "https://cbioportal-public-imaging.assets.cbioportal.org/msk_spectrum_tme_2022/zarr/spectrum_all_cells-f16-zstd-c1s30-v3.zarr/";

export interface GlobalOpts {
  url: string;
  json: boolean;
  help: boolean;
  command: string;
  rest: string[];
}

export function parseGlobalArgs(argv: string[]): GlobalOpts {
  // Find subcommand: first positional arg
  const args = argv.slice(2);
  const command = args[0] && !args[0].startsWith("-") ? args[0] : "";
  const rest = command ? args.slice(1) : args;

  const { values } = parseArgs({
    args: rest,
    options: {
      url: { type: "string", default: DEFAULT_URL },
      json: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: true,
    strict: false,
  });

  return {
    url: (values.url as string) ?? DEFAULT_URL,
    json: (values.json as boolean) ?? false,
    help: (values.help as boolean) ?? false,
    command,
    rest,
  };
}

export async function openStore(url: string): Promise<AnnDataStore> {
  process.stderr.write("Loading dataset...");
  try {
    const adata = await AnnDataStore.open(url);
    process.stderr.write("\r\x1b[K");
    return adata;
  } catch (err) {
    process.stderr.write("\r\x1b[K");
    throw err;
  }
}
