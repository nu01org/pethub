#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../pethub-web" && pwd)"

cd "$PROJECT_DIR"

echo "Starting the development server..."
exec npm run dev -- --host 0.0.0.0 --port 5173
