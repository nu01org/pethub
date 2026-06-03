#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../pethub-web" && pwd)"

cd "$PROJECT_DIR"

echo "Installing production dependencies..."
npm ci

echo "Running validation checks..."
npm run check

echo "Building for production..."
npm run build

echo "Production build completed successfully."
