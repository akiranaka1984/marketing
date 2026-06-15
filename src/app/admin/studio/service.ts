import { ClaudeCreativeMaker, buildCreativeBrief } from "@/core/creative/creative-maker";
import { selectSharpCreatives, type CreativeSelection } from "@/core/creative/creative-selector";
import type { GeneratedCreative } from "@/core/creative/creative-maker";
import type { DoctrineRouting } from "@/core/doctrine/router";
import { AnthropicLlmClient } from "@/core/profile/anthropic-llm-client";
import { MockProfiler } from "@/core/profile/mock-profiler";
import type { ProfileSeed } from "@/core/profile/profiler";
import {
  createProfilingPipeline,
  profilingConfigFromEnv,
  type ProfilingPipelineConfig,
} from "@/core/profile/profiling-pipeline";
import type { ServiceProfile } from "@/core/profile/service-profile";

/** How many creative candidates the maker drafts per run, before the BoringFilter culls. */
const CREATIVE_COUNT = 5;

export type ProfilerMode = "mock" | "live";

export interface DerivedProfile {
  profile: ServiceProfile;
  mode: ProfilerMode;
}

/** Present only when the full maker ≠ checker pipeline is configured (RULES 第3条). */
function liveConfig(): ProfilingPipelineConfig | null {
  try {
    return profilingConfigFromEnv();
  } catch {
    return null;
  }
}

/**
 * Derive a ServiceProfile from a thin seed. Uses the live maker+checker pipeline when
 * configured, otherwise the deterministic MockProfiler so the studio works without an
 * API key. Live-pipeline errors propagate — they must surface, not silently fall back.
 */
export async function deriveProfile(seed: ProfileSeed): Promise<DerivedProfile> {
  const config = liveConfig();
  if (config) {
    const result = await createProfilingPipeline(config).run(seed);
    // The checker's verdict gates downstream use — an unverified profile must never
    // reach the Decision Spine (RULES 第3条: maker ≠ checker).
    if (!result.approved) {
      throw new Error(`プロファイルが検証で却下されました: ${result.reasons.join(" / ")}`);
    }
    return { profile: result.profile, mode: "live" };
  }
  return { profile: await new MockProfiler().profile(seed), mode: "mock" };
}

/**
 * Generate sharp creative for a profile: the live MAKER drafts candidates, then the
 * BoringFilter CHECKER (selectSharpCreatives) culls the boring ones (RULES 第3条).
 * Returns null in mock mode — without a live model we do NOT fabricate marketing copy
 * (that would violate the no-generic / no-per-service constitution).
 */
export async function generateCreatives(
  profile: ServiceProfile,
  routing: DoctrineRouting,
): Promise<CreativeSelection<GeneratedCreative> | null> {
  const config = liveConfig();
  if (!config) return null;
  // The checker here is the DETERMINISTIC boringFilter (selectSharpCreatives), so reusing
  // the maker model is safe today. If an AI creative-checker is ever added (mirroring
  // ProfileVerifier), it MUST run on config.checkerModel — never makerModel (RULES 第3条).
  const maker = new ClaudeCreativeMaker({
    client: new AnthropicLlmClient({ apiKey: config.apiKey, model: config.makerModel }),
    model: config.makerModel,
  });
  const brief = buildCreativeBrief(profile, routing);
  const generated = await maker.generate(brief, CREATIVE_COUNT);
  return selectSharpCreatives(generated);
}
