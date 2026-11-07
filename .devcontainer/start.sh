#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL="$ROOT/.local"
if [ ! -x "$LOCAL/bin/pocketbase" ] || [ ! -s "$LOCAL/pb_encryption_key" ]; then
  echo "Run bash .devcontainer/setup.sh first." >&2
  exit 1
fi
export PB_ENCRYPTION_KEY="$(cat "$LOCAL/pb_encryption_key")"
export LGN_APP_URL="http://127.0.0.1:3000"
export POCKETBASE_URL="http://127.0.0.1:8090"
# Public route preview only. No PB superuser credentials are configured here.
export CODESPACES="${CODESPACES:-false}"
cd "$ROOT/apps/pocketbase"
"$LOCAL/bin/pocketbase" serve \
  --http=127.0.0.1:8090 \
  --dir="$LOCAL/pb_data" \
  --migrationsDir="$ROOT/apps/pocketbase/pb_migrations" \
  --hooksDir="$ROOT/apps/pocketbase/pb_hooks" \
  --encryptionEnv=PB_ENCRYPTION_KEY \
  --hooksWatch=false > "$LOCAL/pocketbase.log" 2>&1 &
pocketbase_pid=$!
cleanup() {
  kill "$pocketbase_pid" 2>/dev/null || true
  wait "$pocketbase_pid" 2>/dev/null || true
}
trap cleanup EXIT
for attempt in $(seq 1 40); do
  if curl --fail --silent "http://127.0.0.1:8090/api/health" >/dev/null; then
    break
  fi
  if ! kill -0 "$pocketbase_pid" 2>/dev/null; then
    echo "PocketBase exited early. Check .local/pocketbase.log" >&2
    exit 1
  fi
  sleep 1
done
if ! curl --fail --silent "http://127.0.0.1:8090/api/health" >/dev/null; then
  echo "PocketBase did not become healthy; check .local/pocketbase.log" >&2
  exit 1
fi
echo "PocketBase healthy; starting LGN frontend on port 3000."
cd "$ROOT"
export PATH="$LOCAL/tools/node_modules/.bin:$PATH"
npm run dev --workspace web
