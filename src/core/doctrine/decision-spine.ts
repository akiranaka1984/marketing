/**
 * The Decision Spine — the universal, service-agnostic marketing decisions
 * that EVERY service flows through. Machine-readable form of doctrine/ENGINE.md (D1–D7).
 *
 * CONSTITUTION: this file must contain NO service-specific values. Per-service answers
 * are derived at runtime by the AI from an auto-generated ServiceProfile.
 */

export type DecisionId = "D1" | "D2" | "D3" | "D4" | "D5" | "D6" | "D7";

/**
 * How conflicting positions are resolved.
 * - "select": pick one position based on ServiceProfile signals (used when positions are complementary).
 * - "compete": form rival hypotheses and let real performance data decide (default for conflicts).
 * - "dual-score": evaluate against both lenses simultaneously (e.g. short-term ROI + long-term brand).
 *
 * A conflicting decision must NEVER default to "select" alone — averaging conflicts away
 * violates the sharpness constitution.
 */
export type ArbitrationMode = "select" | "compete" | "dual-score";

export interface Position {
  thinker: string;
  stance: string;
}

export interface Decision {
  id: DecisionId;
  question: string;
  positions: Position[];
  /** Whether the contributing positions are in genuine conflict. */
  hasConflict: boolean;
  /** Default arbitration applied when the AI cannot decisively select. */
  defaultArbitration: ArbitrationMode;
}

export const DECISION_SPINE: readonly Decision[] = [
  {
    id: "D1",
    question: "我々は本当は何屋か？（ジョブ/カテゴリ定義）",
    positions: [
      { thinker: "Levitt", stance: "顧客はドリルでなく穴を買う。達成したいジョブで事業を定義" },
      { thinker: "Drucker", stance: "事業の目的は顧客の創造。顧客と価値を問う" },
    ],
    hasConflict: false,
    defaultArbitration: "select",
  },
  {
    id: "D2",
    question: "誰のためで、どこまで広げるか？",
    positions: [
      { thinker: "Byron Sharp", stance: "浸透率重視。広くリーチし識別資産を一貫使用" },
      { thinker: "Seth Godin", stance: "最小実行可能オーディエンスに尖って刺す" },
    ],
    hasConflict: true,
    defaultArbitration: "compete",
  },
  {
    id: "D3",
    question: "尖った角度は何か？（差別化の刃）",
    positions: [
      { thinker: "Seth Godin", stance: "パープルカウ。語らずにいられない異質さ" },
      { thinker: "Steve Jobs", stance: "ビジョン主導と引き算。平均を取らない" },
      { thinker: "Ogilvy", stance: "ただし売れる尖りであれ（拘束条件）" },
    ],
    hasConflict: true,
    defaultArbitration: "compete",
  },
  {
    id: "D4",
    question: "需要を刈るか創るか？",
    positions: [
      { thinker: "Hopkins/Ogilvy", stance: "既存需要を刈る。全数テスト・即行動（DR）" },
      { thinker: "Musk/Jobs", stance: "新規需要を製品とビジョンで創る。第一原理" },
    ],
    hasConflict: true,
    defaultArbitration: "compete",
  },
  {
    id: "D5",
    question: "どのチャネルで何を語るか？",
    positions: [
      { thinker: "Vaynerchuk", stance: "媒体ネイティブに作る。使い回し禁止・物量" },
      { thinker: "Ogilvy", stance: "見出し/コピー/オファーの普遍クラフト" },
    ],
    hasConflict: false,
    defaultArbitration: "select",
  },
  {
    id: "D6",
    question: "どう測り、どう意思決定するか？",
    positions: [
      { thinker: "Byron Sharp", stance: "長期：到達・浸透・識別資産の一貫性" },
      { thinker: "Hopkins/Zyman", stance: "短期：全数テスト・ROI説明責任" },
    ],
    hasConflict: true,
    defaultArbitration: "dual-score",
  },
  {
    id: "D7",
    question: "どう賭け、どう拡大するか？",
    positions: [
      { thinker: "Son", stance: "タイムマシン経営・群戦略・大胆集中" },
      { thinker: "Musk", stance: "第一原理でコスト構造を再設計" },
    ],
    hasConflict: true,
    defaultArbitration: "compete",
  },
];
