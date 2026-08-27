---
"@cbioportal-cell-explorer/highperformer": minor
"@cbioportal-cell-explorer/api-client": patch
---

Filter the catalogue by real facet values.

The backend now ships `ObsColumnInfo[]` on `DatasetMetadataResponse`, with each
column carrying a canonical `facet` key, so the sidebar runs on harvested values
instead of the development fixture. `VITE_MOCK_FACETS` and `mockFacets.ts` are
removed.

Three judgements the frontend applies on top of the backend's designation:

- Where several columns claim one facet, the column named like the facet wins.
  `cell_type` arrives from both `cell_type` (ontology labels) and
  `author_cell_type` (author shorthand); unioned they made 157 values of mixed
  vocabulary, and `disease` picked up `condition`'s "TST" and "fresh".
- Facets whose catalogue-wide vocabulary exceeds 100 values are dropped, which
  excludes `donor` at 276 — identifiers, not filters.
- `development_stage` is excluded by name. At 90 values of "1-month-old stage" /
  "10-year-old stage" it passes the ceiling but is a continuous axis expressed
  as strings, unusable as a checklist.
