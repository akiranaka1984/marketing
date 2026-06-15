import { MockProfiler } from "@/core/profile/mock-profiler";
import type { ProfileSeed } from "@/core/profile/profiler";
import {
  createProfilingPipeline,
  profilingConfigFromEnv,
  type ProfilingPipelineConfig,
} from "@/core/profile/profiling-pipeline";
import type { ServiceProfile } from "@/core/profile/service-profile";

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
