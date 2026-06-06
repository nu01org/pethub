#!/usr/bin/env bash

set -ex

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"
IMAGE="${REGISTRY_USERNAME}/pethub-web:latest"

if [ ! "$PH_SKIP_DOCKER_BUILD" = "true" ]; then
    # ── Build & push container image ──────────────────────────────────────────────
    # if skip docker build var is set, skip building and pushing the image
    echo "==> Pushing image: $IMAGE"
    docker push "$IMAGE"
fi