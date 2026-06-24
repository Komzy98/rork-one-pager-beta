#!/usr/bin/env bash
# Start Younify auth on :3000 when missing, then open Simulator + Expo dev client.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AUTH_DIR="$ROOT/backend/younify-auth"
STARTED_BY_US=0
YOUNIFY_PID=""

cleanup() {
  if [[ "$STARTED_BY_US" == "1" && -n "$YOUNIFY_PID" ]]; then
    kill "$YOUNIFY_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

if curl -sf "http://127.0.0.1:3000/health" >/dev/null 2>&1; then
  echo "Younify auth already running on http://127.0.0.1:3000"
else
  echo "Starting Younify auth from $AUTH_DIR ..."
  if [[ ! -f "$AUTH_DIR/server.js" ]]; then
    echo "Missing $AUTH_DIR/server.js" >&2
    exit 1
  fi
  (cd "$AUTH_DIR" && exec node server.js) &
  YOUNIFY_PID=$!
  STARTED_BY_US=1
  ok=0
  for _ in $(seq 1 60); do
    if curl -sf "http://127.0.0.1:3000/health" >/dev/null 2>&1; then
      ok=1
      echo "Younify auth is ready."
      break
    fi
    sleep 0.15
  done
  if [[ "$ok" != "1" ]]; then
    echo "Younify auth did not become healthy on :3000. Check $AUTH_DIR/.env (YOUNIFY_MANAGEMENT_API_KEY)." >&2
    exit 1
  fi
fi

cd "$ROOT"
open -a Simulator 2>/dev/null || true
sleep 1
# Pass-through: npm run ios:sim:full -- --clear
exec env REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1 EXPO_USE_LOCALHOST=1 npx expo start --dev-client --localhost --port 8081 "$@" --ios
