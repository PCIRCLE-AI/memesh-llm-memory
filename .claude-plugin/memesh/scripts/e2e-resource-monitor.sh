#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 <command> [args...]"
  exit 1
fi

MAX_RSS_MB=${MAX_RSS_MB:-4096}
MAX_CPU_PERCENT=${MAX_CPU_PERCENT:-400}
MAX_DURATION_SEC=${MAX_DURATION_SEC:-1800}
POLL_INTERVAL_SEC=${POLL_INTERVAL_SEC:-2}

COMMAND=("$@")
START_TS=$(date +%s)
KILLED_BY_MONITOR=0

cleanup() {
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID" 2>/dev/null || true
  fi
}

"${COMMAND[@]}" &
PID=$!
trap cleanup INT TERM

while kill -0 "$PID" 2>/dev/null; do
  ELAPSED=$(( $(date +%s) - START_TS ))
  if [ "$ELAPSED" -gt "$MAX_DURATION_SEC" ]; then
    echo "[monitor] Max duration exceeded (${MAX_DURATION_SEC}s). Terminating PID $PID."
    KILLED_BY_MONITOR=1
    kill "$PID" 2>/dev/null || true
    break
  fi

  PS_OUT=$(ps -o %cpu= -o rss= -p "$PID" 2>/dev/null || true)
  if [ -n "$PS_OUT" ]; then
    CPU=$(echo "$PS_OUT" | awk '{print int($1)}')
    RSS_KB=$(echo "$PS_OUT" | awk '{print int($2)}')
    RSS_MB=$(( RSS_KB / 1024 ))

    if [ "$RSS_MB" -gt "$MAX_RSS_MB" ]; then
      echo "[monitor] RSS ${RSS_MB}MB exceeded limit ${MAX_RSS_MB}MB. Terminating PID $PID."
      KILLED_BY_MONITOR=1
      kill "$PID" 2>/dev/null || true
      break
    fi

    if [ "$CPU" -gt "$MAX_CPU_PERCENT" ]; then
      echo "[monitor] CPU ${CPU}% exceeded limit ${MAX_CPU_PERCENT}%. Terminating PID $PID."
      KILLED_BY_MONITOR=1
      kill "$PID" 2>/dev/null || true
      break
    fi
  fi

  sleep "$POLL_INTERVAL_SEC"
done

wait "$PID" || EXIT_CODE=$?
EXIT_CODE=${EXIT_CODE:-0}

if [ "$KILLED_BY_MONITOR" -eq 1 ]; then
  echo "[monitor] Test run stopped by resource monitor."
  exit 1
fi

exit "$EXIT_CODE"
