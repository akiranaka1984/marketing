/**
 * CreativeMaker — the live MAKER for ad creative (RULES 第3条: maker ≠ checker).
 *
 * It turns a {@link ServiceProfile} + its {@link DoctrineRouting} into a brief, asks an
 * {@link LlmClient} for sharp creative candidates, and validates that output here
 * (RULES 第2条: untrusted model output is a system boundary). It NEVER judges its own
 * work — the BoringFilter checker (see creative-selector) decides what survives.
 *
 * Every candidate carries a metricHypothesis: a creative is a measurable bet, not a
 * vibe (RULES 第2条). This module holds NO service-specific knowledge.
 */

import { z } from "zod";
import type { DoctrineRouting } from "../doctrine/router";
import type { CreativeCandidate } from "../loop/closed-loop";
import type { LlmClient } from "../profile/llm-client";
import { parseJsonArray } from "../profile/llm-json";
import type { Channel, ServiceProfile } from "../profile/service-profile";

/** A maker-produced creative. Extends the loop's candidate so it flows straight into runClosedLoop. */
export interface GeneratedCreative extends CreativeCandidate {
  /** The single sharp differentiation angle (D3). One bet, committed — never a hedge. */
  angle: string;
  /** The measurable metric this creative is a bet on (RULES 第2条). */
  metricHypothesis: string;
}

/** Everything the maker needs, distilled from the profile + doctrine. No raw profile leaks in. */
export interface CreativeBrief {
  serviceName: string;
  jobToBeDone: string;
  valueProposition: string;
  audience: string;
  tone: string;
  primaryEvent: string;
  channels: Channel[];
  /** D3 doctrine firing — the sharpness mandate the maker must honor. */
  sharpnessMandate: string;
  targetCac?: number;
  targetRoas?: number;
  /** Per-creative daily-budget ceiling derived from monthlyBudget, if known. */
  dailyBudgetCeiling?: number;
}

const DAYS_PER_MONTH = 30;

/** Pure: distill the profile + routing into a creative brief. No network, no AI. */
export function buildCreativeBrief(profile: ServiceProfile, routing: DoctrineRouting): CreativeBrief {
  const d3 = routing.decisions.find((d) => d.id === "D3");
  return {
    serviceName: profile.name,
    jobToBeDone: profile.jobToBeDone,
    valueProposition: profile.valueProposition,
    audience: profile.audience.description,
    tone: profile.brandAssets.tone,
    primaryEvent: profile.conversion.primaryEvent,
    channels: [...profile.channels],
    sharpnessMandate: d3 ? `${d3.firing} — ${d3.rationale}` : profile.valueProposition,
    targetCac: profile.kpis.targetCac,
    targetRoas: profile.kpis.targetRoas,
    dailyBudgetCeiling:
      profile.kpis.monthlyBudget !== undefined && profile.kpis.monthlyBudget > 0
        ? profile.kpis.monthlyBudget / DAYS_PER_MONTH
        : undefined,
  };
}

export interface CreativeMaker {
  /** Returns `count` candidate creatives for the brief. May include boring ones — the checker filters. */
  generate(brief: CreativeBrief, count: number): Promise<GeneratedCreative[]>;
}

const nonEmpty = z.string().trim().min(1);

const generatedSchema = z.object({
  headline: nonEmpty,
  body: nonEmpty,
  audience: nonEmpty,
  dailyBudget: z.number().positive(),
  angle: nonEmpty,
  metricHypothesis: nonEmpty,
});

const SYSTEM = [
  "You are a direct-response creative strategist. Given a brief, output a JSON ARRAY of",
  "ad-creative candidates. Output JSON only — no prose, no markdown fences. Each element:",
  "{ headline, body, audience, dailyBudget: number, angle, metricHypothesis }.",
  "RULES: (1) Each candidate must be SHARP — if any competitor could write it, it is worthless.",
  "Pick ONE angle and commit; never hedge or hedge-blend. (2) Avoid clichés like 'high quality',",
  "'trusted', 'for everyone', '簡単', '高品質'. (3) metricHypothesis must name the measurable bet",
  "(e.g. 'lifts CVR on coupon_redeem by leading with the exact peso saved'). Stay within the brief's",
  "tone, audience, and channels. dailyBudget must respect the budget ceiling when one is given.",
].join(" ");

export interface ClaudeCreativeMakerOptions {
  client: LlmClient;
  model: string;
}

export class ClaudeCreativeMaker implements CreativeMaker {
  private readonly client: LlmClient;
  private readonly model: string;

  constructor({ client, model }: ClaudeCreativeMakerOptions) {
    this.client = client;
    this.model = model;
  }

  async generate(brief: CreativeBrief, count: number): Promise<GeneratedCreative[]> {
    const raw = await this.client.complete({ system: SYSTEM, prompt: buildPrompt(brief, count) });
    const parsed = parseJsonArray(raw, "creative-maker");
    return parsed.map((item) => {
      const c = generatedSchema.parse(item);
      const dailyBudget =
        brief.dailyBudgetCeiling !== undefined
          ? Math.min(c.dailyBudget, brief.dailyBudgetCeiling)
          : c.dailyBudget;
      return { ...c, dailyBudget };
    });
  }
}

function buildPrompt(brief: CreativeBrief, count: number): string {
  const lines = [
    `Produce ${count} creative candidates for: ${brief.serviceName}`,
    `Job to be done: ${brief.jobToBeDone}`,
    `Value proposition: ${brief.valueProposition}`,
    `Audience: ${brief.audience}`,
    `Tone: ${brief.tone}`,
    `Conversion event to optimize: ${brief.primaryEvent}`,
    `Channels: ${brief.channels.join(", ")}`,
    `Sharpness mandate (D3 doctrine): ${brief.sharpnessMandate}`,
  ];
  if (brief.targetCac !== undefined) lines.push(`Target CAC: ${brief.targetCac}`);
  if (brief.targetRoas !== undefined) lines.push(`Target ROAS: ${brief.targetRoas}`);
  if (brief.dailyBudgetCeiling !== undefined) {
    lines.push(`Daily budget ceiling per creative: ${brief.dailyBudgetCeiling.toFixed(0)}`);
  }
  return lines.join("\n");
}
