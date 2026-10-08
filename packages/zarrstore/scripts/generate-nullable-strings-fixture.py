"""Generate nullable-strings.zarr: a store using anndata 0.13's nullable encodings.

pandas 3 + anndata 0.13 write string data, including obs/var indexes, as a
`nullable-string-array` group (`values` + `mask`). This fixture pins how the
frontend reads it. Python is NOT a test dependency; this only regenerates bytes.

Needs pandas >= 3 and anndata >= 0.13 — the cell-explorer-py checkout must be on a
branch that has them (chore/pandas-3 or later main).

Usage (from this directory):
    uv --project ../../../../cell-explorer-py run python generate-nullable-strings-fixture.py
"""
from pathlib import Path
import shutil

import anndata as ad
import numpy as np
import pandas as pd
import zarr
from anndata.io import write_elem

FIXTURE_PATH = Path(__file__).resolve().parent.parent / "fixtures" / "nullable-strings.zarr"


def build() -> tuple[ad.AnnData, pd.DataFrame]:
    obs = pd.DataFrame(
        {
            "donor": pd.array(["d1", None, "d2", "d1", None, "d2"], dtype="string"),
            "cell_type": pd.Categorical(["T", "B", "T", "B", "T", "B"]),
            "count": pd.array([1, None, 3, 4, None, 6], dtype="Int64"),
            "score": np.arange(6, dtype=np.float32),
        },
        index=pd.Index([f"cell_{i}" for i in range(6)], dtype="string"),
    )
    var = pd.DataFrame(index=pd.Index([f"gene_{i}" for i in range(3)], dtype="string"))
    adata = ad.AnnData(X=np.arange(18, dtype=np.float32).reshape(6, 3), obs=obs, var=var)
    return adata, obs


def main() -> None:
    if FIXTURE_PATH.exists():
        shutil.rmtree(FIXTURE_PATH)
    adata, obs = build()
    with ad.settings.override(allow_write_nullable_strings=True, auto_shard_zarr_v3=False):
        adata.write_zarr(FIXTURE_PATH)
        # The AnnData writer turns string obs columns into categoricals; rewrite obs from the raw DataFrame.
        root = zarr.open_group(str(FIXTURE_PATH), mode="r+", use_consolidated=False)
        del root["obs"]
        write_elem(root, "obs", obs)
    zarr.consolidate_metadata(str(FIXTURE_PATH))

    expected = {
        "obs/_index": "nullable-string-array",
        "var/_index": "nullable-string-array",
        "obs/donor": "nullable-string-array",
        "obs/count": "nullable-integer",
    }
    for path, encoding in expected.items():
        actual = zarr.open_group(str(FIXTURE_PATH / path), mode="r").attrs["encoding-type"]
        assert actual == encoding, (path, actual)
    print(f"Wrote {FIXTURE_PATH}")


if __name__ == "__main__":
    main()
