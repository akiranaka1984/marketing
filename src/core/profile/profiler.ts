/**
 * Profiler port — the brain's entry point. Given only a thin seed (what a tenant
 * types into the admin UI), an implementation RESEARCHES the service and produces a
 * fully-derived {@link ServiceProfile}. The live implementation is AI-backed
 * (Claude Agent SDK); a deterministic mock keeps the loop green without an API key.
 */

import type { Channel, ServiceProfile } from "./service-profile";

/** The minimal input a human provides. Everything else is AI-derived. */
export interface ProfileSeed {
  /** Service display name, e.g. "B-Ticket". */
  name: string;
  /** Freeform hints: a sentence, a pitch, anything the tenant offers. Optional. */
  hints?: string;
  /** A public URL (site / app listing) the profiler can research. Optional. */
  url?: string;
  /** Channels the tenant has enabled in the admin UI. Optional; profiler may infer. */
  channels?: Channel[];
}

export interface Profiler {
  profile(seed: ProfileSeed): Promise<ServiceProfile>;
}
