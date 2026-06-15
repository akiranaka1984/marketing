import { describe, expect, it } from "vitest";
import { selectSharpCreatives } from "./creative-selector";

const sharp = {
  headline: "Your ₱500 grocery run, ₱120 lighter — before you reach the till",
  body: "Scan one code at checkout and watch the exact peso drop. No points to chase.",
};
const sharper = {
  headline: "The cashier scans your code and ₱200 vanishes from the total",
  body: "Not points. Not someday. Pesos off this exact receipt, right now.",
};
const boring = {
  headline: "high quality coupons for everyone",
  body: "trusted savings, simple and easy",
};

describe("selectSharpCreatives", () => {
  it("kills boring candidates and keeps sharp ones", () => {
    const { passing, rejected } = selectSharpCreatives([sharp, boring]);
    expect(passing.map((p) => p.creative)).toContainEqual(sharp);
    expect(rejected.map((r) => r.creative)).toContainEqual(boring);
    expect(rejected[0].reasons.length).toBeGreaterThan(0);
  });

  it("ranks survivors by sharpness descending", () => {
    const { passing } = selectSharpCreatives([sharp, sharper]);
    expect(passing).toHaveLength(2);
    for (let i = 1; i < passing.length; i++) {
      expect(passing[i - 1].sharpness).toBeGreaterThanOrEqual(passing[i].sharpness);
    }
  });

  it("returns no survivors when every candidate is boring", () => {
    const { passing, rejected } = selectSharpCreatives([boring]);
    expect(passing).toHaveLength(0);
    expect(rejected).toHaveLength(1);
  });
});
