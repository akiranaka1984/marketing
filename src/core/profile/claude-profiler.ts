/**
 * ClaudeProfiler — the live {@link Profiler}. It asks an {@link LlmClient} to research
 * a service from a thin seed and return a JSON ServiceProfile, then validates that
 * output here (RULES 第2条: untrusted model output is a system boundary).
 *
 * The profiler — not the model — stamps provenance.derivedBy and generatedAt, so a
 * profile can never claim a false origin or timestamp. Everything else is AI-derived;
 * this class holds NO service-specific knowledge (constitution: no per-service code).
 */

import { z } from "zod";
import type { LlmClient } from "./llm-client";
import type { Profiler, ProfileSeed } from "./profiler";
import { channelSchema, parseServiceProfile, type ServiceProfile } from "./service-profile";

const MAX_NAME = 200;
const MAX_HINTS = 4000;
const MAX_URL = 2048;

/**
 * The seed is untrusted admin input that feeds a live, research-capable model. Validate
 * and bound it here: cap lengths (cost/availability) and restrict the URL to http(s)
 * (a first guard against SSRF/tool-browsing once a real client is attached).
 */
const seedSchema = z.object({
  name: z.string().trim().min(1).max(MAX_NAME),
  hints: z.string().trim().max(MAX_HINTS).optional(),
  url: z
    .string()
    .trim()
    .max(MAX_URL)
    .url()
    .refine((u) => /^https?:$/.test(new URL(u).protocol), "url must be http(s)")
    .optional(),
  channels: z.array(channelSchema).optional(),
});

const SYSTEM = [
  "You are a market-research analyst. Given a thin seed about a service, research it and",
  "output a SINGLE JSON object describing the service. Output JSON only — no prose, no",
  "markdown fences. The JSON must match this TypeScript shape exactly:",
  "{ serviceId, name, category, jobToBeDone, businessModel: 'b2c'|'b2b'|'b2b2c'|'marketplace',",
  "  market: { countries: string[], languages: string[], currency },",
  "  audience: { description, segments: string[] }, valueProposition, competitors: string[],",
  "  channels: string[], brandAssets: { colors: string[], tone, taglines: string[] },",
  "  conversion: { primaryEvent, isOnline: boolean }, kpis: { targetCac?, targetRoas?, monthlyBudget? },",
  "  constraints: { kind: 'risk'|'budget'|'legal'|'brand'|'ops'|'other', note }[],",
  "  provenance: { confidence: number 0..1, sources: string[] } }.",
  "Be specific and sharp; never output generic filler. Do NOT include provenance.derivedBy or generatedAt.",
].join(" ");

export interface ClaudeProfilerOptions {
  client: LlmClient;
  /** Model identifier recorded as provenance.derivedBy. */
  model: string;
  now?: () => Date;
}

export class ClaudeProfiler implements Profiler {
  private readonly client: LlmClient;
  private readonly model: string;
  private readonly now: () => Date;

  constructor({ client, model, now = () => new Date() }: ClaudeProfilerOptions) {
    this.client = client;
    this.model = model;
    this.now = now;
  }

  async profile(rawSeed: ProfileSeed): Promise<ServiceProfile> {
    const seed = seedSchema.parse(rawSeed);
    const raw = await this.client.complete({ system: SYSTEM, prompt: buildPrompt(seed) });
    const derived = parseJsonObject(raw);

    // Profiler owns origin + time; the model's provenance (confidence/sources) is kept.
    const modelProvenance =
      typeof derived.provenance === "object" && derived.provenance !== null
        ? (derived.provenance as Record<string, unknown>)
        : {};

    return parseServiceProfile({
      ...derived,
      provenance: {
        confidence: modelProvenance.confidence,
        sources: modelProvenance.sources ?? (seed.url ? [seed.url] : []),
        derivedBy: this.model,
        generatedAt: this.now().toISOString(),
      },
    });
  }
}

function buildPrompt(seed: ProfileSeed): string {
  const lines = [`Service name: ${seed.name}`];
  if (seed.hints) lines.push(`Hints: ${seed.hints}`);
  if (seed.url) lines.push(`URL to research: ${seed.url}`);
  if (seed.channels?.length) lines.push(`Enabled channels: ${seed.channels.join(", ")}`);
  return lines.join("\n");
}

/**
 * Parse the model's text into a JSON object. Tolerates surrounding prose or markdown
 * fences by extracting the outermost {...} block. Throws if no JSON object is found.
 */
function parseJsonObject(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("profiler: model response contained no JSON object");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error("profiler: model response was not valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("profiler: model response was not a JSON object");
  }
  return parsed as Record<string, unknown>;
}
