/**
 * Shared helper for reading a JSON object out of an LLM's text response. Model output
 * is an untrusted boundary (RULES 第2条): callers MUST still schema-validate the result.
 */

/**
 * Extract the outermost {...} block from model text, tolerating surrounding prose or
 * markdown fences. Throws if no JSON object is found or it is not an object.
 * `label` names the caller in error messages (e.g. "profiler", "verifier").
 */
export function parseJsonObject(text: string, label: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error(`${label}: model response contained no JSON object`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new Error(`${label}: model response was not valid JSON`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${label}: model response was not a JSON object`);
  }
  return parsed as Record<string, unknown>;
}
