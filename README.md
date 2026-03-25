# cbioportal-cell-explorer

A monorepo for loading and visualizing data using backed by Zarr.

Everything is changing, do not import. Unstable.

## Packages

- `@cbioportal-cell-explorer/app` — Web application
- `@cbioportal-cell-explorer/zarrstore` — Zarr store library
- `@cbioportal-cell-explorer/cli` — CLI tool for querying zarr datasets
- `@cbioportal-cell-explorer/docs` — Documentation site

## Setup

```sh
pnpm install
```

## Development

```sh
pnpm --filter @cbioportal-cell-explorer/app dev
```

## CLI

A command-line tool for querying AnnData-formatted zarr datasets. It reuses the `@cbioportal-cell-explorer/zarrstore` library to query datasets over HTTP — no downloads or Python required.

### Quick start

```sh
pnpm install
pnpm exec cbioportal-cell-explorer info
```

### Commands

```
cbioportal-cell-explorer <command> [options]

Commands:
  info                              Dataset overview (shape, columns, embeddings)
  obs [column]                      List obs columns or show value counts
  var [--search <pattern>]          List or search gene names
  expression <gene>                 Expression stats, optionally grouped
    [--group-by <obs_column>]
  embedding [key] [--limit N]       List or dump embedding coordinates

Global options:
  --url <zarr_url>                  Zarr dataset URL (default: MSK SPECTRUM TME)
  --json                            Output as JSON
  -h, --help                        Show help
```

### Examples

```sh
# Dataset overview
pnpm exec cbioportal-cell-explorer info

# What cell types are in the dataset?
pnpm exec cbioportal-cell-explorer obs cell_type

# Search for a gene by symbol
pnpm exec cbioportal-cell-explorer var --search EGFR

# EGFR expression grouped by cell type
pnpm exec cbioportal-cell-explorer expression EGFR --group-by cell_type

# Use a different dataset
pnpm exec cbioportal-cell-explorer info --url https://example.com/my-dataset.zarr/

# JSON output for scripting
pnpm exec cbioportal-cell-explorer obs cell_type --json
```

Gene names can be specified as symbols (e.g. `EGFR`) or Ensembl IDs (e.g. `ENSG00000146648`) — the CLI resolves symbols automatically via the `feature_name` var column.

## Claude Code Skill

This repo includes a [Claude Code](https://docs.anthropic.com/en/docs/claude-code) plugin with a `/zarr` skill that lets you query zarr datasets using natural language.

### Setup

Run Claude Code from the repo root with `--plugin-dir`:

```sh
claude --plugin-dir .
```

Then use the `/zarr` slash command:

```
/zarr what cell types are in this dataset?
/zarr show EGFR expression across cell types
/zarr is BRCA1 in this dataset?
/zarr what metadata columns are available?
```

Claude will translate your question into CLI commands, run them, and summarize the results.
