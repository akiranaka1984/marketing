import { describe, expect, it, vi } from "vitest";
import {
  ProfilingPipeline,
  createProfilingPipeline,
  profilingConfigFromEnv,
} from "./profiling-pipeline";
import { ClaudeProfiler } from "./claude-profiler";
import { ProfileVerifier } from "./profile-verifier";
import type { LlmClient } from "./llm-client";
import { isUsableProfile } from "./service-profile";

const KEY = Buffer.alloc(32, 7);

const profileJson = {
  serviceId: "b-ticket",
  name: "B-Ticket",
  category: "coupon app",
  jobToBeDone: "今日の出費を賢く決める",
  businessModel: "b2c",
  market: { countries: ["PH"], languages: ["en", "fil"], currency: "PHP" },
  audience: { description: "PH urban deal-seekers", segments: ["students"] },
  valueProposition: "one-tap local coupons",
  competitors: ["Shopee vouchers"],
  channels: ["meta"],
  brandAssets: { colors: ["#ff0000"], tone: "playful", taglines: ["Tara, save!"] },
  conversion: { primaryEvent: "coupon_redeem", isOnline: true },
  kpis: { targetCac: 12, monthlyBudget: 60000 },
  constraints: [],
  provenance: { confidence: 0.9, sources: [] },
};

/** A canned LlmClient that returns a fixed text regardless of the prompt. */
function fakeClient(text: string): LlmClient {
  return { complete: async () => text };
}

function makerCheckerPipeline(verdict: "approve" | "reject"): ProfilingPipeline {
  const maker = new ClaudeProfiler({ client: fakeClient(JSON.stringify(profileJson)), model: "maker-model" });
  const checker = new ProfileVerifier({
    client: fakeClient(JSON.stringify({ verdict, confidence: 0.85, reasons: ["ok"] })),
    checker: "checker-model",
    key: KEY,
  });
  return new ProfilingPipeline({ maker, checker });
}

describe("ProfilingPipeline", () => {
  it("runs maker then checker and yields a usable, signed profile on approval", async () => {
    const result = await makerCheckerPipeline("approve").run({ name: "B-Ticket" });
    expect(result.approved).toBe(true);
    expect(result.profile.provenance.derivedBy).toBe("maker-model");
    expect(result.profile.provenance.verifiedBy).toBe("checker-model");
    expect(result.confidence).toBe(0.85);
    expect(isUsableProfile(result.profile, KEY)).toBe(true);
  });

  it("returns an unusable profile when the checker rejects", async () => {
    const result = await makerCheckerPipeline("reject").run({ name: "B-Ticket" });
    expect(result.approved).toBe(false);
    expect(isUsableProfile(result.profile, KEY)).toBe(false);
  });

  it("verifies in checker-then-nothing order: maker output is never trusted unverified", async () => {
    const makerSpy = vi.fn(async () => JSON.stringify(profileJson));
    const checkerSpy = vi.fn(async () => JSON.stringify({ verdict: "approve", confidence: 0.7, reasons: [] }));
    const pipeline = new ProfilingPipeline({
      maker: new ClaudeProfiler({ client: { complete: makerSpy }, model: "m" }),
      checker: new ProfileVerifier({ client: { complete: checkerSpy }, checker: "c", key: KEY }),
    });
    await pipeline.run({ name: "X" });
    expect(makerSpy).toHaveBeenCalledOnce();
    expect(checkerSpy).toHaveBeenCalledOnce();
  });
});

describe("createProfilingPipeline", () => {
  const base = { apiKey: "sk-test", verificationKey: KEY, makerModel: "claude-opus-4", checkerModel: "claude-sonnet-4" };

  it("builds a pipeline when maker and checker models differ", () => {
    expect(() => createProfilingPipeline(base)).not.toThrow();
  });

  it("refuses identical maker and checker models (maker ≠ checker at the model layer)", () => {
    expect(() => createProfilingPipeline({ ...base, checkerModel: "claude-opus-4" })).toThrow(/different model/);
  });
});

describe("profilingConfigFromEnv", () => {
  const env = {
    ANTHROPIC_API_KEY: "sk-test",
    PROFILE_VERIFICATION_KEY: Buffer.alloc(32, 7).toString("base64"),
    PROFILER_MODEL: "claude-opus-4",
    VERIFIER_MODEL: "claude-sonnet-4",
  };

  it("reads the api key, verification key, and both models from the environment", () => {
    const config = profilingConfigFromEnv(env);
    expect(config.apiKey).toBe("sk-test");
    expect(config.makerModel).toBe("claude-opus-4");
    expect(config.checkerModel).toBe("claude-sonnet-4");
    expect(config.verificationKey.length).toBe(32);
  });

  it("throws when ANTHROPIC_API_KEY is missing", () => {
    expect(() => profilingConfigFromEnv({ ...env, ANTHROPIC_API_KEY: undefined })).toThrow(/ANTHROPIC_API_KEY/);
  });

  it("throws when PROFILE_VERIFICATION_KEY is missing", () => {
    expect(() => profilingConfigFromEnv({ ...env, PROFILE_VERIFICATION_KEY: undefined })).toThrow(
      /PROFILE_VERIFICATION_KEY/,
    );
  });

  it("throws when the model identifiers are missing", () => {
    expect(() => profilingConfigFromEnv({ ...env, PROFILER_MODEL: undefined })).toThrow(/PROFILER_MODEL/);
    expect(() => profilingConfigFromEnv({ ...env, VERIFIER_MODEL: undefined })).toThrow(/VERIFIER_MODEL/);
  });
});
