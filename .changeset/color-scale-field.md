---
"@cbioportal-cell-explorer/highperformer": minor
---

Add `colorScaleName: 'viridis' | 'magma' | 'plasma' | 'inferno'` to AppConfig.
Pairs with the upcoming `set_color_scale` agent tool. The enum matches the
four scales already supported by `COLOR_SCALES` in the color buffer worker;
applyConfig calls the existing `setColorScaleName` store action (rebuilds
the color buffer only if currently in gene mode).
