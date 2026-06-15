import { describe, expect, it } from "vitest";
import { boringFilter } from "./boring-filter";

describe("boringFilter", () => {
  it("rejects empty copy", () => {
    const v = boringFilter({ text: "   " });
    expect(v.passed).toBe(false);
    expect(v.score).toBe(0);
  });

  it("rejects generic, cliché-laden copy", () => {
    const v = boringFilter({ text: "We provide high quality, affordable, trusted solutions for your needs" });
    expect(v.passed).toBe(false);
    expect(v.reasons.length).toBeGreaterThan(1);
    expect(v.score).toBeLessThan(0.5);
  });

  it("matches clichés case-insensitively", () => {
    const v = boringFilter({ text: "THE BEST QUALITY service in town, period" });
    expect(v.passed).toBe(false);
    expect(v.reasons.some((r) => r.includes("best quality"))).toBe(true);
  });

  it("catches Japanese clichés", () => {
    const v = boringFilter({ text: "業界No.1の高品質なサービスをお届けします" });
    expect(v.passed).toBe(false);
  });

  it("flags copy that is too short", () => {
    const v = boringFilter({ text: "Buy now" });
    expect(v.passed).toBe(false);
    expect(v.reasons.some((r) => r.includes("短すぎる"))).toBe(true);
  });

  it("rejects cliché-free but vague, everyone-targeting copy", () => {
    const v = boringFilter({ text: "Amazing deals for everyone every day in Manila" });
    expect(v.passed).toBe(false);
    expect(v.reasons.some((r) => r.includes("amazing") || r.includes("everyone"))).toBe(true);
  });

  it("passes sharp, specific, cliché-free copy", () => {
    const v = boringFilter({
      text: "今日の食費、3タップで38ペソ浮かせる。並ばず、登録なしで。",
    });
    expect(v.passed).toBe(true);
    expect(v.reasons).toHaveLength(0);
    expect(v.score).toBeGreaterThan(0.5);
  });

  it("always returns a score within [0,1]", () => {
    const samples = ["", "x", "high quality affordable best price trusted leading world class one-stop"];
    for (const text of samples) {
      const { score } = boringFilter({ text });
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });
});
