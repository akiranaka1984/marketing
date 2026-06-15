#!/usr/bin/env bash
#
# dev-loop.sh — the BUILD loop (the article's "Automations" heartbeat).
#
# It repeatedly hands one task to headless Claude Code, then runs the quality gate
# (./loop.sh = lint+typecheck+test). Closed loop: it stops when the gate is GREEN or
# after MAX_ITERS, so it never runs unbounded. State survives runs via
# .loop-state/memory.md (read at start of each iteration, updated at the end).
#
# Usage:
#   scripts/dev-loop.sh "<task prompt>"        # iterate on one task until gate is green
#   MAX_ITERS=5 scripts/dev-loop.sh "<task>"   # cap iterations (default 8)
#
# NOTE: each iteration spends Claude Max plan usage. Ctrl-C to stop early.

set -euo pipefail
cd "$(dirname "$0")/.."

TASK="${1:-}"
if [[ -z "$TASK" ]]; then
  echo "usage: scripts/dev-loop.sh \"<task prompt>\"" >&2
  exit 2
fi

MAX_ITERS="${MAX_ITERS:-8}"

PROMPT_TEMPLATE='You are advancing the AI marketing system build loop.
First read .loop-state/memory.md, AGENTS.md, docs/RULES.md and doctrine/ENGINE.md.
Honor the constitution: sharp not generic, NO per-service hardcoding, maker!=checker, secrets never in code, TDD (test first).
TASK: %s
When done, run ./loop.sh and make it green, then update .loop-state/memory.md.'

for (( i=1; i<=MAX_ITERS; i++ )); do
  echo "════════════════════════════════════════"
  echo "▶ dev-loop iteration $i/$MAX_ITERS"
  echo "════════════════════════════════════════"

  printf -v PROMPT "$PROMPT_TEMPLATE" "$TASK"
  claude -p "$PROMPT" --permission-mode acceptEdits

  if ./loop.sh; then
    echo "✅ gate green after $i iteration(s) — loop complete"
    exit 0
  fi

  echo "⚠ gate red — looping (VERIFY → ITERATE)"
done

echo "✗ reached MAX_ITERS=$MAX_ITERS without a green gate — needs human review" >&2
exit 1
