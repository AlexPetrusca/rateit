#!/usr/bin/env bash

# Build frontend and upload to s3/minio
set -euo pipefail

# Configuration
BUCKET_NAME="frontend"
DIST_PATH="../dist"
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

# 0. Package Frontend
npm install >/dev/null
npm run build

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

echo "Uploading files to bucket..."
aws --endpoint-url "$ENDPOINT" s3 sync "$DIST_PATH" "s3://$BUCKET_NAME" --acl public-read
