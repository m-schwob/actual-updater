#!/usr/bin/env bash

LOG_DIR="$(dirname "$0")/logs"
mkdir -p "$LOG_DIR"

# Arrays tracking background jobs in each group
_PIDS=(); _NAMES=(); _LOGS=()

# Launch a command in the background, recording it for wait_group().
run_bg() {
    local name="$1"; shift
    local log="$LOG_DIR/$(echo "$name" | tr ' /' '__').log"
    "$@" >"$log" 2>&1 &
    _PIDS+=("$!")
    _NAMES+=("$name")
    _LOGS+=("$log")
}

# Wait for all background jobs launched since the last call.
# Prints [OK] / [FAIL + log path] for each. Returns 1 if any job failed.
wait_group() {
    local fail=0
    for i in "${!_PIDS[@]}"; do
        if wait "${_PIDS[$i]}"; then
            printf "  [OK]   %s\n" "${_NAMES[$i]}"
        else
            printf "  [FAIL] %s  -- log: %s\n" "${_NAMES[$i]}" "${_LOGS[$i]}"
            fail=1
        fi
    done
    _PIDS=(); _NAMES=(); _LOGS=()
    return $fail
}

FAIL=0

# --- Group 1 (parallel): yarn and pip are independent of each other ----------
echo "==> Starting: yarn install, pip install"
run_bg "yarn install" \
    yarn install
run_bg "pip install" \
    bash -c "pip install --upgrade pip && pip install -e '.[dev]' && pip install -e ."
wait_group || FAIL=1

# --- Group 2: playwright depends on the pip package being installed ----------
echo "==> Starting: playwright install chromium"
run_bg "playwright install chromium" \
    playwright install chromium --with-deps
wait_group || FAIL=1

# --- Instant: git safe directory ---------------------------------------------
git config --system --add safe.directory /workspaces/actual-updater 2>/dev/null || true

if [ $FAIL -eq 0 ]; then
    echo "==> All steps completed successfully."
else
    echo "==> One or more steps failed. Check logs in $LOG_DIR"
    exit 1
fi
