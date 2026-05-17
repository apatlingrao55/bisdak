#!/bin/bash
# setup.sh — Initial deployment setup for bisdak-autoblog on VPS
set -euo pipefail

SCRIPT_DIR="/opt/bisdak-autoblog"
LOG_DIR="/var/log/bisdak-autoblog"
LOCK_DIR="/var/lib/bisdak-autoblog"

echo "=== Setting up bisdak-autoblog ==="

# Required dirs
mkdir -p "$LOG_DIR" "$LOCK_DIR"

# Create virtualenv
python3 -m venv "$SCRIPT_DIR/.venv"
source "$SCRIPT_DIR/.venv/bin/activate"

# Install dependencies
pip install --upgrade pip
pip install -r "$SCRIPT_DIR/requirements.txt"

# Create .env from example if it doesn't exist
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
    chmod 600 "$SCRIPT_DIR/.env"
    echo "Created .env — please edit with your DATABASE_URL, RESEND_API_KEY, etc."
fi

# Init local SQLite metadata DB
python -c "
import os; os.environ['AUTOBLOG_BASE_DIR'] = '$SCRIPT_DIR'
from autoblog.db import init_db
init_db()
print('SQLite metadata DB initialised.')
"

# Verify claude CLI is on PATH
if ! command -v claude >/dev/null 2>&1; then
    echo ""
    echo "WARN: 'claude' CLI not found on PATH. Install via Claude Code and OAuth"
    echo "      to your Pro/Max subscription before running 'publish'."
fi

echo ""
echo "=== Setup complete ==="
echo "Next steps:"
echo "1. Edit $SCRIPT_DIR/.env with secrets (DATABASE_URL, RESEND_API_KEY, NOTIFY_EMAIL, etc.)"
echo "2. Ensure 'claude' CLI is installed and OAuth'd"
echo "3. Add cron jobs. Check 'date' first — VPS may be on NZ local or UTC."
echo "   Assuming NZ local time (matches the InspectPro install on this VPS):"
echo "   0 2 * * *    $SCRIPT_DIR/run.sh discover    # 02:00 NZT daily"
echo "   0 3,13 * * 1-5 $SCRIPT_DIR/run.sh publish   # 03:00 + 13:00 NZT Mon-Fri"
echo "   0 2 * * 0    $SCRIPT_DIR/run.sh keywords    # 02:00 NZT Sun"
echo "   0 9 * * 1    $SCRIPT_DIR/run.sh health      # 09:00 NZT Mon"
echo "4. Optional weekly cleanup of old auto-generated drafts:"
echo "   0 22 * * 0   $SCRIPT_DIR/run.sh purge-drafts"
