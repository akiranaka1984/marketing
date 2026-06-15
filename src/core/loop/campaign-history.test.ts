import { describe, expect, it } from "vitest";
import type { ChannelMetrics } from "../channel/channel-adapter";
import type { ClosedLoopResult } from "./closed-loop";
import { recommendScale, recordClosedLoopRun } from "./campaign-history";
import { InMemoryCampaignRunStore, type CampaignRun } from "./campaign-run-store";
import type { DualScore, LoopDecision } from "./dual-score";

const metrics: ChannelMetrics = {
  impressions: 10000,
  reach: 5000,
  clicks: 300,
  conversions: 40,
  spend: 400,
  revenue: 1600,
};

function score(decision: LoopDecision): DualScore {
  return { shortTerm: 0.9, longTerm: 0.9, decision, reasons: [], derived: { cac: 10, roas: 4, cvr: 0.13 } };
}

function scoredResult(decision: LoopDecision): ClosedLoopResult {
  return {
    status: "scored",
    routing: { serviceId: "svc", decisions: [] },
    chosen: { channel: "meta", headline: "h", body: "b", audience: "a", dailyBudget: 100 },
    metrics,
    score: score(decision),
    rejected: [],
  };
}

function run(over: Partial<CampaignRun>): CampaignRun {
  return {
    id: "r",
    serviceId: "svc",
    channel: "meta",
    status: "scored",
    score: score("scale"),
    recordedAt: "2026-06-15T00:00:00.000Z",
    ...over,
  };
}

describe("recordClosedLoopRun", () => {
  it("persists a scored run with its metrics and D6 decision", async () => {
    const store = new InMemoryCampaignRunStore();
    const recorded = await recordClosedLoopRun(store, "svc", "meta", scoredResult("scale"), {
      id: "run-1",
      now: () => new Date("2026-06-15T00:00:00.000Z"),
    });
    expect(recorded.decision).toBe("scale");
    expect(recorded.metrics).toEqual(metrics);
    const history = await store.history("svc");
    expect(history).toHaveLength(1);
    expect(history[0].id).toBe("run-1");
  });

  it("history is scoped per service and ordered newest first", async () => {
    const store = new InMemoryCampaignRunStore();
    await store.record(run({ id: "old", recordedAt: "2026-06-14T00:00:00.000Z" }));
    await store.record(run({ id: "new", recordedAt: "2026-06-15T00:00:00.000Z" }));
    await store.record(run({ id: "other", serviceId: "elsewhere" }));
    const history = await store.history("svc");
    expect(history.map((r) => r.id)).toEqual(["new", "old"]);
  });
});

describe("recommendScale (D7 from D6 history)", () => {
  it("is insufficient-data with no scored runs", () => {
    const rec = recommendScale([]);
    expect(rec.action).toBe("insufficient-data");
    expect(rec.scoredRuns).toBe(0);
  });

  it("never scales on a single good run — data must confirm across runs", () => {
    const rec = recommendScale([run({ score: score("scale") })]);
    expect(rec.action).toBe("iterate");
  });

  it("scales only after consecutive confirming runs", () => {
    const rec = recommendScale([
      run({ id: "a", score: score("scale"), recordedAt: "2026-06-15T00:00:00.000Z" }),
      run({ id: "b", score: score("scale"), recordedAt: "2026-06-14T00:00:00.000Z" }),
    ]);
    expect(rec.action).toBe("scale");
  });

  it("a recent kill verdict overrides and stops scaling", () => {
    const rec = recommendScale([
      run({ id: "a", score: score("kill"), recordedAt: "2026-06-15T00:00:00.000Z" }),
      run({ id: "b", score: score("scale"), recordedAt: "2026-06-14T00:00:00.000Z" }),
    ]);
    expect(rec.action).toBe("kill");
  });

  it("ignores non-scored runs when judging", () => {
    const rec = recommendScale([
      run({ id: "rej", status: "rejected-by-human", score: undefined }),
      run({ id: "a", score: score("scale"), recordedAt: "2026-06-15T00:00:00.000Z" }),
      run({ id: "b", score: score("scale"), recordedAt: "2026-06-14T00:00:00.000Z" }),
    ]);
    expect(rec.action).toBe("scale");
    expect(rec.scoredRuns).toBe(2);
  });
});
