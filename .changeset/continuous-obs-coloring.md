---
"@cbioportal-cell-explorer/highperformer": minor
---

Color numeric obs columns as a continuous gradient. Selecting a numeric obs column (e.g. `percent.rb`, `nCount_RNA`) now renders a 3-color continuous scale with a range legend instead of forcing categorical encoding and warning "likely continuous." Genuine categorical columns are unchanged; the high-cardinality block message for string columns is reworded accordingly.
