#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL="$ROOT/.local"
if [ ! -x "$LOCAL/tools/node_modules/.bin/bun" ]; then
  echo "Run bash .devcontainer/setup.sh first." >&2
  exit 1
fi
export LGN_APP_URL="${LGN_APP_URL:-http://127.0.0.1:3000}"
echo "Starting LGN frontend on port 3000."
echo "Open the Ports tab and select 'Open in Browser' for port 3000 (keep visibility Private)."
echo "If the forwarded page does not open, run in a second terminal:"
echo "  curl -I http://127.0.0.1:3000/"
echo "For a remote Codespaces browser, do not use localhost:3000 on your own PC."
if [ -n "${CODESPACE_NAME:-}" ]; then
  echo "Expected preview: https://${CODESPACE_NAME}-3000.app.github.dev/"
fi
cd "$ROOT"
export PATH="$LOCAL/tools/node_modules/.bin:$PATH"
exec npm run dev --workspace web
