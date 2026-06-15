import { describe, expect, it } from "vitest";
import {
  CHANNELS,
  isUsableProfile,
  parseServiceProfile,
  serviceProfileSchema,
} from "./service-profile";

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

describe("isUsableProfile", () => {
  it("rejects mock-derived profiles", () => {
    const profile = parseServiceProfile({
      ...validProfile(),
      provenance: { ...validProfile().provenance, derivedBy: "mock", confidence: 0 },
    });
    expect(isUsableProfile(profile)).toBe(false);
  });

  it("rejects low-confidence profiles", () => {
    const profile = parseServiceProfile({
      ...validProfile(),
      provenance: {
        ...validProfile().provenance,
        derivedBy: "claude",
        confidence: 0.3,
        verifiedBy: "checker",
        verifiedAt: "2026-06-15T00:00:00.000Z",
      },
    });
    expect(isUsableProfile(profile)).toBe(false);
  });

  it("rejects an unverified maker-only profile even when confident", () => {
    const profile = parseServiceProfile({
      ...validProfile(),
      provenance: { ...validProfile().provenance, derivedBy: "claude", confidence: 0.9 },
    });
    expect(isUsableProfile(profile)).toBe(false);
  });

  it("rejects a profile whose checker is the same agent as the maker", () => {
    const profile = parseServiceProfile({
      ...validProfile(),
      provenance: {
        ...validProfile().provenance,
        derivedBy: "claude",
        verifiedBy: "claude",
        confidence: 0.9,
        verifiedAt: "2026-06-15T00:00:00.000Z",
      },
    });
    expect(isUsableProfile(profile)).toBe(false);
  });

  it("accepts a checker-verified, confident, non-mock profile", () => {
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
    expect(isUsableProfile(profile)).toBe(true);
  });
});
