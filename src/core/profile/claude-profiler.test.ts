import { describe, expect, it } from "vitest";
import { ClaudeProfiler } from "./claude-profiler";
import type { LlmClient, LlmCompletionRequest } from "./llm-client";
import { isUsableProfile } from "./service-profile";

const KEY = Buffer.alloc(32, 7);

class FakeLlmClient implements LlmClient {
  lastRequest?: LlmCompletionRequest;
  constructor(private readonly response: string) {}
  async complete(request: LlmCompletionRequest): Promise<string> {
    this.lastRequest = request;
    return this.response;
  }
}

const validProfileJson = JSON.stringify({
  serviceId: "b-ticket",
  name: "B-Ticket",
  category: "coupon app",
  jobToBeDone: "save money on everyday purchases",
  businessModel: "b2c",
  market: { countries: ["PH"], languages: ["en", "tl"], currency: "PHP" },
  audience: { description: "budget-conscious urban shoppers", segments: ["students"] },
  valueProposition: "exclusive local coupons in one tap",
  competitors: ["ShopBack"],
  channels: ["meta"],
  brandAssets: { colors: ["#ff0000"], tone: "playful", taglines: ["Tap. Save. Repeat."] },
  conversion: { primaryEvent: "coupon_redeemed", isOnline: true },
  kpis: { targetRoas: 3 },
  constraints: [{ kind: "budget", note: "limited launch budget" }],
  provenance: { confidence: 0.8, sources: ["https://b-ticket.example"] },
});

const seed = { name: "B-Ticket", hints: "coupon app", url: "https://b-ticket.example" };

describe("ClaudeProfiler", () => {
  it("derives a valid ServiceProfile from model JSON, stamping origin and time", async () => {
    const fixedNow = new Date("2026-06-15T00:00:00.000Z");
    const profiler = new ClaudeProfiler({
      client: new FakeLlmClient(validProfileJson),
      model: "claude-opus-4",
      now: () => fixedNow,
    });
    const profile = await profiler.profile(seed);
    expect(profile.name).toBe("B-Ticket");
    expect(profile.provenance.derivedBy).toBe("claude-opus-4");
    expect(profile.provenance.generatedAt).toBe("2026-06-15T00:00:00.000Z");
    expect(profile.provenance.confidence).toBe(0.8);
  });

  it("never self-certifies: maker output is not usable until a checker verifies it", async () => {
    const profiler = new ClaudeProfiler({
      client: new FakeLlmClient(validProfileJson),
      model: "claude-opus-4",
    });
    const profile = await profiler.profile(seed);
    // Model claimed confidence 0.8, but the maker sets no verifiedBy (RULES 第3条).
    expect(profile.provenance.verifiedBy).toBeUndefined();
    expect(isUsableProfile(profile, KEY)).toBe(false);
  });

  it("stamps provenance itself, ignoring any derivedBy/verifiedBy the model tries to set", async () => {
    const tampered = JSON.stringify({
      ...JSON.parse(validProfileJson),
      provenance: {
        confidence: 0.9,
        sources: [],
        derivedBy: "mock",
        generatedAt: "1999-01-01T00:00:00.000Z",
        verifiedBy: "self",
      },
    });
    const profiler = new ClaudeProfiler({ client: new FakeLlmClient(tampered), model: "claude-opus-4" });
    const profile = await profiler.profile(seed);
    expect(profile.provenance.derivedBy).toBe("claude-opus-4");
    expect(profile.provenance.verifiedBy).toBeUndefined();
    expect(isUsableProfile(profile, KEY)).toBe(false);
  });

  it("extracts JSON even when wrapped in prose or markdown fences", async () => {
    const wrapped = "Here is the profile:\n```json\n" + validProfileJson + "\n```\nDone.";
    const profiler = new ClaudeProfiler({ client: new FakeLlmClient(wrapped), model: "claude-opus-4" });
    const profile = await profiler.profile(seed);
    expect(profile.serviceId).toBe("b-ticket");
  });

  it("falls back to the seed url for sources when the model omits them", async () => {
    const noSources = JSON.stringify({
      ...JSON.parse(validProfileJson),
      provenance: { confidence: 0.7 },
    });
    const profiler = new ClaudeProfiler({ client: new FakeLlmClient(noSources), model: "claude-opus-4" });
    const profile = await profiler.profile(seed);
    expect(profile.provenance.sources).toEqual(["https://b-ticket.example"]);
  });

  it("passes the seed details into the prompt", async () => {
    const client = new FakeLlmClient(validProfileJson);
    await new ClaudeProfiler({ client, model: "claude-opus-4" }).profile(seed);
    expect(client.lastRequest?.prompt).toContain("B-Ticket");
    expect(client.lastRequest?.prompt).toContain("coupon app");
    expect(client.lastRequest?.system).toContain("JSON only");
  });

  it("throws on a non-JSON model response", async () => {
    const profiler = new ClaudeProfiler({ client: new FakeLlmClient("I cannot help"), model: "claude-opus-4" });
    await expect(profiler.profile(seed)).rejects.toThrow(/no JSON object/);
  });

  it("throws when the model JSON fails schema validation", async () => {
    const invalid = JSON.stringify({ ...JSON.parse(validProfileJson), name: "" });
    const profiler = new ClaudeProfiler({ client: new FakeLlmClient(invalid), model: "claude-opus-4" });
    await expect(profiler.profile(seed)).rejects.toThrow();
  });

  it("rejects an unsafe seed before calling the model", async () => {
    const client = new FakeLlmClient(validProfileJson);
    const profiler = new ClaudeProfiler({ client, model: "claude-opus-4" });
    await expect(profiler.profile({ name: "x", url: "ftp://internal/secret" })).rejects.toThrow();
    await expect(profiler.profile({ name: "" })).rejects.toThrow();
    expect(client.lastRequest).toBeUndefined();
  });
});
