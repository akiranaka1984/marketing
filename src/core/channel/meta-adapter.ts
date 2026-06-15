/**
 * MetaAdapter — Meta (Facebook/Instagram) implementation of {@link ChannelAdapter}.
 *
 * v1 supports DRY-RUN only: with no credentials (or dryRun), it simulates a publish
 * and returns deterministic metrics derived from the spec, so the closed loop runs
 * end-to-end without secrets. The live Graph API path is intentionally NOT faked —
 * attempting a real publish with credentials throws until it is implemented.
 */

import type {
  AdSpec,
  ChannelAdapter,
  ChannelMetrics,
  PublishOptions,
  PublishResult,
} from "./channel-adapter";
import type { Channel } from "../profile/service-profile";

export interface MetaCredentials {
  accessToken: string;
  adAccountId: string;
}

/** Tiny deterministic string hash → 32-bit unsigned. */
function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class MetaAdapter implements ChannelAdapter {
  readonly channel: Channel = "meta";
  private readonly published = new Map<string, AdSpec>();

  constructor(private readonly credentials?: MetaCredentials) {}

  async publish(spec: AdSpec, options: PublishOptions = {}): Promise<PublishResult> {
    const simulated = options.dryRun === true || this.credentials === undefined;
    if (!simulated) {
      throw new Error("MetaAdapter: live Graph API publishing not implemented yet (use dryRun)");
    }
    const externalId = `meta-sim-${hash(spec.headline + spec.body + spec.audience).toString(16)}`;
    this.published.set(externalId, spec);
    return { externalId, status: "simulated", simulated: true };
  }

  async fetchMetrics(externalId: string): Promise<ChannelMetrics> {
    const spec = this.published.get(externalId);
    if (!spec) {
      throw new Error(`MetaAdapter: unknown externalId ${externalId}`);
    }
    const seed = hash(externalId);
    const frac = (seed % 1000) / 1000; // 0..0.999
    const spend = spec.dailyBudget;
    const impressions = Math.round(spend * 100 * (0.8 + frac * 0.4));
    const frequency = 1.2 + frac * 1.3; // 1.2..2.5 — unique reach < impressions
    const reach = Math.round(impressions / frequency);
    const ctr = 0.01 + frac * 0.04; // 1%..5%
    const clicks = Math.round(impressions * ctr);
    const cvr = 0.05 + frac * 0.15; // 5%..20%
    const conversions = Math.round(clicks * cvr);
    return { impressions, reach, clicks, conversions, spend };
  }
}
