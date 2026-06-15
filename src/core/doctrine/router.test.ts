import { describe, expect, it } from "vitest";
import { routeDoctrine } from "./router";
import type { ServiceProfile } from "../profile/service-profile";

function profile(overrides: Partial<ServiceProfile> = {}): ServiceProfile {
  return {
    serviceId: "svc",
    name: "Svc",
    category: "cat",
    jobToBeDone: "job",
    businessModel: "b2c",
    market: { countries: ["PH"], languages: ["en"], currency: "PHP" },
    audience: { description: "aud", segments: [] },
    valueProposition: "vp",
    competitors: ["a", "b"],
    channels: ["meta"],
    brandAssets: { colors: ["#000"], tone: "t", taglines: ["tg"] },
    conversion: { primaryEvent: "lead", isOnline: true },
    kpis: {},
    constraints: [],
    provenance: {
      derivedBy: "test",
      confidence: 0.9,
      sources: [],
      generatedAt: "2026-06-15T00:00:00.000Z",
    },
    ...overrides,
  };
}

describe("routeDoctrine", () => {
  it("returns exactly D1..D7 in order", () => {
    const ids = routeDoctrine(profile()).decisions.map((d) => d.id);
    expect(ids).toEqual(["D1", "D2", "D3", "D4", "D5", "D6", "D7"]);
  });

  it("carries the serviceId through", () => {
    expect(routeDoctrine(profile({ serviceId: "x" })).serviceId).toBe("x");
  });

  it("keeps D1 and D5 as select", () => {
    const routing = routeDoctrine(profile());
    expect(routing.decisions.find((d) => d.id === "D1")?.arbitration).toBe("select");
    expect(routing.decisions.find((d) => d.id === "D5")?.arbitration).toBe("select");
  });

  it("ALWAYS keeps D6 dual-score, even under risk constraints", () => {
    const free = routeDoctrine(profile()).decisions.find((d) => d.id === "D6");
    const constrained = routeDoctrine(
      profile({ constraints: [{ kind: "budget", note: "tight" }] }),
    ).decisions.find((d) => d.id === "D6");
    expect(free?.arbitration).toBe("dual-score");
    expect(constrained?.arbitration).toBe("dual-score");
  });

  it("uses compete for conflicting decisions when unconstrained", () => {
    const routing = routeDoctrine(profile());
    for (const id of ["D2", "D3", "D4"] as const) {
      expect(routing.decisions.find((d) => d.id === id)?.arbitration).toBe("compete");
    }
    expect(routing.decisions.find((d) => d.id === "D7")?.arbitration).toBe("compete");
  });

  it("collapses D2/D3/D4 to select under risk/budget constraints (but not D7)", () => {
    const routing = routeDoctrine(profile({ constraints: [{ kind: "risk", note: "regulated" }] }));
    for (const id of ["D2", "D3", "D4"] as const) {
      expect(routing.decisions.find((d) => d.id === id)?.arbitration).toBe("select");
    }
    expect(routing.decisions.find((d) => d.id === "D7")?.arbitration).toBe("compete");
  });

  it("does NOT collapse conflicts for non-risk constraints (legal/brand/ops)", () => {
    const routing = routeDoctrine(
      profile({ constraints: [{ kind: "legal", note: "no alcohol promos" }] }),
    );
    for (const id of ["D2", "D3", "D4"] as const) {
      expect(routing.decisions.find((d) => d.id === id)?.arbitration).toBe("compete");
    }
  });

  it("leans Godin (narrow) for a new category", () => {
    const d2 = routeDoctrine(profile({ competitors: [] })).decisions.find((d) => d.id === "D2");
    expect(d2?.firing).toMatch(/Godin/);
  });

  it("leans create-demand at D4 for a new category", () => {
    const d4 = routeDoctrine(profile({ competitors: [] })).decisions.find((d) => d.id === "D4");
    expect(d4?.firing).toMatch(/創る/);
  });

  it("leans capture-demand at D4 for an established category", () => {
    const d4 = routeDoctrine(profile({ competitors: ["a", "b", "c"] })).decisions.find(
      (d) => d.id === "D4",
    );
    expect(d4?.firing).toMatch(/刈る/);
  });

  it("lists enabled channels at D5", () => {
    const d5 = routeDoctrine(profile({ channels: ["meta", "sms"] })).decisions.find(
      (d) => d.id === "D5",
    );
    expect(d5?.firing).toMatch(/meta/);
    expect(d5?.firing).toMatch(/sms/);
    expect(d5?.rationale).toMatch(/SMS/);
  });

  it("flags offline measurement at D6 when conversion is offline", () => {
    const d6 = routeDoctrine(
      profile({ conversion: { primaryEvent: "visit", isOnline: false } }),
    ).decisions.find((d) => d.id === "D6");
    expect(d6?.rationale).toMatch(/計測基盤/);
  });
});
