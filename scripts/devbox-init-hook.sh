#!/bin/bash
set -e

# Initialize PostgreSQL if PGDATA doesn't exist yet
if [ ! -d "$PGDATA" ]; then
    echo "Initializing PostgreSQL data directory at $PGDATA"
    initdb -D "$PGDATA"
fi

#TODO: Push fetch_url_file to utils.sh
fetch_url_file() {
    local url="$1"
    local file="${url##*/}"   # filename from URL

    local remote_size
    remote_size=$(
        curl -fsSI "$url" | awk '
        BEGIN { IGNORECASE=1 }
        /^Content-Length:/ {
            gsub("\r", "", $2)
            print $2
        }'
    )

    if [ -z "$remote_size" ]; then
        echo "ERROR: Could not determine remote file size: $url" >&2
        return 1
    fi

    local local_size=0
    if [ -f "$file" ]; then
        local_size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file")
    fi

    if [ "$remote_size" != "$local_size" ]; then
        echo "Fetching $file ($local_size -> $remote_size bytes)"
        curl -fsSL "$url" -o "$file"
    else
        echo "$file is up to date"
    fi
}
# 
DOWNLOAD_URL=$(curl -s https://api.github.com/repos/faermanj/utils.sh/releases/latest | jq -r '.assets[] | select(.name=="utils.sh" or .name=="bin/utils.sh") | .browser_download_url')
fetch_url_file $DOWNLOAD_URL
echo "devbox init hook completed"