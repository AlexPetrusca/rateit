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

# Ensure buildx builder exists and supports multi-arch
if ! docker buildx inspect multiarch >/dev/null 2>&1; then
  docker buildx create \
    --name multiarch \
    --driver docker-container \
    --use
fi

# Ensure builder is active and bootstrapped
docker buildx use multiarch
docker buildx inspect --bootstrap >/dev/null 2>&1

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
