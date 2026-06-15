/**
 * LlmClient — the narrow seam the {@link ClaudeProfiler} depends on, so the profiler
 * is unit-testable without a network or an API key. The live binding wraps the Claude
 * Agent SDK (with research tools); a fake returns canned text in tests.
 */
export interface LlmCompletionRequest {
  /** Optional system instruction (role / output contract). */
  system?: string;
  /** The user prompt. */
  prompt: string;
}

export interface LlmClient {
  /** Returns the model's text response (expected to contain the JSON contract). */
  complete(request: LlmCompletionRequest): Promise<string>;
}
