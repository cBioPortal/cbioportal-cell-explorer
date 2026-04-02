---
name: zarr
description: Query cBioPortal cell-level zarr (AnnData) datasets. Use when the user asks about gene expression, cell types, cell metadata, embeddings, or dataset info from zarr files.
argument-hint: <natural language query about the dataset>
allowed-tools: [Bash]
---

# Zarr Dataset Query Skill

You have access to the `cbioportal-cell-explorer` CLI tool for querying AnnData-formatted zarr datasets. Translate the user's natural language query into CLI commands, run them, and summarize the results.

## How to run the CLI

Try these in order — use the first one that works:

1. **From the monorepo** (if working inside the repo):
   ```bash
   cd ${CLAUDE_PLUGIN_ROOT} && pnpm exec cbioportal-cell-explorer <command> [options]
   ```

2. **Via npx** (if the CLI is published to npm):
   ```bash
   npx @cbioportal-cell-explorer/cli <command> [options]
   ```

3. **Direct tsx** (fallback):
   ```bash
   npx --package=tsx tsx ${CLAUDE_PLUGIN_ROOT}/packages/cli/src/main.ts <command> [options]
   ```

## User query

$ARGUMENTS

## Available commands

### `info`
Show dataset overview: shape (cells x genes), obs columns, var columns, embedding keys.
```bash
cbioportal-cell-explorer info [--url <zarr_url>]
```

### `obs [column]`
Without a column name: lists all obs (cell metadata) column names.
With a column name: shows value counts for categorical columns or summary stats for numeric columns.
```bash
cbioportal-cell-explorer obs                    # list columns
cbioportal-cell-explorer obs cell_type          # value counts
cbioportal-cell-explorer obs percent.mt         # numeric stats
```

### `var [--search <pattern>]`
List or search gene names. Shows both Ensembl IDs and gene symbols.
```bash
cbioportal-cell-explorer var --limit 20         # first 20 genes
cbioportal-cell-explorer var --search EGFR      # search by symbol
cbioportal-cell-explorer var --search ENSG00    # search by ID
```

### `expression <gene> [--group-by <obs_column>]`
Get expression statistics for a gene. Accepts gene symbols (EGFR) or Ensembl IDs.
Without `--group-by`: overall stats (mean, median, std, min, max, nonzero%).
With `--group-by`: per-group stats table sorted by count.
```bash
cbioportal-cell-explorer expression EGFR
cbioportal-cell-explorer expression EGFR --group-by cell_type
cbioportal-cell-explorer expression TP53 --group-by disease
```

### `embedding [key] [--limit N]`
Without a key: lists available embeddings (e.g. X_umap, X_pca).
With a key: dumps first N coordinate rows (default 10).
```bash
cbioportal-cell-explorer embedding              # list embeddings
cbioportal-cell-explorer embedding X_umap50 --limit 5
```

## Global options

- `--url <zarr_url>` - Override the dataset URL (default: MSK SPECTRUM TME dataset)
- `--json` - Output as JSON for structured parsing
- `-h, --help` - Show help

## Default dataset

The default dataset is the MSK SPECTRUM TME 2022 study:
`https://cbioportal-public-imaging.assets.cbioportal.org/msk_spectrum_tme_2022/zarr/spectrum_all_cells-f16-zstd-c1s30-v3.zarr/`

927,205 cells x 31,815 genes with 40 obs columns, 6 var columns, and 2 embeddings (X_pca, X_umap50).

## Instructions

1. Parse the user's query and determine which command(s) to run
2. If the query is ambiguous, start with `info` to understand the dataset
3. If the user asks about a specific gene, use `expression` with `--group-by` for the most relevant obs column (usually `cell_type`)
4. If the user asks "what columns are available" or "what metadata", use `obs` without arguments
5. Use `--json` when you need to parse the output programmatically for further analysis
6. Run the command(s) and present the results in a clear, conversational summary
7. Highlight key findings (e.g. which cell type has the highest expression)
8. If a command fails (e.g. gene not found), suggest alternatives using `var --search`

## Example mappings

| User says | Command to run |
|-----------|---------------|
| "what is this dataset?" | `info` |
| "what cell types are there?" | `obs cell_type` |
| "show EGFR expression by cell type" | `expression EGFR --group-by cell_type` |
| "what genes are available?" | `var --limit 20` |
| "is BRCA1 in this dataset?" | `var --search BRCA1` |
| "compare TP53 expression across diseases" | `expression TP53 --group-by disease` |
| "what embeddings are available?" | `embedding` |
| "what metadata columns exist?" | `obs` |
