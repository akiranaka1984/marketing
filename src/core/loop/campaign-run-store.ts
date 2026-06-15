/**
 * CampaignRunStore — the loop's MEMORY. Every closed-loop run (its spec, the delivery
 * metrics it earned, and the D6 dual-score verdict) is recorded here so the improvement
 * loop can reason over history instead of each run starting blind.
 *
 * This is the persistence SEAM for the closed loop: the in-memory implementation models
 * a DB row store; a Postgres-backed adapter implements the same port later (mirrors
 * {@link CredentialStore}). Holds NO service-specific knowledge.
 */

import type { AdSpec, ChannelMetrics } from "../channel/channel-adapter";
import type { Channel } from "../profile/service-profile";
import type { ClosedLoopStatus } from "./closed-loop";
import type { DualScore, LoopDecision } from "./dual-score";

/** One recorded pass through the loop — the unit the memory stores. */
export interface CampaignRun {
  id: string;
  serviceId: string;
  channel: Channel;
  status: ClosedLoopStatus;
  spec?: AdSpec;
  metrics?: ChannelMetrics;
  score?: DualScore;
  decision?: LoopDecision;
  /** ISO timestamp the run was recorded. */
  recordedAt: string;
}

export interface CampaignRunStore {
  record(run: CampaignRun): Promise<void>;
  /** Runs for a service, NEWEST FIRST — the memory the ITERATE/D7 stage reasons over. */
  history(serviceId: string): Promise<CampaignRun[]>;
}

export class InMemoryCampaignRunStore implements CampaignRunStore {
  /** Append-only log; a run is never mutated in place (immutability). */
  private readonly runs: CampaignRun[] = [];

  async record(run: CampaignRun): Promise<void> {
    this.runs.push({ ...run });
  }

  async history(serviceId: string): Promise<CampaignRun[]> {
    // Pure lexicographic comparison of UTC ISO strings — locale-independent and stable
    // (toISOString always yields a Z-suffixed UTC string, so byte order = time order).
    return this.runs
      .filter((r) => r.serviceId === serviceId)
      .sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : a.recordedAt > b.recordedAt ? -1 : 0))
      .map((r) => ({ ...r }));
  }
}
