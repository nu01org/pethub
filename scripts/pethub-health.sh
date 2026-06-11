#!/usr/bin/env bash
set -u

INTERVAL="${1:-10}"
HOST="${HOST:-localhost}"

PORTS=(
    "8443:nginx-https"
    "8080:nginx-http"
    "5432:postgres"
    "5173:pethub-web"
    
)

check_port() {
    local host="$1"
    local port="$2"

    timeout 1 bash -c "</dev/tcp/${host}/${port}" >/dev/null 2>&1
}

log_info() {
    printf '[INFO] %s\n' "$*"
}

sleep 5;
while true; do
    status=()

    for entry in "${PORTS[@]}"; do
        port="${entry%%:*}"
        label="${entry#*:}"

        if check_port "$HOST" "$port"; then
            status+=("🟢 ${label}")
        else
            status+=("🔴 ${label}")
        fi
    done

    log_info "$(IFS=' | '; echo "${status[*]}")"

    sleep "$INTERVAL"
done
