#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

MVNW="${MVNW:-./mvnw}"
POLL_INTERVAL="${BACKEND_DEV_POLL_INTERVAL:-1}"
WATCH_PATHS=(src/main/java src/main/resources)

snapshot_sources() {
  find "${WATCH_PATHS[@]}" -type f \
    \( -name '*.java' -o -name '*.xml' -o -name '*.yaml' -o -name '*.yml' -o -name '*.properties' \) \
    -print \
    | sort \
    | xargs shasum \
    | shasum \
    | awk '{print $1}'
}

compile_changed_sources() {
  echo "[backend-dev] Change detected. Compiling backend..."
  if "${MVNW}" -q -DskipTests compile; then
    echo "[backend-dev] Compile complete. Spring Boot devtools will restart the app."
  else
    echo "[backend-dev] Compile failed. Fix the error and save again."
  fi
}

watch_sources() {
  local last_snapshot
  local next_snapshot

  last_snapshot="$(snapshot_sources)"
  while true; do
    sleep "${POLL_INTERVAL}"
    next_snapshot="$(snapshot_sources)"
    if [[ "${next_snapshot}" != "${last_snapshot}" ]]; then
      last_snapshot="${next_snapshot}"
      compile_changed_sources
    fi
  done
}

cleanup() {
  if [[ -n "${watcher_pid:-}" ]]; then
    kill "${watcher_pid}" 2>/dev/null || true
  fi
  if [[ -n "${app_pid:-}" ]]; then
    kill "${app_pid}" 2>/dev/null || true
    wait "${app_pid}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

echo "[backend-dev] Starting backend with Spring Boot devtools."
echo "[backend-dev] Watching src/main/java and src/main/resources every ${POLL_INTERVAL}s."

watch_sources &
watcher_pid="$!"

"${MVNW}" spring-boot:run &
app_pid="$!"

wait "${app_pid}"
