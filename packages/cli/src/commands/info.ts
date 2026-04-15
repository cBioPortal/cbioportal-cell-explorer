import type { GlobalOpts } from "../util/args.ts";
import { openStore } from "../util/args.ts";
import { printJson } from "../util/format.ts";

export async function info(opts: GlobalOpts): Promise<void> {
  const adata = await openStore(opts.url);

  const obsColumns = await adata.obsColumns();
  const varColumns = await adata.varColumns();
  const obsmKeys = adata.obsmKeys();

  if (opts.json) {
    printJson({
      url: opts.url,
      shape: adata.shape,
      nObs: adata.nObs,
      nVar: adata.nVar,
      attrs: adata.attrs,
      obsColumns,
      varColumns,
      obsmKeys,
    });
    return;
  }

  const urlName = opts.url.replace(/\/$/, "").split("/").pop() ?? opts.url;
  console.log(`Dataset: ${urlName}`);
  console.log(`Shape:   ${adata.nObs.toLocaleString("en-US")} cells x ${adata.nVar.toLocaleString("en-US")} genes`);
  console.log();
  console.log(`Obs columns (${obsColumns.length}):`);
  console.log(`  ${obsColumns.join(", ")}`);
  console.log();
  console.log(`Var columns (${varColumns.length}):`);
  console.log(`  ${varColumns.join(", ")}`);
  console.log();
  console.log(`Embeddings (${obsmKeys.length}):`);
  console.log(`  ${obsmKeys.length > 0 ? obsmKeys.join(", ") : "(none)"}`);
}
