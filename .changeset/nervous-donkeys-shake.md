---
"@cbioportal-cell-explorer/highperformer": minor
"@cbioportal-cell-explorer/api-client": minor
---

Group datasets by collection in the catalog.

The catalog now opens on a Collections tab listing studies rather than a flat
list of every dataset, with `/collections/:slug` giving each study its own page
showing its description, publication link, and datasets. Datasets belonging to
no collection remain reachable under an "Ungrouped" heading, and the previous
flat list is still available under "All datasets".

The dataset list moved out of `Home` into a reusable `DatasetList` component so
the collection page and the catalog share one implementation of store probing
and access resolution.

`api-client` is regenerated against the backend's collection endpoints.
