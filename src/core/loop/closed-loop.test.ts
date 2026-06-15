import { describe, expect, it, vi } from "vitest";
import { runClosedLoop, type CreativeCandidate } from "./closed-loop";
import { MetaAdapter } from "../channel/meta-adapter";
import type { ChannelAdapter } from "../channel/channel-adapter";
import type { ServiceProfile } from "../profile/service-profile";

function profile(over: Partial<ServiceProfile> = {}): ServiceProfile {
  return {
    serviceId: "b-ticket",
    name: "B-Ticket",
    category: "coupon app",
    jobToBeDone: "今日の出費を賢く決める",
    businessModel: "b2c",
    market: { countries: ["PH"], languages: ["en", "fil"], currency: "PHP" },
    audience: { description: "PH urban deal-seekers", segments: ["students"] },
    valueProposition: "one-tap local coupons",
    competitors: ["Shopee vouchers", "GrabFood promos"],
    channels: ["meta", "sms"],
    brandAssets: { colors: ["#ff0000"], tone: "playful", taglines: ["Tara, save!"] },
    conversion: { primaryEvent: "coupon_redeem", isOnline: true },
    kpis: { targetCac: 12, monthlyBudget: 60000 },
    constraints: [],
    provenance: {
      derivedBy: "test",
      confidence: 0.9,
      sources: [],
      generatedAt: "2026-06-15T00:00:00.000Z",
    },
    ...over,
  };
}

const sharp: CreativeCandidate = {
  headline: "今日の食費、3タップで38ペソ浮かせる",
  body: "並ばず、登録なしで。レジで見せるだけ。",
  audience: "Manila students",
  dailyBudget: 500,
};

const boring: CreativeCandidate = {
  headline: "High quality affordable deals for everyone",
  body: "We provide trusted solutions for your needs.",
  audience: "all",
  dailyBudget: 500,
};

describe("runClosedLoop", () => {
  it("closes the loop: routes, filters, approves, publishes, measures, scores", async () => {
    const approve = vi.fn(() => true);
    const result = await runClosedLoop({
      profile: profile(),
      channel: "meta",
      candidates: [boring, sharp],
      adapter: new MetaAdapter(),
      approve,
      dryRun: true,
    });

    expect(result.status).toBe("scored");
    expect(result.routing.decisions).toHaveLength(7);
    expect(result.chosen?.headline).toBe(sharp.headline);
    expect(result.publish?.simulated).toBe(true);
    expect(result.metrics?.spend).toBe(sharp.dailyBudget);
    expect(result.score?.decision).toBeDefined();
    expect(result.rejected.map((r) => r.candidate)).toContain(boring);
    expect(approve).toHaveBeenCalledOnce();
  });

  it("stops when no candidate is sharp enough (BoringFilter rejects all)", async () => {
    const approve = vi.fn(() => true);
    const result = await runClosedLoop({
      profile: profile(),
      channel: "meta",
      candidates: [boring],
      adapter: new MetaAdapter(),
      approve,
    });
    expect(result.status).toBe("no-sharp-candidate");
    expect(result.publish).toBeUndefined();
    expect(approve).not.toHaveBeenCalled();
  });

  it("does not publish when the human rejects", async () => {
    const result = await runClosedLoop({
      profile: profile(),
      channel: "meta",
      candidates: [sharp],
      adapter: new MetaAdapter(),
      approve: () => false,
    });
    expect(result.status).toBe("rejected-by-human");
    expect(result.chosen).toBeDefined();
    expect(result.publish).toBeUndefined();
  });

  it("does not score when the platform rejects the publish", async () => {
    const rejecting: ChannelAdapter = {
      channel: "meta",
      publish: async () => ({ externalId: "x", status: "rejected", simulated: false }),
      fetchMetrics: async () => {
        throw new Error("should not be called");
      },
    };
    const result = await runClosedLoop({
      profile: profile(),
      channel: "meta",
      candidates: [sharp],
      adapter: rejecting,
      approve: () => true,
    });
    expect(result.status).toBe("rejected-by-platform");
    expect(result.metrics).toBeUndefined();
    expect(result.score).toBeUndefined();
  });

  it("rejects a channel not enabled in the profile", async () => {
    await expect(
      runClosedLoop({
        profile: profile({ channels: ["sms"] }),
        channel: "meta",
        candidates: [sharp],
        adapter: new MetaAdapter(),
        approve: () => true,
      }),
    ).rejects.toThrow(/not enabled/);
  });

  it("rejects an adapter built for a different channel", async () => {
    await expect(
      runClosedLoop({
        profile: profile(),
        channel: "sms",
        candidates: [sharp],
        adapter: new MetaAdapter(),
        approve: () => true,
      }),
    ).rejects.toThrow(/adapter is for/);
  });
});
