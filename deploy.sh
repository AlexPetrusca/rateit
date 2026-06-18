#!/usr/bin/env bash

# Top-level script to deploy all application components to Kubernetes
# Usage: IMAGE_TAG=<tag> ./deploy.sh [--local] [--single-node] [--push] [--skip-push] [--force]
# If IMAGE_TAG is not provided, defaults to "latest"

set -e  # Exit immediately if a command exits with a non-zero status

LOCAL_KUBE_CONTEXT="docker-desktop"
REMOTE_KUBE_CONTEXT="do-sfo3-critic"

IMAGE_TAG_WAS_PROVIDED=false
if [ -n "${IMAGE_TAG:-}" ]; then
  IMAGE_TAG_WAS_PROVIDED=true
fi

# Use provided IMAGE_TAG or default to "latest".
IMAGE_TAG="${IMAGE_TAG:-latest}"
NAMESPACE="critic"
RELEASE_NAME="critic"
FORCE_RECREATE=false
BACKEND_SPRING_PROFILES="${BACKEND_SPRING_PROFILES:-twilio}"
LOCAL_DEPLOY=false
SINGLE_NODE_DEPLOY=false
SKIP_BACKEND_PUSH=false
FORCE_BACKEND_PUSH=false
PULL_POLICY="Always"

# Parse flags
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -f|--force) FORCE_RECREATE=true ;;
        --local) LOCAL_DEPLOY=true ;;
        --single-node) SINGLE_NODE_DEPLOY=true ;;
        --push) FORCE_BACKEND_PUSH=true ;;
        --skip-push) SKIP_BACKEND_PUSH=true; PULL_POLICY="IfNotPresent" ;;
        --twilio) BACKEND_SPRING_PROFILES="twilio" ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

if [ "$LOCAL_DEPLOY" = true ] && [ "$FORCE_BACKEND_PUSH" = false ]; then
  SKIP_BACKEND_PUSH=true
  PULL_POLICY="IfNotPresent"
fi

if [ "$FORCE_BACKEND_PUSH" = true ]; then
  SKIP_BACKEND_PUSH=false
  PULL_POLICY="Always"
fi

if [ "$SKIP_BACKEND_PUSH" = false ] && [ "$IMAGE_TAG_WAS_PROVIDED" = false ]; then
  IMAGE_TAG="dev-$(date +%Y%m%d%H%M%S)-$(git rev-parse --short HEAD)"
fi

if [ "$LOCAL_DEPLOY" = true ]; then
  kubectl config use-context "$LOCAL_KUBE_CONTEXT"
else
  kubectl config use-context "$REMOTE_KUBE_CONTEXT"
fi

echo "Deploying application to Kubernetes with image tag: $IMAGE_TAG"
echo "Backend Spring profiles: $BACKEND_SPRING_PROFILES"
if [ "$LOCAL_DEPLOY" = true ]; then
  echo "Local deploy: localhost API/auth will use the mocker backend"
fi
if [ "$SINGLE_NODE_DEPLOY" = true ]; then
  echo "Single-node deploy: local-only, ingress-controller, metrics, and observability workloads will be disabled"
fi

# Check prerequisites
if ! command -v kubectl &> /dev/null; then
  echo "Error: kubectl is not installed or not in PATH"
  exit 1
fi

if ! command -v helm &> /dev/null; then
  echo "Error: Helm is not installed or not in PATH"
  exit 1
fi

# Back up the current local Postgres data before making any cluster changes.
# This is best-effort so fresh clusters and broken local setups can still deploy.
echo "Backing up local Postgres data before deploy..."
if bash ./wiki/bin/critic-db-backup.sh; then
  echo "Local Postgres backup complete"
else
  echo "Warning: local Postgres backup skipped or failed; continuing with deploy"
fi

# Build Helm dependencies
echo "Updating Helm dependencies..."
helm dependency build rateit-chart

if [ "$SKIP_BACKEND_PUSH" = true ]; then
  echo "Skipping backend image push"
else
  echo "Building and pushing backend image..."
  ./push.sh --dev --tag "$IMAGE_TAG" --no-cache
fi

# Wipe the namespace (if requested)
if [ "$FORCE_RECREATE" = true ]; then
    echo "Uninstalling previous release..."
    helm uninstall $RELEASE_NAME --namespace critic --ignore-not-found
    kubectl delete namespace critic --wait
fi

# Deploy using Helm
echo "Deploying to Kubernetes namespace: $NAMESPACE"
VALUES_ARGS=(
  --values ./rateit-chart/values.yaml
  --values ./rateit-chart/values.secret.yaml
)
if [ "$LOCAL_DEPLOY" = true ]; then
  VALUES_ARGS+=(--values ./rateit-chart/values.local.yaml)
fi
if [ "$SINGLE_NODE_DEPLOY" = true ]; then
  VALUES_ARGS+=(--values ./rateit-chart/values.single-node.yaml)
fi

helm upgrade --install "$RELEASE_NAME" ./rateit-chart \
  --namespace "$NAMESPACE" --create-namespace \
  "${VALUES_ARGS[@]}" \
  --set backend.image=alexpetrusca/rateit-backend \
  --set backend.imageTag="$IMAGE_TAG" \
  --set-string backend.springProfiles="$BACKEND_SPRING_PROFILES" \
  --set-string localBackend.springProfiles=mocker \
  --set backend.pullPolicy="$PULL_POLICY"

kubectl rollout status statefulset -l app.kubernetes.io/instance=critic -n critic

echo "Restarting deployments..."
if [ "$LOCAL_DEPLOY" = true ]; then
  kubectl rollout restart deployment/critic-backend-local -n "$NAMESPACE" 2>/dev/null || true
  kubectl rollout status deployment/critic-backend-local -n "$NAMESPACE" --timeout=300s
else
  kubectl rollout restart deployment/critic-backend -n "$NAMESPACE" 2>/dev/null || true
  kubectl rollout status deployment/critic-backend -n "$NAMESPACE" --timeout=300s
fi
kubectl rollout restart deployment/critic-nginx -n "$NAMESPACE" 2>/dev/null || true
kubectl rollout status deployment/critic-nginx -n "$NAMESPACE" --timeout=120s

# Build and upload frontend to s3/minio
echo "Building frontend..."
(cd ./frontend/scripts && ./deploy.sh)

echo "Deployment completed successfully!"
echo "Namespace: $NAMESPACE"
echo "Release: $RELEASE_NAME"
echo ""
echo "Services:"
kubectl get svc -n "$NAMESPACE"
echo ""
echo "Pods:"
kubectl get pod -n "$NAMESPACE"
