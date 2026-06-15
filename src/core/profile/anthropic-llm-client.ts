/**
 * AnthropicLlmClient — the live {@link LlmClient} backed by the Anthropic Messages API.
 *
 * This is the one place that talks to Anthropic. The maker (ClaudeProfiler) and the
 * checker (ProfileVerifier) each get their OWN instance with a DIFFERENT model, which is
 * how maker ≠ checker (RULES 第3条) is realised at the model layer. The API key is loaded
 * from ANTHROPIC_API_KEY at the composition root, never hardcoded (RULES 第4条).
 *
 * Hardening: `baseUrl` is validated (https, no credentials, no private/loopback host) so a
 * misconfiguration cannot exfiltrate the prompt or x-api-key to an internal/attacker host
 * (SSRF). Thrown errors carry only status + the Anthropic error *type* — never the raw
 * response body — so secrets or prompt text can't leak into logs. Requests time out.
 *
 * `fetch` is injected so the request/response contract is unit-testable without network.
 */

import type { LlmClient, LlmCompletionRequest } from "./llm-client";

const DEFAULT_BASE_URL = "https://api.anthropic.com";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TIMEOUT_MS = 60_000;

export interface AnthropicLlmClientOptions {
  apiKey: string;
  /** Model id, e.g. "claude-opus-4" (maker) or "claude-sonnet-4" (checker). */
  model: string;
  maxTokens?: number;
  /** Override the API origin (e.g. a trusted https proxy). Validated; private hosts rejected. */
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

interface AnthropicTextBlock {
  type: string;
  text?: string;
}

export class AnthropicLlmClient implements LlmClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor({
    apiKey,
    model,
    maxTokens = DEFAULT_MAX_TOKENS,
    baseUrl = DEFAULT_BASE_URL,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fetchImpl = fetch,
  }: AnthropicLlmClientOptions) {
    if (!apiKey) throw new Error("AnthropicLlmClient: apiKey is required");
    if (!model) throw new Error("AnthropicLlmClient: model is required");
    this.apiKey = apiKey;
    this.model = model;
    this.maxTokens = maxTokens;
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
  }

  async complete(request: LlmCompletionRequest): Promise<string> {
    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [{ role: "user", content: request.prompt }],
    };
    if (request.system !== undefined) body.system = request.system;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      if (controller.signal.aborted) {
        throw new Error(`AnthropicLlmClient: request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      // Only status + the Anthropic error *type* — never the raw body (may echo prompt/key).
      const type = await safeErrorType(response);
      throw new Error(`AnthropicLlmClient: request failed (status ${response.status}${type ? `, ${type}` : ""})`);
    }

    const payload: unknown = await response.json();
    return extractText(payload);
  }
}

/** Build a maker/checker client from the environment (composition-root helper). */
export function createAnthropicLlmClient(
  model: string,
  apiKey = process.env.ANTHROPIC_API_KEY,
): AnthropicLlmClient {
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  return new AnthropicLlmClient({ apiKey, model });
}

/** Reject anything that could send the prompt + key somewhere it shouldn't go (SSRF). */
function normalizeBaseUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("AnthropicLlmClient: baseUrl must be a valid URL");
  }
  if (url.protocol !== "https:") {
    throw new Error("AnthropicLlmClient: baseUrl must use https");
  }
  if (url.username || url.password) {
    throw new Error("AnthropicLlmClient: baseUrl must not contain credentials");
  }
  if (isPrivateHost(url.hostname)) {
    throw new Error(`AnthropicLlmClient: baseUrl host is not allowed (${url.hostname})`);
  }
  return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
}

function isPrivateHost(hostname: string): boolean {
  let host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  // Collapse IPv4-mapped IPv6 (::ffff:127.0.0.1 or its hex form ::ffff:7f00:1) to dotted v4.
  const mapped = host.match(/^::ffff:(.+)$/);
  if (mapped) {
    const tail = mapped[1];
    const hex = tail.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(tail)) {
      host = tail;
    } else if (hex) {
      const hi = parseInt(hex[1], 16);
      const lo = parseInt(hex[2], 16);
      host = `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
    }
  }

  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host.includes(":") && (host === "::1" || /^fe80:/.test(host) || /^f[cd]/.test(host))) return true;

  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }
  return false;
}

/** Best-effort extraction of the Anthropic error.type only; swallows parse failures. */
async function safeErrorType(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "error" in body) {
      const error = (body as { error: unknown }).error;
      if (typeof error === "object" && error !== null && "type" in error) {
        const type = (error as { type: unknown }).type;
        // Only echo a well-formed type token (e.g. "rate_limit_error"); never arbitrary,
        // possibly-attacker-controlled text that a malicious proxy could stuff in here.
        if (typeof type === "string" && /^[a-z_]{1,64}$/.test(type)) return type;
      }
    }
  } catch {
    // ignore — we fall back to status only
  }
  return undefined;
}

/** The API response is an untrusted boundary: validate shape before trusting it. */
function extractText(payload: unknown): string {
  if (typeof payload !== "object" || payload === null || !("content" in payload)) {
    throw new Error("AnthropicLlmClient: response had no content");
  }
  const content = (payload as { content: unknown }).content;
  if (!Array.isArray(content)) {
    throw new Error("AnthropicLlmClient: response content was not an array");
  }
  const text = content
    .filter((block): block is AnthropicTextBlock => typeof block === "object" && block !== null)
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text as string)
    .join("");
  if (text.length === 0) {
    throw new Error("AnthropicLlmClient: response contained no text blocks");
  }
  return text;
}
