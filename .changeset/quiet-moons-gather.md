---
"@cbioportal-cell-explorer/highperformer": minor
---

Redesign the landing page around search, and bring the collection page with it.

The dataset browser was an unbranded heading above three tabs. It is now a
branded header band over a single searchable, sortable table — Dataset,
Collection, Cells, Genes, Status — with two-line rows carrying each dataset's
description, and each Collection cell linking through to that collection.

Cell and gene counts come from the catalog itself: the API harvests each store's
shape server-side and serves it on `/api/datasets`, so rows sort and the header's
overview figures total up on first paint rather than after every store has
answered. Pasted URLs have no catalog row, so they still read their counts from
the reachability probe, which continues to run for status either way.

The collection page gains the same treatment and surfaces the publication
citation the API has always returned but nothing displayed.

Content width is now one value, `min(100% - 96px, 1440px)`, replacing three
different ones across the routes.

Adds the official cBioPortal 2024 brand pack, uses its mark in the header, and
rebuilds the favicon set from it — including a properly padded maskable variant,
which the manifest previously pointed at an icon Android would have cropped.

**Removes the Add URL control.** Previously saved `.zarr` URLs still load, still
list, and can still be removed, but there is no longer a way to add one from the
landing page. With no backend configured this leaves the page with nothing to
open — the old "My URLs" tab was the only entry point in that configuration.

`VITE_MOCK_CATALOG` seeds a sample catalog for frontend work without a backend;
it is gated on `import.meta.env.DEV` and cannot reach a production build.
