#!/usr/bin/env bash

# Build the mobile web (Expo) app and upload it to DO Spaces (critic-media),
# under the frontend/ prefix. nginx serves "/" from there; images live under
# images/ in the same Space. Public read is via per-object ACL (Spaces has no
# bucket-policy support).
set -euo pipefail

# Run from the mobile project root regardless of where this is invoked from
# (expo export uses the cwd as the project root and won't walk up for package.json).
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."

# Configuration
BUCKET_NAME="${MEDIA_BUCKET:-critic-media}"
PREFIX="frontend"
DEST="s3://${BUCKET_NAME}/${PREFIX}"
DIST_PATH="dist"
ENDPOINT="${SPACES_ENDPOINT:-https://sfo3.digitaloceanspaces.com}"
NAMESPACE="critic"
MEDIA_SECRET="${MEDIA_SECRET:-critic-media-secret}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-sfo3}"

# Spaces credentials (from the k8s secret unless already in the environment).
if [ -z "${AWS_ACCESS_KEY_ID:-}" ]; then
  export AWS_ACCESS_KEY_ID
  AWS_ACCESS_KEY_ID="$(kubectl get secret -n "$NAMESPACE" "$MEDIA_SECRET" -o 'go-template={{ index .data "access-key" | base64decode }}')"
fi

if [ -z "${AWS_SECRET_ACCESS_KEY:-}" ]; then
  export AWS_SECRET_ACCESS_KEY
  AWS_SECRET_ACCESS_KEY="$(kubectl get secret -n "$NAMESPACE" "$MEDIA_SECRET" -o 'go-template={{ index .data "secret-key" | base64decode }}')"
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
# black-translucent (not "black", which modern iOS renders white) + a dark page
# background so the status-bar area shows dark instead of white.
tags = (
    '<meta name="apple-mobile-web-app-capable" content="yes" />'
    '<meta name="mobile-web-app-capable" content="yes" />'
    '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />'
    '<meta name="theme-color" content="#08080a" />'
    '<style>html,body{background-color:#08080a;overscroll-behavior-y:contain;}</style>'
)
if 'apple-mobile-web-app-status-bar-style' not in html:
    html = html.replace('</title>', '</title>' + tags, 1)
    open(p, 'w').write(html)
    print('injected iOS PWA meta tags')
else:
    print('iOS PWA meta tags already present')
PY

# Replace the frontend/ contents so stale files don't linger (--delete scoped to
# the prefix, so it never touches images/). Objects are public-read; assets are
# content-hashed so they can be cached.
echo "Uploading files to ${DEST} ..."
aws --endpoint-url "$ENDPOINT" s3 sync "$DIST_PATH" "$DEST" --acl public-read --delete

# index.html points at the hashed bundle, so it must never be cached, or devices
# (especially iOS home-screen apps) keep serving a stale index referencing an old
# bundle. Re-upload it with no-cache after the sync.
echo "Setting no-cache on index.html..."
aws --endpoint-url "$ENDPOINT" s3 cp "$DIST_PATH/index.html" "$DEST/index.html" \
  --acl public-read --content-type "text/html" --cache-control "no-cache, must-revalidate"
