---
"@cbioportal-cell-explorer/highperformer": minor
"@cbioportal-cell-explorer/api-client": patch
---

Load Google Analytics when the backend supplies a measurement id.

The id arrives at runtime from `/api/info` rather than a build-time `VITE_`
variable, because one image is deployed to several environments and a baked-in
id could not differ between them. No id means no script is loaded at all — that
is how a deployment opts out, and why the GitHub Pages build, which has no
backend to ask, stays untracked.

Page views are sent per route change carrying the full path, query string
included, so which dataset was opened is visible in the reports.

Embedded iframe views are deliberately not special-cased. The iframe loads this
same app from the same origin, so it reports to the same property as a
standalone visit; the embedding page reports to its own property, counting a
different thing.

Regenerates the API client, which also corrects `obs_columns` on the catalogue
response from `string[]` to `ObsColumnInfo[]`.
