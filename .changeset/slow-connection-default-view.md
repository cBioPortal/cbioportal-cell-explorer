---
"@cbioportal-cell-explorer/highperformer": patch
---

A dataset's default view (coloring and labels) is no longer lost on slow connections. Large datasets such as the CRC atlas (4.3M cells) could take over 30 seconds to download on mobile data, after which the default view was silently dropped and the plot stayed gray. Column and gene names are now fetched as soon as the dataset opens instead of after the cell positions, and the wait for them is 2 minutes.
