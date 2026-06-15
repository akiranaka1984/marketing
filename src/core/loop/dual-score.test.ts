import { describe, expect, it } from "vitest";
import { scoreCampaign } from "./dual-score";
import type { ChannelMetrics } from "../channel/channel-adapter";

function metrics(over: Partial<ChannelMetrics> = {}): ChannelMetrics {
  return { impressions: 5000, reach: 3000, clicks: 200, conversions: 40, spend: 400, ...over };
}

describe("scoreCampaign", () => {
  it("derives CAC, ROAS and CVR", () => {
    const s = scoreCampaign(metrics({ revenue: 1200 }), { targetCac: 10, targetRoas: 2 });
    expect(s.derived.cac).toBe(10);
    expect(s.derived.roas).toBe(3);
    expect(s.derived.cvr).toBeCloseTo(0.2);
  });

  it("scales only when BOTH short and long term are strong", () => {
    const s = scoreCampaign(metrics({ revenue: 1600 }), {
      targetRoas: 2,
      targetCac: 10,
      minReach: 1000,
    });
    expect(s.shortTerm).toBeGreaterThanOrEqual(0.8);
    expect(s.longTerm).toBeGreaterThanOrEqual(0.8);
    expect(s.decision).toBe("scale");
  });

  it("never scales an efficient campaign with high impressions but tiny unique reach", () => {
    const s = scoreCampaign(metrics({ impressions: 100000, reach: 50, revenue: 1600 }), {
      targetRoas: 2,
      minReach: 1000,
    });
    expect(s.shortTerm).toBeGreaterThanOrEqual(0.8);
    expect(s.longTerm).toBeLessThan(0.8);
    expect(s.decision).not.toBe("scale");
  });

  it("cannot scale when unique reach is unreported", () => {
    const s = scoreCampaign(metrics({ reach: undefined, revenue: 1600 }), {
      targetRoas: 2,
      minReach: 1000,
    });
    expect(s.longTerm).toBe(0);
    expect(s.decision).not.toBe("scale");
    expect(s.reasons.some((r) => r.includes("ユニークリーチ不明"))).toBe(true);
  });

  it("kills a campaign with broad reach but poor efficiency", () => {
    const s = scoreCampaign(metrics({ reach: 5000, conversions: 1, revenue: 5 }), {
      targetRoas: 2,
      minReach: 1000,
    });
    expect(s.decision).toBe("kill");
  });

  it("falls back to CVR when no efficiency targets are set", () => {
    const s = scoreCampaign(metrics());
    expect(s.reasons.some((r) => r.includes("CVR"))).toBe(true);
    expect(s.shortTerm).toBeGreaterThan(0);
  });

  it("keeps scores within [0,1]", () => {
    const s = scoreCampaign(metrics({ revenue: 999999 }), { targetRoas: 0.1, minReach: 1 });
    expect(s.shortTerm).toBeLessThanOrEqual(1);
    expect(s.longTerm).toBeLessThanOrEqual(1);
  });
});
