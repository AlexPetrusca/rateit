#!/usr/bin/env bash

# Build frontend and upload to s3/minio

# Configuration
BUCKET_NAME="frontend"
DIST_PATH="../dist"
LOCAL_MINIO_PORT="${LOCAL_MINIO_PORT:-9100}"
ENDPOINT="http://localhost:${LOCAL_MINIO_PORT}"
NAMESPACE="rateit"
MINIO_SERVICE="rateit-minio"
PORT_FORWARD_PATTERN="kubectl port-forward -n ${NAMESPACE} svc/${MINIO_SERVICE}"

# Set credentials for the sub-shell/commands
export AWS_ACCESS_KEY_ID="rateit"
export AWS_SECRET_ACCESS_KEY="rateit-minio-password"

# 0. Package Frontend
npm install >/dev/null
npm run build

if pgrep -f "$PORT_FORWARD_PATTERN" >/dev/null; then
    TEMP_TUNNEL=false
else
    TEMP_TUNNEL=true
    echo "Starting port-forward..."
    kubectl port-forward -n "$NAMESPACE" "svc/$MINIO_SERVICE" "${LOCAL_MINIO_PORT}:9000" >/dev/null &
    PORT_FORWARD_PID=$!
    sleep 3 # Wait for port-forward to be ready
fi

if ! aws --endpoint-url "$ENDPOINT" s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
  echo "Creating bucket..."
  aws --endpoint-url $ENDPOINT s3 mb s3://$BUCKET_NAME 2>/dev/null || true

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
  aws --endpoint-url $ENDPOINT s3api put-bucket-policy \
      --bucket $BUCKET_NAME \
      --policy "$POLICY"
fi

echo "Uploading files to bucket..."
aws --endpoint-url $ENDPOINT s3 sync $DIST_PATH s3://$BUCKET_NAME --acl public-read

if $TEMP_TUNNEL; then
  echo "Stopping port-forward..."
  kill "$PORT_FORWARD_PID" 2>/dev/null || true
fi
