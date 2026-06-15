/**
 * Creative selector — the D3 CHECKER applied to maker output (RULES 第3条: maker ≠ checker).
 *
 * It runs every candidate through the {@link boringFilter} (the constitution's first
 * article: 競合の誰でも書けるものは即ボツ), kills the boring ones, and ranks the
 * survivors by sharpness. It NEVER writes copy — it only judges. Generic over any
 * candidate carrying a headline + body.
 */

import { boringFilter } from "../doctrine/boring-filter";

export interface ScoredCreative<T> {
  creative: T;
  /** Sharpness 0..1 from the BoringFilter (higher = sharper). */
  sharpness: number;
}

export interface CreativeSelection<T> {
  /** Survivors, ranked by sharpness descending. */
  passing: ScoredCreative<T>[];
  /** Killed candidates with the reasons they were too boring. */
  rejected: { creative: T; reasons: string[] }[];
}

/** Filter + rank candidates by the BoringFilter gate. Pure, deterministic, no AI. */
export function selectSharpCreatives<T extends { headline: string; body: string }>(
  candidates: readonly T[],
): CreativeSelection<T> {
  const passing: ScoredCreative<T>[] = [];
  const rejected: { creative: T; reasons: string[] }[] = [];

  for (const creative of candidates) {
    const verdict = boringFilter({ text: `${creative.headline} ${creative.body}` });
    if (verdict.passed) {
      passing.push({ creative, sharpness: verdict.score });
    } else {
      rejected.push({ creative, reasons: verdict.reasons });
    }
  }

  passing.sort((a, b) => b.sharpness - a.sharpness);
  return { passing, rejected };
}
