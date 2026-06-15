/**
 * ChannelAdapter port — the generic seam every channel (Meta, Google, TikTok,
 * SMS, …) implements. The brain plans in channel-agnostic terms; adapters
 * translate to a specific platform. No channel-specific logic leaks upward.
 *
 * Secrets never live in code (RULES 第4条): an adapter receives credentials via
 * an injected provider sourced from the encrypted store / admin UI. With no
 * credentials, an adapter MUST operate in dry-run (simulated) mode so the loop
 * still closes during development.
 */

import type { Channel } from "../profile/service-profile";

/** A channel-agnostic ad to publish. */
export interface AdSpec {
  channel: Channel;
  headline: string;
  body: string;
  audience: string;
  /** Daily budget in the tenant's currency. */
  dailyBudget: number;
}

export interface PublishOptions {
  /** Force a simulated publish even when credentials exist (e.g. tests, previews). */
  dryRun?: boolean;
}

export interface PublishResult {
  externalId: string;
  status: "live" | "simulated" | "rejected";
  /** True when nothing was actually sent to the real platform. */
  simulated: boolean;
}

export interface ChannelMetrics {
  impressions: number;
  /**
   * UNIQUE people reached (Sharp's penetration signal). Distinct from impressions,
   * which frequency can inflate. Undefined when the platform does not report it —
   * in which case long-term/penetration cannot be proven.
   */
  reach?: number;
  clicks: number;
  conversions: number;
  /** Amount spent, tenant currency. */
  spend: number;
  /** Attributed revenue, tenant currency. Undefined when not measurable yet. */
  revenue?: number;
}

export interface ChannelAdapter {
  readonly channel: Channel;
  publish(spec: AdSpec, options?: PublishOptions): Promise<PublishResult>;
  fetchMetrics(externalId: string): Promise<ChannelMetrics>;
}
