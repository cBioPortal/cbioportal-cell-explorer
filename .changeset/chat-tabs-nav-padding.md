---
"@cbioportal-cell-explorer/highperformer": patch
---

Inset the right-sidebar tab labels ("Summary" / "Chat") from the Sider's
left border so they don't sit flush against the edge.

This is a tactical fix on the `<Tabs>` element. See #260 for the broader
refactor that would move the gutter responsibility to the Sider container
and let child panels drop their redundant edge padding.
