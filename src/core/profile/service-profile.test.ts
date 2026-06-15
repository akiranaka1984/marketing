import { describe, expect, it } from "vitest";
import {
  CHANNELS,
  isUsableProfile,
  parseServiceProfile,
  serviceProfileSchema,
} from "./service-profile";
import { signProfile } from "./verification";

const KEY = Buffer.alloc(32, 7);

/** Mint a valid HMAC token for a profile, mirroring what the checker does on approval. */
function withToken(profile: ReturnType<typeof parseServiceProfile>) {
  return parseServiceProfile({
    ...profile,
    provenance: { ...profile.provenance, verificationToken: signProfile(profile, KEY) },
  });
}

function validProfile() {
  return {
    serviceId: "b-ticket",
    name: "B-Ticket",
    category: "coupon/discount app",
    jobToBeDone: "save money on everyday purchases",
    businessModel: "b2c",
    market: { countries: ["PH"], languages: ["en", "fil"], currency: "PHP" },
    audience: { description: "PH urban deal-seekers", segments: ["students"] },
    valueProposition: "one-tap local coupons",
    competitors: ["Shopee vouchers"],
    channels: ["meta", "sms"],
    brandAssets: { colors: ["#ff0000"], tone: "playful", taglines: ["Tara, save!"] },
    conversion: { primaryEvent: "coupon_redeem", isOnline: true },
    kpis: { targetCac: 1.5, monthlyBudget: 50000 },
    constraints: [{ kind: "legal", note: "no alcohol promos" }],
    provenance: {
      derivedBy: "mock",
      confidence: 0.4,
      sources: ["https://example.com"],
      generatedAt: "2026-06-15T00:00:00.000Z",
    },
  };
}

describe("serviceProfileSchema", () => {
  it("accepts a fully-specified profile", () => {
    expect(() => parseServiceProfile(validProfile())).not.toThrow();
  });

  it("rejects an empty name", () => {
    const bad = { ...validProfile(), name: "" };
    expect(() => parseServiceProfile(bad)).toThrow();
  });

  it("requires at least one channel", () => {
    const bad = { ...validProfile(), channels: [] };
    expect(() => parseServiceProfile(bad)).toThrow();
  });

  it("rejects an unknown channel", () => {
    const bad = { ...validProfile(), channels: ["carrier-pigeon"] };
    expect(() => parseServiceProfile(bad)).toThrow();
  });

  it("requires at least one market country", () => {
    const bad = { ...validProfile(), market: { countries: [], languages: ["en"], currency: "PHP" } };
    expect(() => parseServiceProfile(bad)).toThrow();
  });

  it("clamps confidence to the 0..1 range", () => {
    const bad = {
      ...validProfile(),
      provenance: { ...validProfile().provenance, confidence: 1.5 },
    };
    expect(() => parseServiceProfile(bad)).toThrow();
  });

  it("rejects whitespace-only required text", () => {
    const bad = { ...validProfile(), name: "   " };
    expect(() => parseServiceProfile(bad)).toThrow();
  });

  it("trims required text on parse", () => {
    const parsed = parseServiceProfile({ ...validProfile(), name: "  B-Ticket  " });
    expect(parsed.name).toBe("B-Ticket");
  });

  it("rejects a non-ISO generatedAt", () => {
    const bad = {
      ...validProfile(),
      provenance: { ...validProfile().provenance, generatedAt: "tomorrow" },
    };
    expect(() => parseServiceProfile(bad)).toThrow();
  });

  it("exposes a stable channel vocabulary", () => {
    expect(CHANNELS).toContain("meta");
    expect(serviceProfileSchema.shape.channels).toBeDefined();
  });
});

/** A profile carrying authentic checker provenance + a valid HMAC token. */
function verifiedProfile(overrides: Record<string, unknown> = {}) {
  return withToken(
    parseServiceProfile({
      ...validProfile(),
      provenance: {
        ...validProfile().provenance,
        derivedBy: "claude",
        confidence: 0.8,
        verifiedBy: "checker",
        verifiedAt: "2026-06-15T00:00:00.000Z",
        ...overrides,
      },
    }),
  );
}

describe("isUsableProfile", () => {
  it("rejects mock-derived profiles", () => {
    const profile = verifiedProfile({ derivedBy: "mock", confidence: 0 });
    expect(isUsableProfile(profile, KEY)).toBe(false);
  });

  it("rejects low-confidence profiles", () => {
    const profile = verifiedProfile({ confidence: 0.3 });
    expect(isUsableProfile(profile, KEY)).toBe(false);
  });

  it("rejects an unverified maker-only profile even when confident", () => {
    const profile = parseServiceProfile({
      ...validProfile(),
      provenance: { ...validProfile().provenance, derivedBy: "claude", confidence: 0.9 },
    });
    expect(isUsableProfile(profile, KEY)).toBe(false);
  });

  it("rejects a profile whose checker is the same agent as the maker", () => {
    const profile = verifiedProfile({ derivedBy: "claude", verifiedBy: "claude", confidence: 0.9 });
    expect(isUsableProfile(profile, KEY)).toBe(false);
  });

  it("rejects a profile with checker provenance but no verification token", () => {
    const profile = parseServiceProfile({
      ...validProfile(),
      provenance: {
        ...validProfile().provenance,
        derivedBy: "claude",
        confidence: 0.8,
        verifiedBy: "checker",
        verifiedAt: "2026-06-15T00:00:00.000Z",
      },
    });
    expect(isUsableProfile(profile, KEY)).toBe(false);
  });

  it("rejects a token minted with a different key", () => {
    const profile = verifiedProfile();
    expect(isUsableProfile(profile, Buffer.alloc(32, 9))).toBe(false);
  });

  it("rejects a verified profile whose fields were mutated after signing", () => {
    const profile = verifiedProfile();
    const tampered = parseServiceProfile({
      ...profile,
      provenance: { ...profile.provenance, confidence: 0.99 },
    });
    expect(isUsableProfile(tampered, KEY)).toBe(false);
  });

  it("accepts a checker-verified, confident, non-mock profile with a valid token", () => {
    expect(isUsableProfile(verifiedProfile(), KEY)).toBe(true);
  });
});
