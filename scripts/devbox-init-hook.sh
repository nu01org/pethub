#!/bin/bash
set -e

REPO_ROOT=$(git rev-parse --show-toplevel)

source "$REPO_ROOT/scripts/utils.sh"

# If .envrc exists, source it to load environment variables
if [ -f "$REPO_ROOT/.envrc" ]; then
    echo "Sourcing .envrc to load environment variables"
    source "$REPO_ROOT/.envrc"
else
    echo "No .envrc file found, skipping"
fi

# 
DOWNLOAD_URL=$(curl -s https://api.github.com/repos/faermanj/utils.sh/releases/latest | jq -r '.assets[] | select(.name=="utils.sh" or .name=="bin/utils.sh") | .browser_download_url')
fetch_url_file $DOWNLOAD_URL
echo "devbox init hook completed"
