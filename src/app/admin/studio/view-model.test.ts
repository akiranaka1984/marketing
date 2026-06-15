import { describe, expect, it } from "vitest";
import type { GeneratedCreative } from "../../../core/creative/creative-maker";
import type { CreativeSelection } from "../../../core/creative/creative-selector";
import { MockProfiler } from "../../../core/profile/mock-profiler";
import { routeDoctrine } from "../../../core/doctrine/router";
import { buildCreativeSelectionView, buildStudioView } from "./view-model";

async function viewFor(name: string) {
  const profile = await new MockProfiler().profile({ name });
  return { profile, view: buildStudioView(profile, routeDoctrine(profile)) };
}

describe("buildStudioView", () => {
  it("carries profile identity and a 0–100 confidence", async () => {
    const { profile, view } = await viewFor("B-Ticket");
    expect(view.serviceId).toBe("b-ticket");
    expect(view.name).toBe("B-Ticket");
    expect(view.confidencePct).toBe(Math.round(profile.provenance.confidence * 100));
    expect(view.confidencePct).toBeGreaterThanOrEqual(0);
    expect(view.confidencePct).toBeLessThanOrEqual(100);
    expect(view.derivedBy).toBe("mock");
  });

  it("renders all seven decisions in spine order", async () => {
    const { view } = await viewFor("Acme");
    expect(view.decisions.map((d) => d.id)).toEqual([
      "D1",
      "D2",
      "D3",
      "D4",
      "D5",
      "D6",
      "D7",
    ]);
  });

  it("labels arbitration modes and assigns badge tones", async () => {
    const { view } = await viewFor("Acme");
    const byId = Object.fromEntries(view.decisions.map((d) => [d.id, d]));

    // D1 is complementary => select.
    expect(byId.D1.arbitration).toBe("select");
    expect(byId.D1.tone).toBe("neutral");
    // D2 is a genuine conflict with no risk constraint => compete.
    expect(byId.D2.arbitration).toBe("compete");
    expect(byId.D2.arbitrationLabel).toContain("競合");
    expect(byId.D2.tone).toBe("accent");
    // D6 is always dual-score (constitution).
    expect(byId.D6.arbitration).toBe("dual-score");
    expect(byId.D6.tone).toBe("success");
  });

  it("counts how many decisions are not collapsed to a single stance", async () => {
    const { view } = await viewFor("Acme");
    const nonSelect = view.decisions.filter((d) => d.arbitration !== "select").length;
    expect(view.contestedCount).toBe(nonSelect);
  });
});

describe("buildCreativeSelectionView", () => {
  function creative(over: Partial<GeneratedCreative>): GeneratedCreative {
    return {
      headline: "h",
      body: "b",
      audience: "a",
      dailyBudget: 100,
      angle: "angle",
      metricHypothesis: "metric",
      ...over,
    };
  }

  it("maps sharpness to a 0–100 percent and carries angle + metric", () => {
    const selection: CreativeSelection<GeneratedCreative> = {
      passing: [{ creative: creative({ headline: "sharp" }), sharpness: 0.82 }],
      rejected: [{ creative: creative({ headline: "boring" }), reasons: ["常套句"] }],
    };
    const view = buildCreativeSelectionView(selection);
    expect(view.passing[0].sharpnessPct).toBe(82);
    expect(view.passing[0].angle).toBe("angle");
    expect(view.passing[0].metricHypothesis).toBe("metric");
    expect(view.rejected[0].headline).toBe("boring");
    expect(view.rejected[0].reasons).toEqual(["常套句"]);
  });
});
