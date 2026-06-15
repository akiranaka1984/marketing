/**
 * ProfilingPipeline — the composition root that joins the maker and the checker into one
 * generate-then-verify flow (RULES 第3条). A {@link ClaudeProfiler} (maker) drafts a profile
 * from a seed; a {@link ProfileVerifier} (checker) independently audits it and only its
 * signed, approved output is usable. The pipeline never trusts unverified maker output.
 *
 * maker ≠ checker is enforced at TWO layers: the verifier rejects checker === derivedBy at
 * runtime, and {@link createProfilingPipeline} refuses to even build a pipeline whose maker
 * and checker share a model. The two halves run on DIFFERENT Anthropic models so the audit
 * is a genuinely independent second opinion, not the same model grading its own work.
 *
 * Holds NO service-specific knowledge (constitution: no per-service code).
 */

import { AnthropicLlmClient } from "./anthropic-llm-client";
import { ClaudeProfiler } from "./claude-profiler";
import { ProfileVerifier, type VerificationResult } from "./profile-verifier";
import type { ProfileSeed } from "./profiler";
import { loadVerificationKey } from "./verification";

export interface ProfilingPipelineParts {
  maker: ClaudeProfiler;
  checker: ProfileVerifier;
}

export class ProfilingPipeline {
  private readonly maker: ClaudeProfiler;
  private readonly checker: ProfileVerifier;

  constructor({ maker, checker }: ProfilingPipelineParts) {
    this.maker = maker;
    this.checker = checker;
  }

  /** Draft a profile from the seed, then return the checker's independent verdict on it. */
  async run(seed: ProfileSeed): Promise<VerificationResult> {
    const draft = await this.maker.profile(seed);
    return this.checker.verify(draft);
  }
}

export interface ProfilingPipelineConfig {
  apiKey: string;
  verificationKey: Buffer;
  makerModel: string;
  checkerModel: string;
}

/** Wire the maker + checker onto two DIFFERENT-model Anthropic clients (RULES 第3条). */
export function createProfilingPipeline(config: ProfilingPipelineConfig): ProfilingPipeline {
  if (config.makerModel === config.checkerModel) {
    throw new Error(
      "ProfilingPipeline: maker and checker must use different models (maker ≠ checker, RULES 第3条)",
    );
  }
  const maker = new ClaudeProfiler({
    client: new AnthropicLlmClient({ apiKey: config.apiKey, model: config.makerModel }),
    model: config.makerModel,
  });
  const checker = new ProfileVerifier({
    client: new AnthropicLlmClient({ apiKey: config.apiKey, model: config.checkerModel }),
    checker: config.checkerModel,
    key: config.verificationKey,
  });
  return new ProfilingPipeline({ maker, checker });
}

type EnvSource = Record<string, string | undefined>;

function required(env: EnvSource, name: string): string {
  const value = env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

/** Read the pipeline config from the environment (composition-root entry point). */
export function profilingConfigFromEnv(env: EnvSource = process.env): ProfilingPipelineConfig {
  return {
    apiKey: required(env, "ANTHROPIC_API_KEY"),
    verificationKey: loadVerificationKey(required(env, "PROFILE_VERIFICATION_KEY")),
    makerModel: required(env, "PROFILER_MODEL"),
    checkerModel: required(env, "VERIFIER_MODEL"),
  };
}
