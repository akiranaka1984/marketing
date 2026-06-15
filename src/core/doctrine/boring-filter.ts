/**
 * BoringFilter v1 — the D3 quality gate (RULES 第3条: maker ≠ checker).
 *
 * It operationalizes the constitution's first article: "出力が尖っている。競合の
 * 誰でも書けるものは即ボツ." v1 is a deterministic heuristic pre-filter that rejects
 * clichés AND vague/everyone-targeting language; the deeper semantic judgment
 * (positive proof that it stops the scroll) is refined by the AI checker later.
 * This module is a CHECKER ONLY — it never generates copy.
 */

/** Phrases any competitor could write. Their presence = boring by definition. */
const CLICHES: readonly string[] = [
  // English
  "best quality",
  "high quality",
  "high-quality",
  "top quality",
  "premium quality",
  "trusted",
  "leading",
  "number one",
  "#1",
  "world class",
  "world-class",
  "affordable",
  "one-stop",
  "solutions for",
  "we provide",
  "we offer",
  "your needs",
  "satisfaction guaranteed",
  "great value",
  "best price",
  "100% satisfaction",
  // Japanese
  "高品質",
  "安心・安全",
  "業界no.1",
  "業界no1",
  "お客様第一",
  "高品質なサービス",
  "満足保証",
];

/** Vague / "for everyone" words that signal genericness even without a cliché phrase. */
const VAGUE_WORDS: readonly string[] = [
  "everyone",
  "anyone",
  "everybody",
  "for all",
  "amazing",
  "awesome",
  "incredible",
  "easy",
  "simple",
  "great deals",
  "good service",
  "みんな",
  "誰でも",
  "簡単",
  "すごい",
  "便利",
];

const MIN_LENGTH = 12;

/** Whole-word match for short ASCII tokens (avoids "easy" matching inside "easygoing"); substring for phrases/CJK. */
function mentions(haystack: string, needle: string): boolean {
  if (/^[a-z][a-z ]*[a-z]$/.test(needle) && needle.includes(" ") === false) {
    return new RegExp(`\\b${needle}\\b`).test(haystack);
  }
  return haystack.includes(needle);
}

export interface BoringFilterInput {
  /** The angle / headline / copy under review. */
  text: string;
}

export interface BoringVerdict {
  passed: boolean;
  /** Sharpness 0..1 (higher = sharper). For ranking candidates, not just pass/fail. */
  score: number;
  /** Why it failed, or flags worth noting. Empty when it passes cleanly. */
  reasons: string[];
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function boringFilter(input: BoringFilterInput): BoringVerdict {
  const text = input.text.trim();
  const reasons: string[] = [];

  if (text.length === 0) {
    return { passed: false, score: 0, reasons: ["空のコピーは即ボツ"] };
  }

  if (text.length < MIN_LENGTH) {
    reasons.push("具体性が乏しい（短すぎる）");
  }

  const haystack = text.toLowerCase();
  const cliches = CLICHES.filter((c) => mentions(haystack, c));
  for (const hit of cliches) {
    reasons.push(`競合の誰でも言える常套句: 「${hit}」`);
  }

  const vague = VAGUE_WORDS.filter((w) => mentions(haystack, w));
  for (const hit of vague) {
    reasons.push(`曖昧・万人向けの言葉（尖っていない）: 「${hit}」`);
  }

  const penalty = (cliches.length + vague.length) * 0.34 + (text.length < MIN_LENGTH ? 0.5 : 0);
  const score = clamp01(1 - penalty);
  return { passed: reasons.length === 0, score, reasons };
}
