"""Generate the strata-tiny.zarr fixture for frontend tests.

This script is run by a developer ONCE when the fixture schema needs to change.
The frontend has no Python dependency — tests consume the committed zarr bytes.

Prerequisites:
    - cell2zarr installed (from the sibling cbioportal-cell-explorer/cell-explorer-py repo)
    - uv or another Python 3.12+ environment with anndata + numpy + pandas

Usage (from this directory):
    uv run python generate-strata-fixture.py
"""
from pathlib import Path
import shutil

import anndata as ad
import numpy as np
import pandas as pd


FIXTURE_PATH = Path(__file__).resolve().parent.parent / "fixtures" / "strata-tiny.zarr"


def build_synthetic_anndata() -> ad.AnnData:
    """50 cells x 10 genes, small integer X, two categorical obs columns.

    Deterministic values so the resulting strata are hand-computable.

      cell_type: 20 'A' + 20 'B' + 10 'C'
      donor:     alternates d1, d2 within each cell_type
      X[i, j]:   ((i + 1) * (j + 1)) % 5   -> integer values 0..4

    Atomic axes (cell_type, donor) -> 6 strata (3 cell_types x 2 donors).
    Coarse axes (cell_type)        -> 3 strata.
    """
    rng_free_values = np.fromfunction(
        lambda i, j: ((i + 1) * (j + 1)) % 5,
        shape=(50, 10),
    )
    X = rng_free_values.astype(np.float16)
    cell_types = ["A"] * 20 + ["B"] * 20 + ["C"] * 10
    donors = ["d1" if (i % 2) == 0 else "d2" for i in range(50)]
    obs = pd.DataFrame({
        "cell_type": pd.Categorical(cell_types),
        "donor": pd.Categorical(donors),
    })
    var = pd.DataFrame(index=[f"gene{i+1}" for i in range(10)])
    return ad.AnnData(X=X, obs=obs, var=var)


def main() -> None:
    if FIXTURE_PATH.exists():
        shutil.rmtree(FIXTURE_PATH)
    FIXTURE_PATH.parent.mkdir(parents=True, exist_ok=True)

    adata = build_synthetic_anndata()

    # Set anndata to write zarr v3, then write
    import anndata
    old_format = anndata.settings.zarr_write_format
    try:
        anndata.settings.zarr_write_format = 3
        adata.write_zarr(FIXTURE_PATH)
    finally:
        anndata.settings.zarr_write_format = old_format
    print(f"wrote {FIXTURE_PATH}")

    # Run cell2zarr build-strata to add uns/strata/*
    import subprocess
    subprocess.run([
        "uv", "run", "cell2zarr", "build-strata",
        str(FIXTURE_PATH),
        "--atomic-axes", "cell_type",
        "--atomic-axes", "donor",
        "--coarse", "cell_type",
        "--force",
    ], check=True)
    print(f"strata built on {FIXTURE_PATH}")


if __name__ == "__main__":
    main()
