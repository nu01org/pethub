#!/bin/bash
set -e

# ── Load env vars from .envrc ─────────────────────────────────────────────────
# .envrc uses 'export KEY=VALUE' lines; source it directly.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -f "$REPO_ROOT/.envrc" ]; then
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.envrc"
fi

: "${REGISTRY_USERNAME:?REGISTRY_USERNAME is not set. Check .envrc}"
: "${CDK_DEFAULT_ACCOUNT:?CDK_DEFAULT_ACCOUNT is not set. Check .envrc}"
: "${CDK_DEFAULT_REGION:?CDK_DEFAULT_REGION is not set. Check .envrc}"

IMAGE="${REGISTRY_USERNAME}/pethub-web:latest"

# ── Build & push container image ──────────────────────────────────────────────
echo "==> Building image: $IMAGE"
docker build \
  --progress=plain \
  -f "$REPO_ROOT/pethub-web.Containerfile" \
  -t "$IMAGE" \
  "$REPO_ROOT"

echo "==> Pushing image: $IMAGE"
docker push "$IMAGE"

# ── Deploy CDK stacks ─────────────────────────────────────────────────────────
echo "==> Deploying CDK stacks"
cd "$REPO_ROOT/pethub-cdk"
npm run build
npx cdk deploy "**" --require-approval never
