---
"@cbioportal-cell-explorer/highperformer": minor
---

Filter the dataset catalogue with a facet sidebar.

Column filter dropdowns are replaced by a sidebar showing the whole filterable
vocabulary at once, with a dataset count beside every value and a coverage line
per facet (`Cell type · 41 of 57`) so sparse annotation is visible before it
narrows anything. Values within a facet combine as OR, facets as AND, and
"not annotated" is itself selectable so gaps can be found rather than silently
excluded.

Annotated and unannotated datasets get their own tabs, since a facet sidebar has
nothing to offer a dataset that declares no values. Tabs appear only when both
halves exist, so a catalogue with no facets is unchanged from before.

Search, active tab and facet selections are held in the URL, so a filtered view
is shareable and survives a reload.

The collections chip row is removed — Collection is a facet now, and each row's
Collection cell links through to that collection's page.

Facets are not yet served by the backend: `DatasetMetadataResponse.obs_columns`
carries column names but not values. `VITE_MOCK_FACETS` synthesises values over
the real catalogue for development until it does.
