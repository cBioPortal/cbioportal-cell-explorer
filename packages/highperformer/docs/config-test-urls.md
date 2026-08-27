# Config Query Param — Test URLs

Local dev server: `cd packages/highperformer && pnpm dev`
Datasets served from: `http://localhost:3005/`

## Backwards Compatibility

Plain `?url=` — should work exactly as before:

<a href="http://localhost:5173/view?url=http://localhost:3005/spectrum_all_cells-f16-zstd-c1s30-v3.zarr/" target="_blank">Open in browser</a>

```
http://localhost:5173/view?url=http://localhost:3005/spectrum_all_cells-f16-zstd-c1s30-v3.zarr/
```

## Minimal Config

Just the URL, everything else defaults:

<a href="http://localhost:5173/view?config=%7B%22url%22%3A%22http%3A%2F%2Flocalhost%3A3005%2Fspectrum_all_cells-f16-zstd-c1s30-v3.zarr%2F%22%7D" target="_blank">Open in browser</a>

```
http://localhost:5173/view?config={"url":"http://localhost:3005/spectrum_all_cells-f16-zstd-c1s30-v3.zarr/"}
```

## UI Toggles

### Hide header

<a href="http://localhost:5173/view?config=%7B%22url%22%3A%22http%3A%2F%2Flocalhost%3A3005%2Fspectrum_all_cells-f16-zstd-c1s30-v3.zarr%2F%22%2C%22showHeader%22%3Afalse%7D" target="_blank">Open in browser</a>

```
http://localhost:5173/view?config={"url":"http://localhost:3005/spectrum_all_cells-f16-zstd-c1s30-v3.zarr/","showHeader":false}
```

### Collapse left sidebar

Starts the left sidebar in its collapsed (60px icon) state. User can expand it.

<a href="http://localhost:5173/view?config=%7B%22url%22%3A%22http%3A%2F%2Flocalhost%3A3005%2Fspectrum_all_cells-f16-zstd-c1s30-v3.zarr%2F%22%2C%22showLeftSidebar%22%3Afalse%7D" target="_blank">Open in browser</a>

```
http://localhost:5173/view?config={"url":"http://localhost:3005/spectrum_all_cells-f16-zstd-c1s30-v3.zarr/","showLeftSidebar":false}
```

### Collapse right sidebar

Starts the right sidebar (summary panel) in its collapsed (60px) state. User can expand it.

<a href="http://localhost:5173/view?config=%7B%22url%22%3A%22http%3A%2F%2Flocalhost%3A3005%2Fspectrum_all_cells-f16-zstd-c1s30-v3.zarr%2F%22%2C%22showRightSidebar%22%3Afalse%7D" target="_blank">Open in browser</a>

```
http://localhost:5173/view?config={"url":"http://localhost:3005/spectrum_all_cells-f16-zstd-c1s30-v3.zarr/","showRightSidebar":false}
```

### Collapse both sidebars

<a href="http://localhost:5173/view?config=%7B%22url%22%3A%22http%3A%2F%2Flocalhost%3A3005%2Fspectrum_all_cells-f16-zstd-c1s30-v3.zarr%2F%22%2C%22showLeftSidebar%22%3Afalse%2C%22showRightSidebar%22%3Afalse%7D" target="_blank">Open in browser</a>

```
http://localhost:5173/view?config={"url":"http://localhost:3005/spectrum_all_cells-f16-zstd-c1s30-v3.zarr/","showLeftSidebar":false,"showRightSidebar":false}
```

### Disabled dropdown (read-only label)

<a href="http://localhost:5173/view?config=%7B%22url%22%3A%22http%3A%2F%2Flocalhost%3A3005%2Ffinal_crc_atlas-f16-zstd-c1s30-obsm50k-v4.zarr%2F%22%2C%22showDatasetDropdown%22%3Afalse%7D" target="_blank">Open in browser</a>

```
http://localhost:5173/view?config={"url":"http://localhost:3005/final_crc_atlas-f16-zstd-c1s30-obsm50k-v4.zarr/","showDatasetDropdown":false}
```

### Full embedded mode (no header, both sidebars collapsed)

<a href="http://localhost:5173/view?config=%7B%22url%22%3A%22http%3A%2F%2Flocalhost%3A3005%2Fspectrum_all_cells-f16-zstd-c1s30-v3.zarr%2F%22%2C%22showHeader%22%3Afalse%2C%22showLeftSidebar%22%3Afalse%2C%22showRightSidebar%22%3Afalse%7D" target="_blank">Open in browser</a>

```
http://localhost:5173/view?config={"url":"http://localhost:3005/spectrum_all_cells-f16-zstd-c1s30-v3.zarr/","showHeader":false,"showLeftSidebar":false,"showRightSidebar":false}
```

## Config Application

### With embedding + color by category

<a href="http://localhost:5173/view?config=%7B%22url%22%3A%22http%3A%2F%2Flocalhost%3A3005%2Fspectrum_all_cells-f16-zstd-c1s30-v3.zarr%2F%22%2C%22embedding%22%3A%22X_umap50%22%2C%22colorBy%22%3A%22category%22%2C%22category%22%3A%22cell_type%22%7D" target="_blank">Open in browser</a>

```
http://localhost:5173/view?config={"url":"http://localhost:3005/spectrum_all_cells-f16-zstd-c1s30-v3.zarr/","embedding":"X_umap50","colorBy":"category","category":"cell_type"}
```

### With filter (custom group by donor ID)

<a href="http://localhost:5173/view?config=%7B%22url%22%3A%22http%3A%2F%2Flocalhost%3A3005%2Fspectrum_all_cells-f16-zstd-c1s30-v3.zarr%2F%22%2C%22filter%22%3A%7B%22ids%22%3A%5B%22SPECTRUM-OV-070%22%2C%22SPECTRUM-OV-090%22%5D%2C%22obsColumn%22%3A%22donor_id%22%7D%7D" target="_blank">Open in browser</a>

```
http://localhost:5173/view?config={"url":"http://localhost:3005/spectrum_all_cells-f16-zstd-c1s30-v3.zarr/","filter":{"ids":["SPECTRUM-OV-070","SPECTRUM-OV-090"],"obsColumn":"donor_id"}}
```

## Error Handling

### Invalid URL — should show error screen with retry

<a href="http://localhost:5173/view?config=%7B%22url%22%3A%22http%3A%2F%2Flocalhost%3A3005%2Fnonexistent.zarr%22%7D" target="_blank">Open in browser</a>

```
http://localhost:5173/view?config={"url":"http://localhost:3005/nonexistent.zarr"}
```

## Kitchen Sink

Everything together — embedded mode with specific embedding, color, filter:

<a href="http://localhost:5173/view?config=%7B%22url%22%3A%22http%3A%2F%2Flocalhost%3A3005%2Fspectrum_all_cells-f16-zstd-c1s30-v3.zarr%2F%22%2C%22embedding%22%3A%22X_umap50%22%2C%22colorBy%22%3A%22category%22%2C%22category%22%3A%22cell_type%22%2C%22filter%22%3A%7B%22ids%22%3A%5B%22SPECTRUM-OV-070%22%5D%2C%22obsColumn%22%3A%22donor_id%22%7D%2C%22showHeader%22%3Afalse%2C%22showLeftSidebar%22%3Afalse%2C%22showRightSidebar%22%3Afalse%2C%22showDatasetDropdown%22%3Afalse%7D" target="_blank">Open in browser</a>

```
http://localhost:5173/view?config={"url":"http://localhost:3005/spectrum_all_cells-f16-zstd-c1s30-v3.zarr/","embedding":"X_umap50","colorBy":"category","category":"cell_type","filter":{"ids":["SPECTRUM-OV-070"],"obsColumn":"donor_id"},"showHeader":false,"showLeftSidebar":false,"showRightSidebar":false,"showDatasetDropdown":false}
```
