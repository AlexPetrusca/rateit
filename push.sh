#!/usr/bin/env bash

# Top-level script to push all application components to Docker Hub
# Usage: ./push.sh [--dev|--prod] [--tag <tag>] [--no-cache]
# Default is --dev if no flag is provided

set -euo pipefail

# Default environment
ENVIRONMENT="dev"
IMAGE_TAG="latest"
PLATFORMS="${PLATFORMS:-linux/amd64,linux/arm64}"
NO_CACHE=false
BUILDX_BUILDER_NAME="${BUILDX_BUILDER_NAME:-multiarch}"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dev)
      ENVIRONMENT="dev"
      IMAGE_TAG="latest"
      shift
      ;;
    --prod)
      ENVIRONMENT="prod"
      IMAGE_TAG="v$(date +%Y%m%d)-$(git rev-parse --short HEAD)"
      shift
      ;;
    --tag)
      IMAGE_TAG="$2"
      shift 2
      ;;
    --no-cache)
      NO_CACHE=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--dev|--prod] [--tag <tag>] [--no-cache]"
      exit 1
      ;;
  esac
done

echo "Building and pushing to $ENVIRONMENT environment with tag: $IMAGE_TAG"
echo "Target platforms: $PLATFORMS"
if [ "$NO_CACHE" = true ]; then
  echo "Docker cache: disabled"
fi

# Check Docker is available
if ! docker system info >/dev/null 2>&1; then
  echo "Docker is not running or not reachable"
  exit 1
fi

# Buildx needs to write local activity metadata under ~/.docker/buildx.
if ! mkdir -p "$HOME/.docker/buildx/activity" 2>/dev/null || ! touch "$HOME/.docker/buildx/activity/.write-test" 2>/dev/null; then
  echo "Error: WSL's filesystem is read-only, so Docker buildx cannot write its local state." >&2
  echo "Try 'wsl --shutdown' from Windows PowerShell, then reopen Docker Desktop and retry." >&2
  exit 1
fi
rm -f "$HOME/.docker/buildx/activity/.write-test" 2>/dev/null || true

# Ensure buildx builder exists and supports multi-arch
if ! docker buildx inspect "$BUILDX_BUILDER_NAME" >/dev/null 2>&1; then
  docker buildx create \
    --name "$BUILDX_BUILDER_NAME" \
    --driver docker-container \
    --use
fi

# Ensure builder is active and bootstrapped
docker buildx use "$BUILDX_BUILDER_NAME"
if ! docker buildx inspect --bootstrap; then
  fallback_builder_name="${BUILDX_BUILDER_NAME}-$(date +%Y%m%d%H%M%S)"
  echo "Warning: builder '$BUILDX_BUILDER_NAME' could not bootstrap cleanly." >&2
  echo "Trying a fresh builder named '$fallback_builder_name'..." >&2
  docker buildx create \
    --name "$fallback_builder_name" \
    --driver docker-container \
    --use
  docker buildx inspect --bootstrap >/dev/null 2>&1 || {
    echo "Error: unable to bootstrap a fresh Docker buildx builder." >&2
    echo "Check that Docker Desktop is running and this WSL distro has access to the Docker daemon." >&2
    exit 1
  }
  BUILDX_BUILDER_NAME="$fallback_builder_name"
fi

# Function to build and push
build_and_push() {
  local service_name=$1
  local image_name=$2
  local build_context=$3
  local dockerfile=${4:-}

  echo "----------------------------------------------------------------"
  echo "Processing $service_name..."
  echo "Building Docker image: $image_name:$IMAGE_TAG"

  build_args=(--platform "$PLATFORMS" -t "$image_name:$IMAGE_TAG")

  if [ "$NO_CACHE" = true ]; then
    build_args+=(--no-cache)
  fi

  if [ "$ENVIRONMENT" == "prod" ]; then
    echo "Also tagging as latest for production"
    build_args+=(-t "$image_name:latest")
  fi

  if [ -n "$dockerfile" ]; then
    build_args+=(-f "$dockerfile")
  fi

  echo "Building and pushing image(s) to Docker Hub..."
  docker buildx build "${build_args[@]}" --push "$build_context"

  echo "$service_name pushed successfully!"
}

build_and_push "Backend" "alexpetrusca/rateit-backend" "./backend"

echo "----------------------------------------------------------------"
echo "All components processed successfully!"
echo "Environment: $ENVIRONMENT"
echo "Backend Image: alexpetrusca/rateit-backend:$IMAGE_TAG"

if [ "$ENVIRONMENT" == "prod" ]; then
  echo "Also tagged as: latest"
fi
