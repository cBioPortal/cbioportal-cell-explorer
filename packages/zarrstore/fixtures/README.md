# zarrstore fixtures

This directory holds **committed zarr fixture bytes** consumed by zarrstore tests.

## Fixtures

- **`pbmc3k.zarr/`** — zarr v2, 2638 obs × 1838 var (PBMC 3k). Existing fixture used by `AnnDataStore.test.ts` / `ZarrStore.test.ts`.
- **`strata-tiny.zarr/`** — zarr v3, 50 obs × 10 var with hand-computable strata aggregates. Used by `StrataStore.test.ts` and `StrataStore.integration.test.ts`.
- **`nullable-strings.zarr/`** — zarr v3, 6 obs × 3 var, written by pandas 3 + anndata 0.13. obs/var indexes and the `donor` column use `nullable-string-array`; `count` is `nullable-integer` with missing values. Used by `nullableStrings.test.ts`.

## Regenerating `strata-tiny.zarr`

The script at `../scripts/generate-strata-fixture.py` runs `cell2zarr build-strata` on a synthetic AnnData. **Python is NOT a runtime/test dependency** — only used to regenerate the bytes.

```bash
cd packages/zarrstore/scripts
uv --project ../../../../cell-explorer-py run python generate-strata-fixture.py
```

The script overwrites `fixtures/strata-tiny.zarr/` in place. Commit the new bytes to git.

## Regenerating `nullable-strings.zarr`

Needs a cell-explorer-py checkout with pandas >= 3 and anndata >= 0.13.

```bash
cd packages/zarrstore/scripts
uv --project ../../../../cell-explorer-py run python generate-nullable-strings-fixture.py
```
