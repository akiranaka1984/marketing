#!/usr/bin/env bash
# loop.sh — build-time quality gate (the closed-loop VERIFY stage).
# Green (exit 0) = ship. Non-zero = read the failure, fix, run again.
# This is the gate an autonomous build loop (e.g. `claude -p` pipeline) checks each pass.
set -euo pipefail
cd "$(dirname "$0")"

echo "▶ lint";      pnpm lint
echo "▶ typecheck"; pnpm typecheck
echo "▶ test";      pnpm test

echo "✅ all quality gates green"
