---
"@cbioportal-cell-explorer/highperformer": minor
---

Refactors AppConfig contract: applyConfig returns typed ApplyResult,
schema gains viewport / pointSize / opacity / summaryContext fields,
implicit side effects become explicit defaults, errors surface as
visible chat / loading / postMessage events instead of silent console
warnings. Also adds `pnpm schema` script that emits
`schema/app-config.schema.json` for cell-explorer-py codegen.
