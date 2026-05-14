---
"@cbioportal-cell-explorer/highperformer": patch
---

Fix: `applyConfig` now loads the label column's obs data via
`addSummaryObsColumn` when `categoryLabelsObsColumn` is set to a
non-null string. Previously the Phase 1 spread set the field via
`setState`, bypassing the store setter's side effect, so labels
dispatched through `applyConfig` (e.g. the chat agent calling
`set_category_labels(value=True, obs_column="leiden")`) silently
failed to render because `summaryObsData.get(labelColumn)` was
undefined. Adds a `field_value_invalid` error path when the column
is missing from `obsColumnNames`.
