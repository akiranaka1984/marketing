/**
 * D6 dual-score — evaluates a campaign on BOTH short-term efficiency (Hopkins/
 * Zyman: CAC/ROAS/CVR) AND long-term brand health (Sharp: reach/penetration).
 *
 * CONSTITUTION: short-term-only optimization is a boring extraction machine and a
 * violation. The decision therefore NEVER comes from short-term alone — a campaign
 * that is efficient but reaches almost no one is not allowed to "scale" blindly.
 */

import type { ChannelMetrics } from "../channel/channel-adapter";

export interface CampaignTargets {
  /** Target cost per acquisition (tenant currency). Lower is better. */
  targetCac?: number;
  /** Target return on ad spend (revenue/spend). Higher is better. */
  targetRoas?: number;
  /** Minimum UNIQUE reach for a result to be trusted (penetration floor). */
  minReach?: number;
}

export type LoopDecision = "scale" | "iterate" | "kill";

export interface DualScore {
  /** 0..1 short-term efficiency. */
  shortTerm: number;
  /** 0..1 long-term reach/brand health. */
  longTerm: number;
  decision: LoopDecision;
  reasons: string[];
  derived: { cac: number | null; roas: number | null; cvr: number };
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

const DEFAULT_MIN_REACH = 1000;

export function scoreCampaign(metrics: ChannelMetrics, targets: CampaignTargets = {}): DualScore {
  const reasons: string[] = [];

  const cac = metrics.conversions > 0 ? metrics.spend / metrics.conversions : null;
  const roas =
    metrics.revenue !== undefined && metrics.spend > 0 ? metrics.revenue / metrics.spend : null;
  const cvr = metrics.clicks > 0 ? metrics.conversions / metrics.clicks : 0;

  // Short-term efficiency: prefer ROAS when revenue is measurable, else CAC vs target.
  let shortTerm: number;
  if (roas !== null && targets.targetRoas) {
    shortTerm = clamp01(roas / targets.targetRoas);
  } else if (cac !== null && targets.targetCac) {
    shortTerm = clamp01(targets.targetCac / cac);
  } else {
    shortTerm = clamp01(cvr * 5); // no targets: lean on conversion rate as a proxy
    reasons.push("効率ターゲット未設定: CVRを暫定指標に使用");
  }

  // Long-term: UNIQUE reach (Sharp's penetration) vs the floor below which a "win"
  // is meaningless. Impressions are NOT used — frequency can inflate them while
  // reaching almost no one. With no reach data, penetration cannot be proven.
  const floor = targets.minReach ?? DEFAULT_MIN_REACH;
  let longTerm: number;
  if (metrics.reach === undefined) {
    longTerm = 0;
    reasons.push("ユニークリーチ不明: 浸透を証明できず長期判断は保留");
  } else {
    longTerm = clamp01(metrics.reach / floor);
    if (metrics.reach < floor) {
      reasons.push(`ユニークリーチが下限(${floor})未満: 長期判断は保留`);
    }
  }

  // Decision: scaling REQUIRES both dimensions — efficiency alone never scales.
  let decision: LoopDecision;
  if (shortTerm >= 0.8 && longTerm >= 0.8) {
    decision = "scale";
  } else if (shortTerm < 0.3 && longTerm >= 0.8) {
    decision = "kill";
    reasons.push("十分な到達で効率が低い: この角度はボツ");
  } else {
    decision = "iterate";
  }

  return { shortTerm, longTerm, decision, reasons, derived: { cac, roas, cvr } };
}
