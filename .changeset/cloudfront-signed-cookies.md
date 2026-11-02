---
"@cbioportal-cell-explorer/highperformer": minor
---

Private datasets served through CloudFront with signed cookies now load: their probe and chunk fetches carry the cookies `/access` sets, and access is renewed before the cookies expire while the dataset stays open.
