/**
 * ServiceProfile — the service-agnostic description the brain reasons over.
 *
 * CONSTITUTION: this schema must stay generic. It is NEVER hand-tuned per service.
 * Concrete profiles are AUTO-DERIVED at runtime by a {@link Profiler} (AI research),
 * then validated here. Any per-service branch or hardcoded value elsewhere = a bug.
 */

import { z } from "zod";

/** Required free-text: rejects empty AND whitespace-only AI output. */
const nonEmptyText = z.string().trim().min(1);

/** Minimum provenance confidence a profile needs before a planner may consume it. */
export const MIN_USABLE_CONFIDENCE = 0.5;

/** Channels the system can plan against. Tenant enables a subset via the admin UI. */
export const CHANNELS = [
  "meta",
  "google_search",
  "google_display",
  "tiktok",
  "instagram",
  "x",
  "youtube",
  "lp",
  "sms",
  "email",
] as const;

export const channelSchema = z.enum(CHANNELS);
export type Channel = z.infer<typeof channelSchema>;

export const businessModelSchema = z.enum(["b2c", "b2b", "b2b2c", "marketplace"]);
export type BusinessModel = z.infer<typeof businessModelSchema>;

export const serviceProfileSchema = z.object({
  serviceId: nonEmptyText,
  name: nonEmptyText,

  // D1 — what business are we really in (Levitt/Drucker: the underlying job).
  category: nonEmptyText,
  jobToBeDone: nonEmptyText,
  businessModel: businessModelSchema,

  market: z.object({
    countries: z.array(z.string().trim().min(2)).min(1),
    languages: z.array(z.string().trim().min(2)).min(1),
    currency: nonEmptyText,
  }),

  audience: z.object({
    description: nonEmptyText,
    segments: z.array(z.string()),
  }),

  // D3 seed — a differentiation hypothesis, NOT the final sharp angle (that is
  // arbitrated at runtime by the Decision Spine + BoringFilter).
  valueProposition: nonEmptyText,
  competitors: z.array(z.string()),

  channels: z.array(channelSchema).min(1),

  // Sharp's distinctive brand assets.
  brandAssets: z.object({
    colors: z.array(z.string()),
    tone: z.string(),
    taglines: z.array(z.string()),
  }),

  // The measurable conversion (RULES 第2条). Offline events (e.g. restaurant
  // visits) flag isOnline=false so the loop knows attribution is harder.
  conversion: z.object({
    primaryEvent: nonEmptyText,
    isOnline: z.boolean(),
  }),

  kpis: z.object({
    targetCac: z.number().positive().optional(),
    targetRoas: z.number().positive().optional(),
    monthlyBudget: z.number().nonnegative().optional(),
  }),

  constraints: z.array(z.string()),

  // Provenance — every profile is AI-derived; we keep confidence + sources so the
  // loop can decide when to re-research or escalate to a human.
  provenance: z.object({
    derivedBy: nonEmptyText,
    confidence: z.number().min(0).max(1),
    sources: z.array(z.string()),
    generatedAt: z.iso.datetime(),
  }),
});

export type ServiceProfile = z.infer<typeof serviceProfileSchema>;

/** Parse + validate unknown data (e.g. AI output or DB row) into a ServiceProfile. */
export function parseServiceProfile(input: unknown): ServiceProfile {
  return serviceProfileSchema.parse(input);
}

/**
 * Whether a planner may consume this profile. Guards against unverified mock /
 * low-confidence profiles leaking their generic defaults into real strategy.
 */
export function isUsableProfile(profile: ServiceProfile): boolean {
  return profile.provenance.derivedBy !== "mock" && profile.provenance.confidence >= MIN_USABLE_CONFIDENCE;
}
