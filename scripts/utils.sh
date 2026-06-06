#!/bin/bash
# Utility functions for bash scripts
# Source:
#   https://github.com/faermanj/utils.sh
# Update command:
#   curl -s https://api.github.com/repos/faermanj/utils.sh/releases/latest | jq -r '.assets[] | select(.name=="utils.sh" or .name=="bin/utils.sh") | .browser_download_url' | xargs -n 1 curl -sL -o utils.sh

DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-${(%):-%N}}")" >/dev/null 2>&1 && pwd)"

# Define colors
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NO_COLOR="\033[0m"
MAGENTA="\033[0;35m"
CYAN="\033[0;36m"

# Generic log function
LOG_FORMAT="{color}{timestamp} [{level}] {message}{nocolor}"

log() {
    local level="$1"; shift
    local message="$1"; shift
    local color="$NO_COLOR"
    local timestamp
    timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

    # Trim spaces from log level
    levelmatch="$(echo "$level" | xargs)"

    # Determine color based on log level
    case "$levelmatch" in
        INFO) color="$GREEN" ;;
        DEBUG) color="$BLUE" ;;
        WARN) color="$YELLOW" ;;
        ERROR) color="$RED" ;;
        TRACE) color="$MAGENTA" ;;
        PERF) color="$CYAN" ;;
    esac

        # Use user-definable format
        local formatted="$LOG_FORMAT"
            formatted="${formatted//\{timestamp\}/$timestamp}"
            formatted="${formatted//\{color\}/$color}"
            formatted="${formatted//\{level\}/$level}"
            formatted="${formatted//\{nocolor\}/$NO_COLOR}"
            formatted="${formatted//\{message\}/$message}"
        echo -e "$formatted" >&2
}

# Specific log level functions
info() {
    log 'INFO ' "$@"
}

debug() {
    log "DEBUG" "$@"
}

warn() {
    log 'WARN ' "$@"
}

error() {
    log "ERROR" "$@"
}

trace() {
    log "TRACE" "$@"
}

perf() {
    log "PERF " "$@"
}
add() {
    local result=$(($1 + $2))
    # Logs are sent to stderr
    info "$result"
    # Data is sent to stdout
    echo "$result"
    # Error code is returned
    return 0
}
awaitFile() {
    local filepath="$1"
    local delay="${2:-5}" # Delay between retries in seconds, default to 5 seconds
    local retries="${3:-12}" # Number of retries, defaulting to 12 (1 minute if delay is 5 seconds)

    echo "Waiting for file $filepath to exist..."

    for ((i=0; i<retries; i++)); do
        if [ -e "$filepath" ]; then
            echo "File $filepath exists."
            return 0
        else
            echo "File $filepath not found. Retrying in ${delay} seconds..."
            sleep $delay
        fi
    done

    echo "Error: File $filepath does not exist after $(($retries * $delay)) seconds."
    return 1
}
awaitTCP() {
    local port="${1:-80}"
    local host="${2:-127.0.0.1}"
    local delay="${3:-15}" # Delay between retries in seconds
    local retries="${4:-99}" # Number of retries, defaulting to 99

    for ((i=0; i<retries; i++)); do
        # Attempt to connect to the port
        if (echo > /dev/tcp/${host}/${port}) 2>/dev/null; then
            info "Success: Able to connect to ${host}:${port} on attempt $(($i + 1))"
            echo "Success: Able to connect to ${host}:${port}"
            return 0
        else
            info "Attempt $(($i + 1)) of ${retries} failed: Unable to connect to ${host}:${port}. Retrying in ${delay} seconds..."
            sleep $delay
        fi
    done

    error "Error: After ${retries} attempts, unable to connect to ${host}:${port}"
    echo "Error: After ${retries} attempts, unable to connect to ${host}:${port}"
    return 1
}
awaitURL() {
    local url="$1"
    local expected_status="${2:-200}"
    local delay="${3:-15}" # Delay between retries in seconds
    local retries="${4:-99}" # Number of retries, defaulting to 99

    echo "Checking URL: $url for status: $expected_status"

    for ((i=0; i<retries; i++)); do
        # Use curl to get the HTTP status code of the response
        response=$(curl -o /dev/null -s -w "%{http_code}" "$url")

        if [ "$response" -eq "$expected_status" ]; then
            echo "Success: Received expected status $expected_status from $url"
            return 0
        else
            echo "Attempt $(($i + 1)) of $retries failed: Received status $response from $url. Retrying in ${delay} seconds..."
            sleep $delay
        fi
    done

    echo "Error: After $retries attempts, did not receive expected status $expected_status from $url"
    return 1
}
checkEnv() {
    local missingVars=()

    for varName in "$@"; do
        if [[ -z ${!varName+x} ]]; then
            missingVars+=("$varName")
        fi
    done

    if [ ${#missingVars[@]} -ne 0 ]; then
        echo "Error: The following environment variables are missing or empty: ${missingVars[*]}"
        return 1
    else
        echo "Success: All variables are defined and not empty."
        return 0
    fi
}
# elapsed.sh - Prints elapsed time since script start and since last call, tracks laps
# Usage: source this file, then call elapsed <lap_name>

SCRIPT_START_TIME=${SCRIPT_START_TIME:-$(date +%s.%N)}
ELAPSED_LAST_CALL=${ELAPSED_LAST_CALL:-$SCRIPT_START_TIME}
declare -A ELAPSED_LAPS
ELAPSED_LAP_ORDER=()

elapsed() {
       local lap_name="$1"
       local now_sec now_nsec start_sec start_nsec last_sec last_nsec
       local since_start since_last

       # Split seconds and nanoseconds
       IFS='.' read -r now_sec now_nsec <<< "$(date +%s.%N)"
       IFS='.' read -r start_sec start_nsec <<< "$SCRIPT_START_TIME"
       IFS='.' read -r last_sec last_nsec <<< "$ELAPSED_LAST_CALL"



       # Calculate elapsed times in nanoseconds
       now_nsec=${now_nsec:0:9}
       start_nsec=${start_nsec:0:9}
       last_nsec=${last_nsec:0:9}

       since_start_ns=$(( (10#$now_sec - 10#$start_sec)*1000000000 + (10#$now_nsec - 10#$start_nsec) ))
       since_last_ns=$(( (10#$now_sec - 10#$last_sec)*1000000000 + (10#$now_nsec - 10#$last_nsec) ))

       # Convert nanoseconds to seconds with 3 decimals using Bash only
       since_start_sec=$(( since_start_ns / 1000000000 ))
       since_start_frac=$(( (since_start_ns % 1000000000) / 1000000 ))
       since_last_sec=$(( since_last_ns / 1000000000 ))
       since_last_frac=$(( (since_last_ns % 1000000000) / 1000000 ))

       since_start=$(printf "%d.%03d" "$since_start_sec" "$since_start_frac")
       since_last=$(printf "%d.%03d" "$since_last_sec" "$since_last_frac")

       if [[ -n "$lap_name" ]]; then
              ELAPSED_LAPS["$lap_name"]="$since_last"
              # Add lap name to order array if not already present
              local found=0
              for l in "${ELAPSED_LAP_ORDER[@]}"; do
                     if [[ "$l" == "$lap_name" ]]; then
                            found=1
                            break
                     fi
              done
              if [[ $found -eq 0 ]]; then
                     ELAPSED_LAP_ORDER+=("$lap_name")
              fi
       fi


       local msg="elapsed[${since_start}] lap[${since_last}]"
       for lap in "${ELAPSED_LAP_ORDER[@]}"; do
              msg+=" ${lap}[${ELAPSED_LAPS[$lap]}]"
       done
       perf "$msg"

       ELAPSED_LAST_CALL="$(date +%s.%N)"
}
