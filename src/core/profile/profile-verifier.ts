/**
 * ProfileVerifier — the CHECKER half of maker ≠ checker (RULES 第3条). A profile produced
 * by a {@link Profiler} (the maker) is NOT usable until an independent agent re-examines it
 * and signs off. This verifier asks a separate {@link LlmClient} to judge the profile for
 * groundedness and sharpness, then stamps provenance.verifiedBy/verifiedAt only on approval.
 *
 * The checker identity MUST differ from the profile's derivedBy — a maker can never verify
 * its own output. The checker, not the maker, owns the authoritative confidence: on approval
 * the verifier overwrites provenance.confidence with the checker's independent score, so a
 * low-confidence sign-off still fails the usability gate (see isUsableProfile). Approval also
 * mints an HMAC verificationToken (verification.ts) over the signed profile, so the sign-off
 * cannot be forged downstream; rejection strips any verification fields so a previously
 * verified profile cannot survive a re-check as usable.
 *
 * Holds NO service-specific knowledge (constitution: no per-service code).
 */

import { z } from "zod";
import type { LlmClient } from "./llm-client";
import { parseJsonObject } from "./llm-json";
import { parseServiceProfile, type ServiceProfile } from "./service-profile";
import { signProfile } from "./verification";

const verdictSchema = z.object({
  verdict: z.enum(["approve", "reject"]),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string()).default([]),
});

const SYSTEM = [
  "You are an independent reviewer auditing a ServiceProfile another agent produced.",
  "Judge it on two axes: (1) groundedness — are the claims plausible and internally",
  "consistent for this service and market? and (2) sharpness — is the value proposition",
  "specific and distinctive, NOT generic filler any competitor could claim? Reject generic",
  "or contradictory profiles. Output a SINGLE JSON object only — no prose, no markdown",
  "fences — matching: { verdict: 'approve'|'reject', confidence: number 0..1, reasons: string[] }.",
  "confidence is YOUR independent assessment, not the maker's. Be strict.",
].join(" ");

export interface ProfileVerifierOptions {
  client: LlmClient;
  /** Checker identity recorded as provenance.verifiedBy. MUST differ from the profile's derivedBy. */
  checker: string;
  /** Server key used to mint the HMAC verificationToken on approval. */
  key: Buffer;
  now?: () => Date;
}

export interface VerificationResult {
  approved: boolean;
  reasons: string[];
  /** The checker's independent confidence (also written to provenance on approval). */
  confidence: number;
  /** On approval: a copy with verifiedBy/verifiedAt + the checker's confidence stamped. */
  profile: ServiceProfile;
}

export class ProfileVerifier {
  private readonly client: LlmClient;
  private readonly checker: string;
  private readonly key: Buffer;
  private readonly now: () => Date;

  constructor({ client, checker, key, now = () => new Date() }: ProfileVerifierOptions) {
    this.client = client;
    this.checker = checker;
    this.key = key;
    this.now = now;
  }

  async verify(profile: ServiceProfile): Promise<VerificationResult> {
    if (this.checker === profile.provenance.derivedBy) {
      throw new Error("verifier: checker must differ from the maker (RULES 第3条)");
    }

    const raw = await this.client.complete({ system: SYSTEM, prompt: buildPrompt(profile) });
    const verdict = verdictSchema.parse(parseJsonObject(raw, "verifier"));

    if (verdict.verdict !== "approve") {
      // Strip any prior verification so a re-checked, now-rejected profile is never usable.
      return {
        approved: false,
        reasons: verdict.reasons,
        confidence: verdict.confidence,
        profile: stripVerification(profile, verdict.confidence),
      };
    }

    // Build the signed payload first (verifiedBy/verifiedAt/confidence in place, no token),
    // then mint the HMAC over it so the token binds those exact fields.
    const signed = parseServiceProfile({
      ...profile,
      provenance: {
        ...profile.provenance,
        confidence: verdict.confidence,
        verifiedBy: this.checker,
        verifiedAt: this.now().toISOString(),
        verificationToken: undefined,
      },
    });
    const verified = parseServiceProfile({
      ...signed,
      provenance: { ...signed.provenance, verificationToken: signProfile(signed, this.key) },
    });
    return { approved: true, reasons: verdict.reasons, confidence: verdict.confidence, profile: verified };
  }
}

function stripVerification(profile: ServiceProfile, confidence: number): ServiceProfile {
  const { verifiedBy: _b, verifiedAt: _a, verificationToken: _t, ...provenance } = profile.provenance;
  return parseServiceProfile({ ...profile, provenance: { ...provenance, confidence } });
}

function buildPrompt(profile: ServiceProfile): string {
  return `Audit this ServiceProfile:\n${JSON.stringify(profile, null, 2)}`;
}
