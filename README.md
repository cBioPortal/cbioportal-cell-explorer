# cbioportal-cell-explorer

A monorepo for loading and visualizing data using backed by Zarr.

Everything is changing, do not import. Unstable.

## Packages

- `@cbioportal-cell-explorer/app` — Web application
- `@cbioportal-cell-explorer/zarrstore` — Zarr store library
- `@cbioportal-cell-explorer/docs` — Documentation site

## Setup

```sh
pnpm install
```

## Development

```sh
pnpm --filter @cbioportal-cell-explorer/app dev
```

## Local datasets over HTTPS (Safari)

The [deployed explorer](https://cbioportal.github.io/cbioportal-cell-explorer/)
uses HTTPS. Safari can block requests from that page to an HTTP dataset server,
including `http://localhost`. Serve local Zarr datasets over HTTPS with a trusted
development certificate instead of disabling browser security checks.

### 1. Create a local certificate on macOS

Install [mkcert](https://github.com/FiloSottile/mkcert) with Homebrew, then create
a certificate for the loopback addresses:

```sh
brew install mkcert
mkcert -install
mkdir -p "$HOME/.ssl"
mkcert -cert-file "$HOME/.ssl/localhost.pem" \
  -key-file "$HOME/.ssl/localhost-key.pem" localhost 127.0.0.1 ::1
```

`mkcert -install` adds a local certificate authority to your trust store and may
request administrator permission. Keep private keys, including mkcert's
`rootCA-key.pem`, private and outside the directory you serve.

### 2. Allow the explorer to read the dataset

Create `$HOME/.ssl/cell-explorer-serve.json` with the following configuration for
[serve](https://github.com/vercel/serve). It allows browser reads from the deployed
explorer's origin rather than every website:

```json
{
  "directoryListing": false,
  "headers": [
    {
      "source": "**",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "https://cbioportal.github.io" },
        { "key": "Access-Control-Allow-Methods", "value": "GET, HEAD, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Range" },
        { "key": "Access-Control-Allow-Private-Network", "value": "true" }
      ]
    }
  ]
}
```

For a different deployment or local development server, replace the allowed
origin with that page's exact scheme, hostname, and port, without a path.
Only serve datasets you are authorized to make available to that viewer.

### 3. Serve and open the dataset

With Node.js installed, run the server from a terminal:

```sh
npx serve@14.2.6 \
  --config "$HOME/.ssl/cell-explorer-serve.json" \
  --ssl-cert "$HOME/.ssl/localhost.pem" \
  --ssl-key "$HOME/.ssl/localhost-key.pem" \
  --listen tcp://127.0.0.1:0 \
  /path/to/zarr/data
```

Replace `/path/to/zarr/data` with the directory containing your Zarr stores.
Port `0` asks the operating system to select an available port while retaining
the loopback binding. Copy the server's printed **Local** HTTPS address and
append the store's folder name. For example, if it prints
`https://127.0.0.1:54321` and your directory contains `example.zarr`, use
`https://127.0.0.1:54321/example.zarr/` as the dataset URL in the explorer.
Use the printed port, which can change each time you start the server.

The server is bound to this computer's loopback interface. Stop it with `Ctrl+C`
when finished; do not serve your home directory or the certificate directory.

If Safari reports a certificate error, check that `mkcert -install` succeeded
and the certificate includes the hostname or IP in the URL. If it reports a
CORS error, check the configured allowed origin. Use `https://` in the dataset
URL and keep the server running while viewing the dataset.
