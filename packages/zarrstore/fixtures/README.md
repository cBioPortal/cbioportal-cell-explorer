# zarrstore fixtures

This directory holds **committed zarr fixture bytes** consumed by zarrstore tests.

## Fixtures

- **`pbmc3k.zarr/`** — zarr v2, 2638 obs × 1838 var (PBMC 3k). Existing fixture used by `AnnDataStore.test.ts` / `ZarrStore.test.ts`.
- **`strata-tiny.zarr/`** — zarr v3, 50 obs × 10 var with hand-computable strata aggregates. Used by `StrataStore.test.ts` and `StrataStore.integration.test.ts`.

## Regenerating `strata-tiny.zarr`

The script at `../scripts/generate-strata-fixture.py` runs `cell2zarr build-strata` on a synthetic AnnData. **Python is NOT a runtime/test dependency** — only used to regenerate the bytes.

```bash
cd packages/zarrstore/scripts
uv --project ../../../../cell-explorer-py run python generate-strata-fixture.py
```

The script overwrites `fixtures/strata-tiny.zarr/` in place. Commit the new bytes to git.
