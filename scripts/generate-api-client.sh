#!/usr/bin/env bash
set -euo pipefail

SPEC_PATH="${1:?Usage: generate-api-client.sh <path-to-openapi.json>}"

if [ ! -f "$SPEC_PATH" ]; then
    echo "Error: OpenAPI spec not found at $SPEC_PATH" >&2
    exit 1
fi

# Resolve to absolute path — pnpm runs the script from the package directory,
# so relative paths would resolve incorrectly
SPEC_PATH="$(cd "$(dirname "$SPEC_PATH")" && pwd)/$(basename "$SPEC_PATH")"

OPENAPI_SPEC="$SPEC_PATH" pnpm --filter @cbioportal-cell-explorer/api-client generate
echo "API client generated at packages/api-client/src/index.ts"
