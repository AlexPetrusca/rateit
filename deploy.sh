#!/usr/bin/env bash

# Top-level script to deploy all application components to Kubernetes
# Usage: IMAGE_TAG=<tag> ./deploy.sh
# If IMAGE_TAG is not provided, defaults to "latest"

set -e  # Exit immediately if a command exits with a non-zero status

# Use provided IMAGE_TAG or default to "latest"
IMAGE_TAG="${IMAGE_TAG:-latest}"
NAMESPACE="critic"
RELEASE_NAME="critic"
FORCE_RECREATE=false

# Parse flags
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -f|--force) FORCE_RECREATE=true ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

echo "Deploying application to Kubernetes with image tag: $IMAGE_TAG"

# Check prerequisites
if ! command -v kubectl &> /dev/null; then
  echo "Error: kubectl is not installed or not in PATH"
  exit 1
fi

if ! command -v helm &> /dev/null; then
  echo "Error: Helm is not installed or not in PATH"
  exit 1
fi

# Build Helm dependencies
echo "Updating Helm dependencies..."
helm dependency build rateit-chart

# Wipe the namespace (if requested)
if [ "$FORCE_RECREATE" = true ]; then
    echo "Uninstalling previous release..."
    helm uninstall $RELEASE_NAME --namespace critic --ignore-not-found
    kubectl delete namespace critic --wait
fi

# Deploy using Helm
echo "Deploying to Kubernetes namespace: $NAMESPACE"
helm upgrade --install "$RELEASE_NAME" ./rateit-chart \
  --namespace "$NAMESPACE" --create-namespace \
  --values ./rateit-chart/values.yaml \
  --values ./rateit-chart/values.secret.yaml \
  --set backend.image=alexpetrusca/critic-backend \
  --set backend.imageTag="$IMAGE_TAG" \
  --set backend.pullPolicy=Always

kubectl rollout status statefulset -l app.kubernetes.io/instance=critic -n critic

echo "Restarting deployments to ensure latest images are pulled..."
kubectl rollout restart deployment/critic-backend -n "$NAMESPACE" 2>/dev/null || true
kubectl rollout status deployment/critic-backend -n "$NAMESPACE" --timeout=300s

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
