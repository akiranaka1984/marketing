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

/**
 * Constraint categories. Only "risk"/"budget" tighten doctrine arbitration
 * (ENGINE.md: 予算・リスク制約が厳しい時のみ 1案に絞る); legal/brand/ops/other do not.
 */
export const constraintKindSchema = z.enum(["risk", "budget", "legal", "brand", "ops", "other"]);
export type ConstraintKind = z.infer<typeof constraintKindSchema>;

export const constraintSchema = z.object({
  kind: constraintKindSchema,
  note: z.string().trim().min(1),
});
export type Constraint = z.infer<typeof constraintSchema>;

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

  constraints: z.array(constraintSchema),

  // Provenance — every profile is AI-derived; we keep confidence + sources so the
  // loop can decide when to re-research or escalate to a human. derivedBy is the
  // MAKER; verifiedBy is a separate CHECKER (RULES 第3条: maker ≠ checker). A profile
  // is only usable once an independent checker has verified it (see isUsableProfile).
  provenance: z.object({
    derivedBy: nonEmptyText,
    confidence: z.number().min(0).max(1),
    sources: z.array(z.string()),
    generatedAt: z.iso.datetime(),
    /** The checker that independently verified this profile, if any. */
    verifiedBy: nonEmptyText.optional(),
    verifiedAt: z.iso.datetime().optional(),
  }),
});

export type ServiceProfile = z.infer<typeof serviceProfileSchema>;

/** Parse + validate unknown data (e.g. AI output or DB row) into a ServiceProfile. */
export function parseServiceProfile(input: unknown): ServiceProfile {
  return serviceProfileSchema.parse(input);
}

/**
 * Whether a planner may consume this profile. A maker (the profiler) must NOT be able
 * to self-certify (RULES 第3条): usability requires an independent checker
 * (`verifiedBy`) plus a confidence at or above the threshold. Model self-reported
 * confidence alone never crosses this gate, since the maker never sets `verifiedBy`.
 */
export function isUsableProfile(profile: ServiceProfile): boolean {
  const { derivedBy, verifiedBy, confidence } = profile.provenance;
  return (
    derivedBy !== "mock" &&
    verifiedBy !== undefined &&
    verifiedBy !== derivedBy &&
    confidence >= MIN_USABLE_CONFIDENCE
  );
}
