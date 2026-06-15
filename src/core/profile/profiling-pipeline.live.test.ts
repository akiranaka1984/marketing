/**
 * LIVE smoke test — exercises the real Anthropic API end to end. It is OFF by default so the
 * standard `pnpm test` gate stays hermetic (no network, no spend); it runs only when
 * RUN_LIVE_PROFILE=1 and the credentials are present in the environment. Run with:
 *
 *   set -a; . ./.env.local; set +a; RUN_LIVE_PROFILE=1 pnpm vitest run \
 *     src/core/profile/profiling-pipeline.live.test.ts
 */

import { describe, expect, it } from "vitest";
import { createProfilingPipeline, profilingConfigFromEnv } from "./profiling-pipeline";
import type { ProfileSeed } from "./profiler";
import { isUsableProfile } from "./service-profile";

const enabled = process.env.RUN_LIVE_PROFILE === "1" && !!process.env.ANTHROPIC_API_KEY;

const seed: ProfileSeed = {
  name: "B-Ticket",
  hints: "A coupon/deals mobile app for the Philippines. One-tap local coupons redeemed in-store.",
  channels: ["meta"],
};

describe.runIf(enabled)("ProfilingPipeline (live Anthropic)", () => {
  it("drafts a profile with the maker and audits it with a different-model checker", async () => {
    const config = profilingConfigFromEnv(process.env);
    const result = await createProfilingPipeline(config).run(seed);

    // The model output is nondeterministic, so assert the contract, not specific copy.
    expect(result.profile.provenance.derivedBy).toBe(config.makerModel);
    expect(result.profile.name.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    if (result.approved) {
      expect(result.profile.provenance.verifiedBy).toBe(config.checkerModel);
      expect(isUsableProfile(result.profile, config.verificationKey)).toBe(true);
    }

    // eslint-disable-next-line no-console -- live smoke test: surface the verdict to the operator
    console.log(
      `[live] approved=${result.approved} confidence=${result.confidence} ` +
        `verdict-reasons=${JSON.stringify(result.reasons)}`,
    );
  }, 120_000);
});
