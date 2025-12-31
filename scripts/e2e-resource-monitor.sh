#!/bin/bash

# Test Resource Monitor - Prevents system freeze during E2E tests
# Usage: ./scripts/test-monitor.sh [vitest command]

set -e

# Configuration
MAX_CPU_PERCENT=70
MAX_MEMORY_MB=6144  # Updated to 6GB (2025-12-31: conservative limit to prevent freeze)
CHECK_INTERVAL=5
LOG_FILE="./test-resource-monitor.log"

# E2E Mutex Lock
E2E_LOCK="/tmp/smart-agents-e2e.lock"
MAX_WAIT_TIME=300  # 5 minutes maximum wait time

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[Monitor]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[Warning]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[Error]${NC} $1" | tee -a "$LOG_FILE"
}

# Get current resource usage (for specific PID and its children)
get_cpu_usage() {
    local pid=$1
    # Get CPU usage for the test process and its children
    ps -o pid=,ppid=,%cpu= -A | awk -v pid="$pid" '
        BEGIN { total=0 }
        $1 == pid || $2 == pid { total += $3 }
        END { print total }
    '
}

get_memory_usage() {
    local pid=$1
    # Get Memory usage for the test process and its children (in MB)
    ps -o pid=,ppid=,rss= -A | awk -v pid="$pid" '
        BEGIN { total=0 }
        $1 == pid || $2 == pid { total += $3 }
        END { print total/1024 }
    '
}

# Monitor function
monitor_resources() {
    local test_pid=$1

    while kill -0 "$test_pid" 2>/dev/null; do
        CPU=$(get_cpu_usage "$test_pid")
        MEM=$(get_memory_usage "$test_pid")

        CPU=${CPU:-0}
        MEM=${MEM:-0}

        log "CPU: ${CPU}% | Memory: ${MEM}MB"

        # Check CPU limit
        if (( $(echo "$CPU > $MAX_CPU_PERCENT" | bc -l) )); then
            warn "CPU usage (${CPU}%) exceeded limit (${MAX_CPU_PERCENT}%)"
            warn "Killing test process to prevent freeze..."
            kill -TERM "$test_pid" 2>/dev/null || true
            sleep 2
            kill -KILL "$test_pid" 2>/dev/null || true
            error "Tests killed due to high CPU usage"
            exit 1
        fi

        # Check Memory limit
        if (( $(echo "$MEM > $MAX_MEMORY_MB" | bc -l) )); then
            warn "Memory usage (${MEM}MB) exceeded limit (${MAX_MEMORY_MB}MB)"
            warn "Killing test process to prevent freeze..."
            kill -TERM "$test_pid" 2>/dev/null || true
            sleep 2
            kill -KILL "$test_pid" 2>/dev/null || true
            error "Tests killed due to high memory usage"
            exit 1
        fi

        sleep "$CHECK_INTERVAL"
    done

    log "Test process completed normally"
}

# E2E Mutex Lock Functions
acquire_e2e_lock() {
    local wait_time=0

    while [ -f "$E2E_LOCK" ]; do
        if [ $wait_time -ge $MAX_WAIT_TIME ]; then
            error "Timeout waiting for E2E lock after ${MAX_WAIT_TIME}s"
            error "Lock file: $E2E_LOCK"

            if [ -f "$E2E_LOCK" ]; then
                local lock_pid=$(cat "$E2E_LOCK" 2>/dev/null || echo "unknown")
                error "Lock held by PID: $lock_pid"

                # Check if PID is still alive
                if ! kill -0 "$lock_pid" 2>/dev/null; then
                    warn "Lock PID $lock_pid is dead, removing stale lock"
                    rm -f "$E2E_LOCK"
                    continue
                fi
            fi

            exit 1
        fi

        local other_pid=$(cat "$E2E_LOCK" 2>/dev/null || echo "unknown")
        warn "E2E test already running (PID: $other_pid)"
        warn "Waiting... (${wait_time}s / ${MAX_WAIT_TIME}s)"

        sleep 10
        wait_time=$((wait_time + 10))
    done

    # Create lock file with our PID
    echo $$ > "$E2E_LOCK"
    log "E2E lock acquired (PID: $$)"
}

release_e2e_lock() {
    if [ -f "$E2E_LOCK" ]; then
        local lock_pid=$(cat "$E2E_LOCK" 2>/dev/null || echo "unknown")

        # Only remove if it's our lock
        if [ "$lock_pid" = "$$" ]; then
            rm -f "$E2E_LOCK"
            log "E2E lock released (PID: $$)"
        else
            warn "Lock file belongs to PID $lock_pid, not removing"
        fi
    fi
}

# Main
main() {
    log "Starting test with resource monitoring..."
    log "Limits: CPU=${MAX_CPU_PERCENT}%, Memory=${MAX_MEMORY_MB}MB"

    # Acquire E2E lock (wait if necessary)
    acquire_e2e_lock

    # Ensure lock is released on exit
    trap release_e2e_lock EXIT

    # Run test command in background
    "$@" &
    TEST_PID=$!

    log "Test PID: $TEST_PID"

    # Monitor in parallel
    monitor_resources "$TEST_PID" &
    MONITOR_PID=$!

    # Wait for test to complete
    wait "$TEST_PID"
    TEST_EXIT_CODE=$?

    # Kill monitor
    kill "$MONITOR_PID" 2>/dev/null || true

    if [ $TEST_EXIT_CODE -eq 0 ]; then
        log "Tests completed successfully ✓"
    else
        error "Tests failed with exit code $TEST_EXIT_CODE"
    fi

    exit $TEST_EXIT_CODE
}

# Run
main "$@"
