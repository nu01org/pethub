#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../pethub-web" && pwd)"

cd "$PROJECT_DIR"

if [ ! -d .svelte-kit/output ]; then
  echo "Production build output not found. Run 'make' first." >&2
  exit 1
fi

echo "Starting the production build preview server..."
exec npm run preview -- --host 0.0.0.0 --port 4173
