import { describe, expect, it } from "vitest";
import { routeDoctrine } from "../doctrine/router";
import type { LlmClient, LlmCompletionRequest } from "../profile/llm-client";
import { MockProfiler } from "../profile/mock-profiler";
import { buildCreativeBrief, ClaudeCreativeMaker } from "./creative-maker";

class FakeLlmClient implements LlmClient {
  lastRequest?: LlmCompletionRequest;
  constructor(private readonly response: string) {}
  async complete(request: LlmCompletionRequest): Promise<string> {
    this.lastRequest = request;
    return this.response;
  }
}

async function briefFor(name: string, over?: Parameters<MockProfiler["profile"]>[0]) {
  const profile = await new MockProfiler().profile({ name, ...over });
  return { profile, brief: buildCreativeBrief(profile, routeDoctrine(profile)) };
}

const candidatesJson = JSON.stringify([
  {
    headline: "Your ₱500 grocery run, ₱120 lighter — before you reach the till",
    body: "Scan one code at checkout and watch the exact peso drop. No points to chase.",
    audience: "PH urban shoppers who track every peso",
    dailyBudget: 800,
    angle: "the saving is visible at the register, not a vague 'discount'",
    metricHypothesis: "lifts CVR on coupon_redeem by showing the exact peso saved",
  },
  {
    headline: "high quality coupons for everyone",
    body: "trusted savings, simple and easy",
    audience: "anyone",
    dailyBudget: 999999,
    angle: "generic",
    metricHypothesis: "awareness",
  },
]);

describe("buildCreativeBrief", () => {
  it("distills the profile + D3 doctrine into a brief", async () => {
    const { profile, brief } = await briefFor("B-Ticket");
    expect(brief.serviceName).toBe(profile.name);
    expect(brief.jobToBeDone).toBe(profile.jobToBeDone);
    expect(brief.valueProposition).toBe(profile.valueProposition);
    expect(brief.primaryEvent).toBe(profile.conversion.primaryEvent);
    expect(brief.channels).toEqual(profile.channels);
    // The sharpness mandate must come from the D3 routed decision.
    const d3 = routeDoctrine(profile).decisions.find((d) => d.id === "D3");
    expect(brief.sharpnessMandate).toContain(d3!.firing);
  });

  it("derives a daily-budget ceiling from monthlyBudget when present", async () => {
    const { profile, brief } = await briefFor("B-Ticket");
    if (profile.kpis.monthlyBudget !== undefined && profile.kpis.monthlyBudget > 0) {
      expect(brief.dailyBudgetCeiling).toBeCloseTo(profile.kpis.monthlyBudget / 30);
    } else {
      expect(brief.dailyBudgetCeiling).toBeUndefined();
    }
  });
});

describe("ClaudeCreativeMaker", () => {
  it("parses a JSON array of candidates and validates each", async () => {
    const { brief } = await briefFor("B-Ticket");
    const maker = new ClaudeCreativeMaker({ client: new FakeLlmClient(candidatesJson), model: "claude-test" });
    const out = await maker.generate(brief, 2);
    expect(out).toHaveLength(2);
    expect(out[0].angle).toContain("register");
    expect(out[0].metricHypothesis).toContain("coupon_redeem");
  });

  it("does NOT self-filter: boring candidates still come back (the checker decides)", async () => {
    const { brief } = await briefFor("B-Ticket");
    const maker = new ClaudeCreativeMaker({ client: new FakeLlmClient(candidatesJson), model: "claude-test" });
    const out = await maker.generate(brief, 2);
    // The second candidate is full of clichés but the MAKER must not drop it (RULES 第3条).
    expect(out.some((c) => c.headline.includes("high quality"))).toBe(true);
  });

  it("clamps dailyBudget to the brief ceiling", async () => {
    const { brief } = await briefFor("B-Ticket");
    if (brief.dailyBudgetCeiling === undefined) return;
    const maker = new ClaudeCreativeMaker({ client: new FakeLlmClient(candidatesJson), model: "claude-test" });
    const out = await maker.generate(brief, 2);
    for (const c of out) expect(c.dailyBudget).toBeLessThanOrEqual(brief.dailyBudgetCeiling);
  });

  it("passes the brief into the prompt and demands JSON-only sharp output", async () => {
    const { brief } = await briefFor("B-Ticket");
    const client = new FakeLlmClient(candidatesJson);
    await new ClaudeCreativeMaker({ client, model: "claude-test" }).generate(brief, 3);
    expect(client.lastRequest?.prompt).toContain(brief.serviceName);
    expect(client.lastRequest?.prompt).toContain(brief.primaryEvent);
    expect(client.lastRequest?.system).toContain("JSON only");
    expect(client.lastRequest?.system).toContain("SHARP");
  });

  it("throws on a non-array model response", async () => {
    const { brief } = await briefFor("B-Ticket");
    const maker = new ClaudeCreativeMaker({ client: new FakeLlmClient("I cannot help"), model: "claude-test" });
    await expect(maker.generate(brief, 2)).rejects.toThrow(/no JSON array/);
  });

  it("throws when a candidate fails schema validation", async () => {
    const bad = JSON.stringify([{ headline: "x", body: "y", audience: "z", dailyBudget: -1, angle: "a", metricHypothesis: "m" }]);
    const { brief } = await briefFor("B-Ticket");
    const maker = new ClaudeCreativeMaker({ client: new FakeLlmClient(bad), model: "claude-test" });
    await expect(maker.generate(brief, 1)).rejects.toThrow();
  });
});
