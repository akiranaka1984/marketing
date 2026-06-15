import { describe, expect, it } from "vitest";
import { MetaAdapter } from "./meta-adapter";
import type { AdSpec } from "./channel-adapter";

const spec: AdSpec = {
  channel: "meta",
  headline: "今日の食費、3タップで38ペソ浮かせる",
  body: "並ばず、登録なしで。",
  audience: "Manila students",
  dailyBudget: 500,
};

describe("MetaAdapter", () => {
  it("is a meta channel adapter", () => {
    expect(new MetaAdapter().channel).toBe("meta");
  });

  it("simulates a publish when no credentials are present", async () => {
    const result = await new MetaAdapter().publish(spec);
    expect(result.simulated).toBe(true);
    expect(result.status).toBe("simulated");
    expect(result.externalId).toMatch(/^meta-sim-/);
  });

  it("simulates when dryRun is set even with credentials", async () => {
    const adapter = new MetaAdapter({ accessToken: "x", adAccountId: "act_1" });
    const result = await adapter.publish(spec, { dryRun: true });
    expect(result.simulated).toBe(true);
  });

  it("refuses to fake a live publish when credentials exist", async () => {
    const adapter = new MetaAdapter({ accessToken: "x", adAccountId: "act_1" });
    await expect(adapter.publish(spec)).rejects.toThrow(/not implemented/i);
  });

  it("returns deterministic metrics for a published ad", async () => {
    const adapter = new MetaAdapter();
    const { externalId } = await adapter.publish(spec);
    const a = await adapter.fetchMetrics(externalId);
    const b = await adapter.fetchMetrics(externalId);
    expect(a).toEqual(b);
    expect(a.spend).toBe(spec.dailyBudget);
    expect(a.impressions).toBeGreaterThan(0);
    expect(a.clicks).toBeGreaterThanOrEqual(a.conversions);
  });

  it("throws for an unknown externalId", async () => {
    await expect(new MetaAdapter().fetchMetrics("nope")).rejects.toThrow(/unknown externalId/);
  });
});
