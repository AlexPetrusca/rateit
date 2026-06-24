#!/usr/bin/env bash

# Dump the Critic Postgres database from the currently-selected kube context.
# deploy.sh switches context before calling this, so a prod deploy backs up prod.
# Run standalone too: `./wiki/bin/critic-db-backup.sh` (uses your active context).
set -euo pipefail

NAMESPACE="${NAMESPACE:-critic}"
POSTGRES_POD="${POSTGRES_POD:-critic-postgresql-0}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-postgresql}"
POSTGRES_SECRET="${POSTGRES_SECRET:-critic-postgres-secret}"
POSTGRES_DB="${POSTGRES_DB:-postgres}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

# Backups land in <repo-root>/backups regardless of where this is invoked from.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$REPO_ROOT/backups}"

CONTEXT="$(kubectl config current-context)"
SAFE_CONTEXT="${CONTEXT//[^a-zA-Z0-9._-]/_}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/critic-db-${SAFE_CONTEXT}-${TIMESTAMP}.sql"

echo "Backing up Postgres '$POSTGRES_DB' from context '$CONTEXT' (namespace '$NAMESPACE')..."

# Confirm the pod exists in this context before attempting the dump.
if ! kubectl get pod -n "$NAMESPACE" "$POSTGRES_POD" >/dev/null 2>&1; then
  echo "Error: pod '$POSTGRES_POD' not found in namespace '$NAMESPACE' for context '$CONTEXT'"
  exit 1
fi

PGPASSWORD="$(kubectl get secret -n "$NAMESPACE" "$POSTGRES_SECRET" \
  -o 'go-template={{ index .data "POSTGRES_ADMIN_PASSWORD" | base64decode }}')"

mkdir -p "$BACKUP_DIR"

# pg_dump inside the pod; stream the SQL out to the local file.
kubectl exec -n "$NAMESPACE" "$POSTGRES_POD" -c "$POSTGRES_CONTAINER" -- \
  env PGPASSWORD="$PGPASSWORD" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$OUT"

# Guard against a silent empty/truncated dump (pipe redirect can mask failures).
if [ ! -s "$OUT" ]; then
  echo "Error: backup file is empty: $OUT"
  rm -f "$OUT"
  exit 1
fi

echo "Backup complete: $OUT ($(du -h "$OUT" | cut -f1))"
