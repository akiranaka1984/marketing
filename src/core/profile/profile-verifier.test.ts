import { describe, expect, it } from "vitest";
import type { LlmClient, LlmCompletionRequest } from "./llm-client";
import { ProfileVerifier } from "./profile-verifier";
import { isUsableProfile, parseServiceProfile, type ServiceProfile } from "./service-profile";

const KEY = Buffer.alloc(32, 7);

class FakeLlmClient implements LlmClient {
  lastRequest?: LlmCompletionRequest;
  constructor(private readonly response: string) {}
  async complete(request: LlmCompletionRequest): Promise<string> {
    this.lastRequest = request;
    return this.response;
  }
}

/** A maker's output: derivedBy set, no verifiedBy yet → not usable until a checker signs off. */
function makerProfile(): ServiceProfile {
  return parseServiceProfile({
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
    provenance: {
      derivedBy: "claude-opus-4",
      confidence: 0.9,
      sources: ["https://b-ticket.example"],
      generatedAt: "2026-06-15T00:00:00.000Z",
    },
  });
}

const approve = JSON.stringify({ verdict: "approve", confidence: 0.8, reasons: ["grounded and sharp"] });

describe("ProfileVerifier", () => {
  it("approves a profile, stamping an independent checker and time", async () => {
    const fixedNow = new Date("2026-06-16T00:00:00.000Z");
    const verifier = new ProfileVerifier({
      client: new FakeLlmClient(approve),
      checker: "claude-sonnet-4",
      key: KEY,
      now: () => fixedNow,
    });
    const result = await verifier.verify(makerProfile());
    expect(result.approved).toBe(true);
    expect(result.profile.provenance.verifiedBy).toBe("claude-sonnet-4");
    expect(result.profile.provenance.verifiedAt).toBe("2026-06-16T00:00:00.000Z");
    expect(result.profile.provenance.verificationToken).toBeDefined();
    expect(isUsableProfile(result.profile, KEY)).toBe(true);
  });

  it("overwrites confidence with the checker's score, not the maker's", async () => {
    const lowConfidenceApprove = JSON.stringify({ verdict: "approve", confidence: 0.3, reasons: [] });
    const verifier = new ProfileVerifier({
      client: new FakeLlmClient(lowConfidenceApprove),
      checker: "claude-sonnet-4", key: KEY,
    });
    const result = await verifier.verify(makerProfile());
    // Maker claimed 0.9, but the checker only gives 0.3 → below the usability threshold.
    expect(result.profile.provenance.confidence).toBe(0.3);
    expect(isUsableProfile(result.profile, KEY)).toBe(false);
  });

  it("returns the profile unchanged and unusable when the checker rejects", async () => {
    const reject = JSON.stringify({ verdict: "reject", confidence: 0.1, reasons: ["generic filler"] });
    const verifier = new ProfileVerifier({ client: new FakeLlmClient(reject), checker: "claude-sonnet-4", key: KEY });
    const result = await verifier.verify(makerProfile());
    expect(result.approved).toBe(false);
    expect(result.reasons).toContain("generic filler");
    expect(result.profile.provenance.verifiedBy).toBeUndefined();
    expect(isUsableProfile(result.profile, KEY)).toBe(false);
  });

  it("strips prior verification so a previously verified profile rejected on re-check is unusable", async () => {
    const approved = await new ProfileVerifier({
      client: new FakeLlmClient(approve),
      checker: "claude-sonnet-4",
      key: KEY,
    }).verify(makerProfile());
    expect(isUsableProfile(approved.profile, KEY)).toBe(true);

    const reject = JSON.stringify({ verdict: "reject", confidence: 0.1, reasons: ["stale on re-check"] });
    const rechecked = await new ProfileVerifier({
      client: new FakeLlmClient(reject),
      checker: "claude-haiku-4",
      key: KEY,
    }).verify(approved.profile);
    expect(rechecked.approved).toBe(false);
    expect(rechecked.profile.provenance.verifiedBy).toBeUndefined();
    expect(rechecked.profile.provenance.verificationToken).toBeUndefined();
    expect(isUsableProfile(rechecked.profile, KEY)).toBe(false);
  });

  it("refuses to verify when the checker is the same agent as the maker (RULES 第3条)", async () => {
    const verifier = new ProfileVerifier({ client: new FakeLlmClient(approve), checker: "claude-opus-4", key: KEY });
    await expect(verifier.verify(makerProfile())).rejects.toThrow(/checker must differ/);
  });

  it("does not call the model when the checker equals the maker", async () => {
    const client = new FakeLlmClient(approve);
    const verifier = new ProfileVerifier({ client, checker: "claude-opus-4", key: KEY });
    await expect(verifier.verify(makerProfile())).rejects.toThrow();
    expect(client.lastRequest).toBeUndefined();
  });

  it("tolerates a verdict wrapped in prose or markdown fences", async () => {
    const wrapped = "Review complete:\n```json\n" + approve + "\n```";
    const verifier = new ProfileVerifier({ client: new FakeLlmClient(wrapped), checker: "claude-sonnet-4", key: KEY });
    const result = await verifier.verify(makerProfile());
    expect(result.approved).toBe(true);
  });

  it("throws on a non-JSON checker response", async () => {
    const verifier = new ProfileVerifier({ client: new FakeLlmClient("looks fine to me"), checker: "claude-sonnet-4", key: KEY });
    await expect(verifier.verify(makerProfile())).rejects.toThrow(/no JSON object/);
  });

  it("throws on a malformed verdict", async () => {
    const bad = JSON.stringify({ verdict: "maybe", confidence: 0.8 });
    const verifier = new ProfileVerifier({ client: new FakeLlmClient(bad), checker: "claude-sonnet-4", key: KEY });
    await expect(verifier.verify(makerProfile())).rejects.toThrow();
  });

  it("puts the profile under review into the prompt", async () => {
    const client = new FakeLlmClient(approve);
    await new ProfileVerifier({ client, checker: "claude-sonnet-4", key: KEY }).verify(makerProfile());
    expect(client.lastRequest?.prompt).toContain("B-Ticket");
    expect(client.lastRequest?.system).toContain("independent reviewer");
  });
});
