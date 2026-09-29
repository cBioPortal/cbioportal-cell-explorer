---
"@cbioportal-cell-explorer/highperformer": minor
"@cbioportal-cell-explorer/api-client": patch
---

Render operator-supplied branding when a deployment provides it.

A deployment can supply its own logo, name, tagline and identity-band colours
through the backend's `BRAND_DIR`; the brand arrives at runtime from
`/api/info`, the same way the analytics id does, because one image is deployed
to several environments. Supplying nothing keeps cBioPortal's identity exactly
as it is today — the authored token literals remain the fallbacks, so an
unbranded deployment renders unchanged.

The cBioPortal attribution is not configurable. It is hardcoded in the landing
footer and the view-page bar, and "Cell Explorer" stays literal in the wordmark:
an operator brands the surrounding identity, not the tool's name.

Also regenerates the API client for the new `brand` block on `/api/info`.
