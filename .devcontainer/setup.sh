#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL="$ROOT/.local"
mkdir -p "$LOCAL/bin" "$LOCAL/tools" "$LOCAL/pb_data"
echo "Preparing LGN development dependencies (no production data)."
npm install --prefix "$LOCAL/tools" --no-save bun@1.4.4
"$LOCAL/tools/node_modules/.bin/bun" install --frozen-lockfile --cwd "$ROOT"
if [ ! -x "$LOCAL/bin/pocketbase" ]; then
  curl --fail --location --show-error --silent --retry 3 \
    https://github.com/pocketbase/pocketbase/releases/download/v0.40.4/pocketbase_0.40.4_linux_amd64.zip \
    --output "$LOCAL/pocketbase.zip"
  unzip -oq "$LOCAL/pocketbase.zip" pocketbase -d "$LOCAL/bin"
  chmod +x "$LOCAL/bin/pocketbase"
fi
"$LOCAL/bin/pocketbase" --version
if [ ! -s "$LOCAL/pb_encryption_key" ]; then
  node -e "process.stdout.write(require('node:crypto').randomBytes(16).toString('hex'))" > "$LOCAL/pb_encryption_key"
  chmod 600 "$LOCAL/pb_encryption_key"
fi
node "$ROOT/scripts/check-app-source.mjs"
echo "LGN workspace prepared. Run: bash .devcontainer/start.sh"
