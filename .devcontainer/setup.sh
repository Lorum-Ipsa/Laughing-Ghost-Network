#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL="$ROOT/.local"
mkdir -p "$LOCAL/tools"
echo "Preparing LGN development dependencies (no production data)."
npm install --prefix "$LOCAL/tools" --no-save bun@1.4.4
"$LOCAL/tools/node_modules/.bin/bun" install --frozen-lockfile --cwd "$ROOT"
node "$ROOT/scripts/check-app-source.mjs"
echo "LGN workspace prepared. Run: bash .devcontainer/start.sh"
