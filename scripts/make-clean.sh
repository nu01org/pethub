#!/usr/bin/env bash

set -exuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

rm -rf */.svelte-kit 
rm -rf */build
rm -rf */dist
rm -rf */node_modules
rm -rf node_modules
rm -rf .dist

echo "clean script completed"