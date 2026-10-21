---
"@cbioportal-cell-explorer/highperformer": patch
---

Switching embeddings with cluster labels shown no longer breaks the labels. The label layer could be carried over to the freshly mounted canvas, where it failed to initialize and logged WebGL errors (`getUniformBlockIndex … not of type 'WebGLProgram'`) on every frame.
