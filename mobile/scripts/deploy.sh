#!/usr/bin/env bash

# Build the mobile web (Expo) app and upload to s3/minio.
# Deploys to the "frontend" bucket so it serves as the live web app.
set -euo pipefail

# Run from the mobile project root regardless of where this is invoked from
# (expo export uses the cwd as the project root and won't walk up for package.json).
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."

# Configuration
BUCKET_NAME="frontend"
DIST_PATH="dist"
LOCAL_MINIO_PORT="${LOCAL_MINIO_PORT:-9100}"
ENDPOINT="http://localhost:${LOCAL_MINIO_PORT}"
NAMESPACE="critic"
MINIO_SERVICE="critic-minio"
MINIO_SECRET="${MINIO_SECRET:-critic-minio-secret}"
TEMP_TUNNEL=false

cleanup() {
  if [ "$TEMP_TUNNEL" = true ] && [ -n "${PORT_FORWARD_PID:-}" ]; then
    echo "Stopping port-forward..."
    kill "$PORT_FORWARD_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if [ -z "${AWS_ACCESS_KEY_ID:-}" ]; then
  export AWS_ACCESS_KEY_ID
  AWS_ACCESS_KEY_ID="$(kubectl get secret -n "$NAMESPACE" "$MINIO_SECRET" -o 'go-template={{ index .data "rootUser" | base64decode }}')"
fi

if [ -z "${AWS_SECRET_ACCESS_KEY:-}" ]; then
  export AWS_SECRET_ACCESS_KEY
  AWS_SECRET_ACCESS_KEY="$(kubectl get secret -n "$NAMESPACE" "$MINIO_SECRET" -o 'go-template={{ index .data "rootPassword" | base64decode }}')"
fi

# 0. Package mobile web build (Expo export -> ./dist)
# The web build resolves its API base to same-origin at runtime (see src/config.js),
# so it needs no build-time API URL injection; it's served behind nginx which
# proxies /api and /auth to the backend.
npm install >/dev/null
rm -rf "$DIST_PATH"
npx expo export --platform web --output-dir "$DIST_PATH"

# Expo's generated index.html omits iOS home-screen (PWA) meta tags, so the
# standalone status bar renders white. Inject them to match the dark app.
python3 - "$DIST_PATH/index.html" <<'PY'
import sys
p = sys.argv[1]
html = open(p).read()
tags = (
    '<meta name="apple-mobile-web-app-capable" content="yes" />'
    '<meta name="mobile-web-app-capable" content="yes" />'
    '<meta name="apple-mobile-web-app-status-bar-style" content="black" />'
    '<meta name="theme-color" content="#000000" />'
)
if 'apple-mobile-web-app-status-bar-style' not in html:
    html = html.replace('</title>', '</title>' + tags, 1)
    open(p, 'w').write(html)
    print('injected iOS PWA meta tags')
else:
    print('iOS PWA meta tags already present')
PY

if ! curl -fsS "$ENDPOINT/minio/health/live" >/dev/null 2>&1; then
  TEMP_TUNNEL=true
  echo "Starting port-forward..."
  kubectl port-forward -n "$NAMESPACE" "svc/$MINIO_SERVICE" "${LOCAL_MINIO_PORT}:9000" >/dev/null &
  PORT_FORWARD_PID=$!

  for _ in {1..20}; do
    if curl -fsS "$ENDPOINT/minio/health/live" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  if ! curl -fsS "$ENDPOINT/minio/health/live" >/dev/null 2>&1; then
    echo "Error: MinIO endpoint is not reachable at $ENDPOINT"
    exit 1
  fi
fi

if ! aws --endpoint-url "$ENDPOINT" s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
  echo "Creating bucket..."
  aws --endpoint-url "$ENDPOINT" s3 mb "s3://$BUCKET_NAME" 2>/dev/null || true

  POLICY='{
      "Version": "2012-10-17",
      "Statement": [{
          "Effect": "Allow",
          "Principal": {"AWS": ["*"]},
          "Action": ["s3:GetObject"],
          "Resource": ["arn:aws:s3:::'$BUCKET_NAME'/*"]
      }]
  }'

  echo "Applying public policy..."
  aws --endpoint-url "$ENDPOINT" s3api put-bucket-policy \
      --bucket "$BUCKET_NAME" \
      --policy "$POLICY"
fi

# Replace bucket contents so stale frontend files don't linger (--delete).
# Assets are content-hashed, so the bulk sync can let them be cached.
echo "Uploading files to bucket..."
aws --endpoint-url "$ENDPOINT" s3 sync "$DIST_PATH" "s3://$BUCKET_NAME" --acl public-read --delete

# index.html points at the hashed bundle, so it must never be cached, or devices
# (especially iOS home-screen apps) keep serving a stale index referencing an old
# bundle. Re-upload it with no-cache after the sync.
echo "Setting no-cache on index.html..."
aws --endpoint-url "$ENDPOINT" s3 cp "$DIST_PATH/index.html" "s3://$BUCKET_NAME/index.html" \
  --acl public-read --content-type "text/html" --cache-control "no-cache, must-revalidate"
