#!/usr/bin/env bash

set -ex

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../pethub-web" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"
IMAGE="${REGISTRY_USERNAME}/pethub-web:latest"

# ── Build & push container image ──────────────────────────────────────────────
# if skip docker build var is set, skip building and pushing the image
if [ ! "$PH_SKIP_DOCKER_BUILD" = "true" ]; then
  echo "==> Building image: $IMAGE"
  docker build \
    --progress=plain \
    -f "$REPO_ROOT/pethub-web.Containerfile" \
    -t "$IMAGE" \
    "$REPO_ROOT"


  echo "==> Saving image: $IMAGE"
  if [ ! -d ".dist" ]; then
    mkdir ".dist"
  fi
  docker save -o ".dist/pethub-web.tar" "$IMAGE"
fi