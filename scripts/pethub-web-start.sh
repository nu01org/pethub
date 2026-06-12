#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_DIR="$REPO_DIR/pethub-web"

cd "$PROJECT_DIR"

# Environment comes exclusively from the repo root .envrc (no .env files)
if [ -f "$REPO_DIR/.envrc" ]; then
    # shellcheck source=/dev/null
    source "$REPO_DIR/.envrc"
fi

echo "Starting the development server..."
exec npm run dev -- --host 0.0.0.0 --port 5173
