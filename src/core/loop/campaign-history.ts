/**
 * Campaign history — turns a single closed-loop run into durable MEMORY, and reads
 * that memory back as the D7 scale decision.
 *
 * D6 (dual-score) judges ONE run; D7 decides whether to SCALE — and the constitution
 * is explicit that scaling is bold投下 ONLY after the data confirms a win across runs
 * (ENGINE.md / router D7: 勝ち筋がデータ確認後のみ). A single good run never scales;
 * a recent kill verdict stops it. Generic: nothing branches on a service.
 */

import type { Channel } from "../profile/service-profile";
import type { ClosedLoopResult } from "./closed-loop";
import type { CampaignRun, CampaignRunStore } from "./campaign-run-store";

export interface RecordRunOptions {
  /** Stable id for the run (e.g. the publish externalId, or a generated uuid). */
  id: string;
  now?: () => Date;
}

/** Persist a closed-loop result as a CampaignRun so future runs can learn from it. */
export async function recordClosedLoopRun(
  store: CampaignRunStore,
  serviceId: string,
  channel: Channel,
  result: ClosedLoopResult,
  opts: RecordRunOptions,
): Promise<CampaignRun> {
  const now = opts.now ?? (() => new Date());
  const run: CampaignRun = {
    id: opts.id,
    serviceId,
    channel,
    status: result.status,
    spec: result.chosen,
    metrics: result.metrics,
    score: result.score,
    decision: result.score?.decision,
    recordedAt: now().toISOString(),
  };
  await store.record(run);
  return run;
}

export type ScaleAction = "scale" | "iterate" | "kill" | "insufficient-data";

export interface ScaleRecommendation {
  action: ScaleAction;
  reasons: string[];
  /** How many scored runs informed the call. */
  scoredRuns: number;
}

/** Default number of consecutive scale-verdict runs required before D7 commits to scaling. */
const MIN_CONFIRMING_RUNS = 2;

/**
 * D7 scale decision from D6 history (newest first). Scaling REQUIRES `minConfirming`
 * consecutive recent runs that all scored "scale"; a single recent "kill" overrides
 * everything; otherwise iterate. Without scored history, the answer is honestly
 * "insufficient-data" — never a blind scale.
 */
export function recommendScale(
  history: readonly CampaignRun[],
  minConfirming: number = MIN_CONFIRMING_RUNS,
): ScaleRecommendation {
  const scored = history.filter((r) => r.status === "scored" && r.score !== undefined);
  if (scored.length === 0) {
    return {
      action: "insufficient-data",
      reasons: ["スコア済みの配信実績がない: 拡大はデータ確認後のみ（D7）"],
      scoredRuns: 0,
    };
  }

  // "recent" = the freshest `minConfirming` scored runs. Kill is deliberately a RECENT
  // override (a fresh data-proven failure stops scaling), not permanent: a creative that
  // has since been iterated away from a killed angle can re-earn scale. An older kill
  // outside this window is intentionally not durable amnesty — it is a fresh-signal gate.
  const recent = scored.slice(0, minConfirming);
  if (recent.some((r) => r.score!.decision === "kill")) {
    return {
      action: "kill",
      reasons: ["直近の配信が十分到達で低効率: この角度はボツ（D6）"],
      scoredRuns: scored.length,
    };
  }
  if (recent.length >= minConfirming && recent.every((r) => r.score!.decision === "scale")) {
    return {
      action: "scale",
      reasons: [`直近${minConfirming}件が連続でscale: 勝ち筋がデータ確認済み、大胆投下可（D7）`],
      scoredRuns: scored.length,
    };
  }
  return {
    action: "iterate",
    reasons: ["勝ち筋が未確定: 反復して学習（D7はデータ確認後のみ拡大）"],
    scoredRuns: scored.length,
  };
}
