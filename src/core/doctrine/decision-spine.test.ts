import { describe, expect, it } from "vitest";
import { DECISION_SPINE, type DecisionId } from "./decision-spine";

describe("Decision Spine", () => {
  it("has exactly the 7 universal decisions D1–D7 in order", () => {
    const ids = DECISION_SPINE.map((d) => d.id);
    expect(ids).toEqual<DecisionId[]>(["D1", "D2", "D3", "D4", "D5", "D6", "D7"]);
  });

  it("every decision has a question and at least two positions", () => {
    for (const d of DECISION_SPINE) {
      expect(d.question.trim().length).toBeGreaterThan(0);
      expect(d.positions.length).toBeGreaterThanOrEqual(2);
      for (const p of d.positions) {
        expect(p.thinker.trim().length).toBeGreaterThan(0);
        expect(p.stance.trim().length).toBeGreaterThan(0);
      }
    }
  });

  // Constitution: a genuine conflict must never be silently collapsed to a single
  // averaged answer. Conflicts are competed or dual-scored, never plain "select".
  it("never resolves a conflicting decision by averaging it away", () => {
    for (const d of DECISION_SPINE) {
      if (d.hasConflict) {
        expect(d.defaultArbitration).not.toBe("select");
      }
    }
  });
});
