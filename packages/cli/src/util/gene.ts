import type { AnnDataStore } from "@cbioportal-cell-explorer/zarrstore";
import { GENE_SYMBOL_COLUMNS } from "@cbioportal-cell-explorer/zarrstore";

/**
 * Resolve a gene name input to its var index name.
 * First tries exact match against varNames (Ensembl IDs).
 * If not found, searches gene symbol columns (e.g. feature_name).
 * Returns the var index name to pass to geneExpression().
 */
export async function resolveGeneName(adata: AnnDataStore, input: string): Promise<string> {
  const varNames = await adata.varNames();

  // Exact match on var index
  if (varNames.includes(input)) {
    return input;
  }

  // Try gene symbol columns
  const varCols = await adata.varColumns();
  const candidates = GENE_SYMBOL_COLUMNS.filter((c) => varCols.includes(c));

  // Also try case-insensitive match on GENE_SYMBOL_COLUMNS
  if (candidates.length === 0) {
    const colsLower = varCols.map((c) => c.toLowerCase());
    for (const candidate of GENE_SYMBOL_COLUMNS) {
      const idx = colsLower.indexOf(candidate.toLowerCase());
      if (idx !== -1) {
        candidates.push(varCols[idx]);
        break;
      }
    }
  }

  for (const colName of candidates) {
    const symbols = await adata.varColumn(colName);
    const inputLower = input.toLowerCase();

    for (let i = 0; i < symbols.length; i++) {
      if (String(symbols[i]).toLowerCase() === inputLower) {
        return String(varNames[i]);
      }
    }
  }

  throw new Error(
    `Gene "${input}" not found. Try searching with: cbioportal-cell-explorer var --search ${input}`,
  );
}
