#!/bin/bash
# run.sh — single cron wrapper for all bisdak-autoblog commands
# Usage: run.sh <discover|publish|keywords|health|purge-drafts>
set -euo pipefail

COMMAND="${1:?Usage: run.sh <discover|publish|keywords|health|purge-drafts>}"
SCRIPT_DIR="/opt/bisdak-autoblog"
LOG_DIR="/var/log/bisdak-autoblog"
LOCK_DIR="/var/lib/bisdak-autoblog"
LOCK_FILE="${LOCK_DIR}/${COMMAND}.lock"
PYTHON="${SCRIPT_DIR}/.venv/bin/python"
LOG_FILE="${LOG_DIR}/${COMMAND}_$(date +%Y%m%d).log"

mkdir -p "$LOG_DIR" "$LOCK_DIR"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
    echo "$(date -Iseconds) [WARN] ${COMMAND} already running, skipping." >> "$LOG_FILE"
    exit 0
fi

export PYTHONPATH="$SCRIPT_DIR"
export AUTOBLOG_BASE_DIR="$SCRIPT_DIR"

echo "$(date -Iseconds) [INFO] ${COMMAND} started." >> "$LOG_FILE"
"$PYTHON" -m autoblog.main "$COMMAND" >> "$LOG_FILE" 2>&1
EXIT_CODE=$?
echo "$(date -Iseconds) [INFO] ${COMMAND} done (exit=${EXIT_CODE})." >> "$LOG_FILE"
exit $EXIT_CODE
