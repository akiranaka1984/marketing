import { describe, expect, it } from "vitest";
import { AnthropicLlmClient } from "./anthropic-llm-client";

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  const ok = init.ok ?? true;
  return {
    ok,
    status: init.status ?? (ok ? 200 : 500),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function textBlocks(...texts: string[]) {
  return { content: texts.map((text) => ({ type: "text", text })) };
}

/** A typed fake fetch that records the last request and replays a fixed response. */
function fakeFetch(response: Response) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), init: init ?? {} });
    return response;
  };
  return { impl, calls };
}

describe("AnthropicLlmClient", () => {
  it("posts to the messages endpoint with auth headers and returns the text", async () => {
    const fetchImpl = fakeFetch(jsonResponse(textBlocks("hello world")));
    const client = new AnthropicLlmClient({ apiKey: "sk-test", model: "claude-opus-4", fetchImpl: fetchImpl.impl });

    const out = await client.complete({ system: "be terse", prompt: "say hi" });

    expect(out).toBe("hello world");
    const { url, init } = fetchImpl.calls[0];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-test");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("claude-opus-4");
    expect(body.system).toBe("be terse");
    expect(body.messages).toEqual([{ role: "user", content: "say hi" }]);
  });

  it("omits system from the body when not provided", async () => {
    const fetchImpl = fakeFetch(jsonResponse(textBlocks("ok")));
    await new AnthropicLlmClient({ apiKey: "sk", model: "m", fetchImpl: fetchImpl.impl }).complete({ prompt: "p" });
    const body = JSON.parse(fetchImpl.calls[0].init.body as string);
    expect(body).not.toHaveProperty("system");
  });

  it("concatenates multiple text blocks and ignores non-text blocks", async () => {
    const payload = { content: [{ type: "text", text: "a" }, { type: "thinking", text: "x" }, { type: "text", text: "b" }] };
    const fetchImpl = fakeFetch(jsonResponse(payload));
    const out = await new AnthropicLlmClient({ apiKey: "sk", model: "m", fetchImpl: fetchImpl.impl }).complete({ prompt: "p" });
    expect(out).toBe("ab");
  });

  it("throws with the status on a non-2xx response", async () => {
    const fetchImpl = fakeFetch(jsonResponse({ error: "bad" }, { ok: false, status: 429 }));
    const client = new AnthropicLlmClient({ apiKey: "sk", model: "m", fetchImpl: fetchImpl.impl });
    await expect(client.complete({ prompt: "p" })).rejects.toThrow(/429/);
  });

  it("throws when the response has no usable text", async () => {
    const fetchImpl = fakeFetch(jsonResponse({ content: [{ type: "thinking", text: "x" }] }));
    const client = new AnthropicLlmClient({ apiKey: "sk", model: "m", fetchImpl: fetchImpl.impl });
    await expect(client.complete({ prompt: "p" })).rejects.toThrow(/no text/);
  });

  it("throws when the response shape is malformed", async () => {
    const fetchImpl = fakeFetch(jsonResponse({ unexpected: true }));
    const client = new AnthropicLlmClient({ apiKey: "sk", model: "m", fetchImpl: fetchImpl.impl });
    await expect(client.complete({ prompt: "p" })).rejects.toThrow(/no content/);
  });

  it("strips a trailing slash from baseUrl", async () => {
    const fetchImpl = fakeFetch(jsonResponse(textBlocks("ok")));
    await new AnthropicLlmClient({
      apiKey: "sk",
      model: "m",
      baseUrl: "https://proxy.example/",
      fetchImpl: fetchImpl.impl,
    }).complete({ prompt: "p" });
    expect(fetchImpl.calls[0].url).toBe("https://proxy.example/v1/messages");
  });

  it("never leaks the api key or prompt from an error response body", async () => {
    const leaky = {
      error: { type: "authentication_error", message: "invalid key sk-test for prompt: say hi" },
    };
    const fetchImpl = fakeFetch(jsonResponse(leaky, { ok: false, status: 401 }));
    const client = new AnthropicLlmClient({ apiKey: "sk-test", model: "m", fetchImpl: fetchImpl.impl });
    const err = await client.complete({ prompt: "say hi" }).catch((e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    const message = (err as Error).message;
    expect(message).toContain("401");
    expect(message).toContain("authentication_error");
    expect(message).not.toContain("sk-test");
    expect(message).not.toContain("say hi");
  });

  it("rejects an unsafe baseUrl (SSRF guard)", () => {
    const opts = { apiKey: "sk", model: "m" };
    expect(() => new AnthropicLlmClient({ ...opts, baseUrl: "http://api.anthropic.com" })).toThrow(/https/);
    expect(() => new AnthropicLlmClient({ ...opts, baseUrl: "https://localhost:8080" })).toThrow(/not allowed/);
    expect(() => new AnthropicLlmClient({ ...opts, baseUrl: "https://127.0.0.1" })).toThrow(/not allowed/);
    expect(() => new AnthropicLlmClient({ ...opts, baseUrl: "https://169.254.169.254" })).toThrow(/not allowed/);
    expect(() => new AnthropicLlmClient({ ...opts, baseUrl: "https://10.0.0.5" })).toThrow(/not allowed/);
    expect(() => new AnthropicLlmClient({ ...opts, baseUrl: "https://user:pass@api.anthropic.com" })).toThrow(/credentials/);
    expect(() => new AnthropicLlmClient({ ...opts, baseUrl: "not a url" })).toThrow(/valid URL/);
    // IPv4-mapped IPv6 forms must not slip past the guard.
    expect(() => new AnthropicLlmClient({ ...opts, baseUrl: "https://[::ffff:127.0.0.1]" })).toThrow(/not allowed/);
    expect(() => new AnthropicLlmClient({ ...opts, baseUrl: "https://[::ffff:169.254.169.254]" })).toThrow(/not allowed/);
    expect(() => new AnthropicLlmClient({ ...opts, baseUrl: "https://[::1]" })).toThrow(/not allowed/);
  });

  it("does not echo a malformed (possibly attacker-stuffed) error.type", async () => {
    const evil = { error: { type: "leaked sk-test secret token" } };
    const fetchImpl = fakeFetch(jsonResponse(evil, { ok: false, status: 400 }));
    const client = new AnthropicLlmClient({ apiKey: "sk-test", model: "m", fetchImpl: fetchImpl.impl });
    const err = await client.complete({ prompt: "p" }).catch((e: Error) => e);
    const message = (err as Error).message;
    expect(message).toContain("400");
    expect(message).not.toContain("sk-test");
    expect(message).not.toContain("secret");
  });

  it("times out a hung request without leaking details", async () => {
    const hangingFetch: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted internal detail")));
      });
    const client = new AnthropicLlmClient({ apiKey: "sk", model: "m", timeoutMs: 5, fetchImpl: hangingFetch });
    const err = await client.complete({ prompt: "p" }).catch((e: Error) => e);
    expect((err as Error).message).toMatch(/timed out/);
    expect((err as Error).message).not.toContain("internal detail");
  });

  it("requires an api key and a model", () => {
    expect(() => new AnthropicLlmClient({ apiKey: "", model: "m" })).toThrow(/apiKey/);
    expect(() => new AnthropicLlmClient({ apiKey: "sk", model: "" })).toThrow(/model/);
  });
});
