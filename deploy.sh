#!/usr/bin/env bash

# Top-level script to deploy all application components to Kubernetes
# Usage: IMAGE_TAG=<tag> ./deploy.sh [--local] [--single-node] [--push] [--skip-push] [--with-frontend] [--frontend-only] [--restart-nginx] [--force]
# If IMAGE_TAG is not provided, defaults to "latest"
#
# --frontend-only ships just the web bundle: no Postgres backup, no backend image
# build/push, no Helm release, no pod restarts. Use it when only mobile/ changed;
# rolling the backend to publish a frontend bundle is needless risk on the
# single-node remote cluster.

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
DEPLOY_FRONTEND=false
FRONTEND_ONLY=false
RESTART_NGINX=false
TEMP_VALUES_FILES=()

cleanup_temp_values() {
  if [ "${#TEMP_VALUES_FILES[@]}" -gt 0 ]; then
    rm -f "${TEMP_VALUES_FILES[@]}"
  fi
}
trap cleanup_temp_values EXIT

append_secret_value() {
  local values_file="$1"
  local values_key="$2"
  local secret_name="$3"
  local secret_key="$4"
  local secret_value

  secret_value="$(kubectl get secret "$secret_name" -n "$NAMESPACE" -o "jsonpath={.data.$secret_key}" | base64 --decode)"
  {
    printf "  %s: |-\n" "$values_key"
    printf "%s" "$secret_value" | sed 's/^/    /'
    printf "\n"
  } >> "$values_file"
}

# Parse flags
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -f|--force) FORCE_RECREATE=true ;;
        --local) LOCAL_DEPLOY=true ;;
        --single-node) SINGLE_NODE_DEPLOY=true ;;
        --push) FORCE_BACKEND_PUSH=true ;;
        --skip-push) SKIP_BACKEND_PUSH=true; PULL_POLICY="IfNotPresent" ;;
        --with-frontend) DEPLOY_FRONTEND=true ;;
        --frontend-only) DEPLOY_FRONTEND=true; FRONTEND_ONLY=true ;;
        --skip-frontend) DEPLOY_FRONTEND=false ;;
        --restart-nginx) RESTART_NGINX=true ;;
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

# The production DO cluster (REMOTE_KUBE_CONTEXT) is a single small node. The full
# stack overcommits it and OOM-kills core services, so always apply the slim preset
# on remote deploys. Use --local for the local cluster, which fits the full stack.
if [ "$LOCAL_DEPLOY" = false ]; then
  SINGLE_NODE_DEPLOY=true
fi

if [ "$SKIP_BACKEND_PUSH" = false ] && [ "$IMAGE_TAG_WAS_PROVIDED" = false ]; then
  IMAGE_TAG="dev-$(date +%Y%m%d%H%M%S)-$(git rev-parse --short HEAD)"
fi

if [ "$LOCAL_DEPLOY" = true ]; then
  kubectl config use-context "$LOCAL_KUBE_CONTEXT"
else
  kubectl config use-context "$REMOTE_KUBE_CONTEXT"
fi

if [ "$FRONTEND_ONLY" = true ]; then
  echo "Frontend-only deploy: skipping Postgres backup, backend image push, Helm release, and rollouts"
  (cd ./mobile/scripts && ./deploy.sh)
  echo "Frontend-only deploy completed successfully!"
  exit 0
fi

echo "Deploying application to Kubernetes with image tag: $IMAGE_TAG"
echo "Backend Spring profiles: $BACKEND_SPRING_PROFILES"
if [ "$LOCAL_DEPLOY" = true ]; then
  echo "Local deploy: localhost API/auth will use the mocker backend"
fi
if [ "$SINGLE_NODE_DEPLOY" = true ]; then
  echo "Single-node deploy: local-only, ingress-controller, metrics, and observability workloads will be disabled"
fi
if [ "$DEPLOY_FRONTEND" = true ]; then
  echo "Frontend deploy: enabled"
else
  echo "Frontend deploy: skipped (use --with-frontend to upload the mobile web bundle)"
fi
if [ "$RESTART_NGINX" = true ]; then
  echo "Nginx restart: enabled"
else
  echo "Nginx restart: skipped (use --restart-nginx when nginx config changed)"
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
echo "Backing up Postgres data before deploy..."
if bash ./wiki/bin/critic-db-backup.sh; then
  echo "Postgres backup complete"
else
  echo "Warning: Postgres backup skipped or failed; continuing with deploy"
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
)
if [ -f ./rateit-chart/values.secret.yaml ]; then
  VALUES_ARGS+=(--values ./rateit-chart/values.secret.yaml)
else
  GENERATED_SECRET_VALUES="$(mktemp /tmp/critic-values.secret.XXXXXX.yaml)"
  TEMP_VALUES_FILES+=("$GENERATED_SECRET_VALUES")
  echo "Secret values overlay not found; generating a temporary overlay from existing Kubernetes secrets"
  printf "secrets:\n" > "$GENERATED_SECRET_VALUES"
  append_secret_value "$GENERATED_SECRET_VALUES" twilioAccountSid critic-backend-secret TWILIO_ACCOUNT_SID
  append_secret_value "$GENERATED_SECRET_VALUES" twilioAuthToken critic-backend-secret TWILIO_AUTH_TOKEN
  append_secret_value "$GENERATED_SECRET_VALUES" twilioServiceSid critic-backend-secret TWILIO_SERVICE_SID
  append_secret_value "$GENERATED_SECRET_VALUES" rsaPublicKey critic-backend-secret RSA_PUBLIC_KEY
  append_secret_value "$GENERATED_SECRET_VALUES" rsaPrivateKey critic-backend-secret RSA_PRIVATE_KEY
  append_secret_value "$GENERATED_SECRET_VALUES" minioAdminUser critic-minio-secret rootUser
  append_secret_value "$GENERATED_SECRET_VALUES" minioAdminPassword critic-minio-secret rootPassword
  append_secret_value "$GENERATED_SECRET_VALUES" postgresAdminPassword critic-postgres-secret POSTGRES_ADMIN_PASSWORD
  append_secret_value "$GENERATED_SECRET_VALUES" postgresUserPassword critic-postgres-secret POSTGRES_USER_PASSWORD
  append_secret_value "$GENERATED_SECRET_VALUES" redisAdminPassword critic-redis-secret REDIS_ADMIN_PASSWORD
  VALUES_ARGS+=(--values "$GENERATED_SECRET_VALUES")
fi
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

if [ "$RESTART_NGINX" = true ]; then
  echo "Restarting nginx..."
  kubectl rollout restart deployment/critic-nginx -n "$NAMESPACE" 2>/dev/null || true
  kubectl rollout status deployment/critic-nginx -n "$NAMESPACE" --timeout=120s
fi

if [ "$DEPLOY_FRONTEND" = true ]; then
  echo "Building frontend..."
  (cd ./mobile/scripts && ./deploy.sh)
fi

echo "Deployment completed successfully!"
echo "Namespace: $NAMESPACE"
echo "Release: $RELEASE_NAME"
echo ""
echo "Services:"
kubectl get svc -n "$NAMESPACE"
echo ""
echo "Pods:"
kubectl get pod -n "$NAMESPACE"
