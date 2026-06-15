<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AI Marketing System — Agent Guide

## Read before working
- `docs/VISION.md` — mission and definition of success
- `docs/RULES.md` — the constitution (第1条 = 尖りの原則。違反は即ボツ)
- `docs/ARCHITECTURE.md` — stack and the generalization principle
- `doctrine/ENGINE.md` — the universal Decision Spine D1–D7 (the brain spec)

## Non-negotiable constitution
1. **Sharp, never generic.** Output any competitor could produce = FAIL.
2. **No per-service hardcoding.** B-Ticket is a validation subject only. Service-specific
   branches/values in code = a bug. The brain is generic; per-service answers are AI-derived
   at runtime from an auto-generated ServiceProfile.
3. **Maker ≠ checker.** Generation and verification are separate agents. The BoringFilter
   gate (D3 criteria) must pass before shipping.
4. **Secrets never in code.** Channel API credentials are entered via admin UI, stored
   encrypted in DB. App secrets via `.env` (see `.env.example`).

## Quality gate (the closed-loop VERIFY stage)
Run `./loop.sh` (or `pnpm verify`) — lint + typecheck + test. Green = ship, red = fix and loop.
TDD: write the test first.
