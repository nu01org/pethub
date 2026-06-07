#!/bin/bash
set -euo pipefail

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

source "$SCRIPT_DIR/images-push.sh"

# ── Deploy CDK stacks ─────────────────────────────────────────────────────────
echo "==> Deploying CDK stacks"
cd "$REPO_ROOT/pethub-cdk"

npm ci
npm run build

CDK_XARGS="--require-approval never --no-rollback"
CDK_ENV="aws://${CDK_DEFAULT_ACCOUNT}/${CDK_DEFAULT_REGION}"

echo "==> Ensuring CDK bootstrap"
npx cdk bootstrap "$CDK_ENV"

echo "==> Deploying stacks"
npx cdk deploy "**" $CDK_XARGS

# TODO Prefix stack name with tenant id
PH_ALB_DNS_NAME=$(
  aws cloudformation describe-stacks \
    --stack-name PHEcsStack \
    --query "Stacks[0].Outputs[?OutputKey=='AlbDns'].OutputValue" \
    --output text \
    --region "$CDK_DEFAULT_REGION"
)

echo "PH_ALB_DNS_NAME=${PH_ALB_DNS_NAME}"
