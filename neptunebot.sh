#!/bin/bash
set -eo pipefail

APP_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$APP_DIR"

# Match the complete command with this checkout's absolute entry-point path.
# Escape regex characters so paths containing spaces, dots or brackets work too.
ENTRY_PATTERN="$(printf '%s' "$APP_DIR/src/index.ts" | sed 's/[][\\.^$*+?(){}|]/\\&/g')"
PROCESS_PATTERN="node $ENTRY_PATTERN"
OWNER_UID="$(id -u)"

case "${1:-start}" in
  start)
    if pgrep -u "$OWNER_UID" -f -x "$PROCESS_PATTERN" > /dev/null; then
      exit 0
    else
      status=$?
      if [ "$status" -ne 1 ]; then
        exit "$status"
      fi
    fi

    # Load nvm when installed; otherwise use Node.js from PATH.
    export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
    if [ -s "$NVM_DIR/nvm.sh" ]; then
      . "$NVM_DIR/nvm.sh"
    fi
    command -v node > /dev/null

    printf '[%s] Starting bot\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" >> bot_monitor.log
    nohup node "$APP_DIR/src/index.ts" >> bot_output.log 2>&1 < /dev/null &
    ;;
  stop)
    if pkill -TERM -u "$OWNER_UID" -f -x "$PROCESS_PATTERN"; then
      exit 0
    else
      status=$?
      if [ "$status" -ne 1 ]; then
        exit "$status"
      fi
    fi
    ;;
  *)
    echo "Usage: $0 [start|stop]" >&2
    exit 2
    ;;
esac
