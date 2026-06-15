/**
 * MockProfiler — a deterministic test double for the {@link Profiler} port.
 *
 * It builds a STRUCTURALLY valid ServiceProfile from any seed WITHOUT
 * service-specific knowledge (low confidence, derivedBy "mock"). It exists so the
 * build loop stays green before ANTHROPIC_API_KEY / the Agent-SDK profiler is wired.
 * It must NEVER branch on a specific service name.
 */

import type { Profiler, ProfileSeed } from "./profiler";
import { type ServiceProfile, channelSchema } from "./service-profile";

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export class MockProfiler implements Profiler {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async profile(seed: ProfileSeed): Promise<ServiceProfile> {
    const channels = seed.channels?.length ? seed.channels : [channelSchema.enum.meta];
    const sources = seed.url ? [seed.url] : [];

    return {
      serviceId: slugify(seed.name) || "unknown-service",
      name: seed.name,
      category: "uncategorized",
      jobToBeDone: seed.hints ?? "TBD: derived by AI profiler",
      businessModel: "b2c",
      market: {
        countries: ["PH"],
        languages: ["en"],
        currency: "PHP",
      },
      audience: {
        description: "TBD: derived by AI profiler",
        segments: [],
      },
      valueProposition: seed.hints ?? "TBD: derived by AI profiler",
      competitors: [],
      channels,
      brandAssets: {
        colors: [],
        tone: "neutral",
        taglines: [],
      },
      conversion: {
        primaryEvent: "lead",
        isOnline: true,
      },
      kpis: {},
      constraints: [],
      provenance: {
        derivedBy: "mock",
        confidence: 0,
        sources,
        generatedAt: this.now().toISOString(),
      },
    };
  }
}
