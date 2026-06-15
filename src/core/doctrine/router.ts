/**
 * DoctrineRouter v1 — walks a ServiceProfile through the Decision Spine (D1–D7)
 * and decides, per decision, WHICH stance leans to fire and HOW conflicts are
 * arbitrated. The nuanced "which thinker wins" is later refined by AI at runtime;
 * v1 is a deterministic, profile-signal-driven baseline.
 *
 * CONSTITUTION enforced here:
 *  - A conflicting decision is NEVER collapsed to a single "select" UNLESS the
 *    tenant has explicit risk/budget constraints (ENGINE.md: 予算・リスク制約が厳しい時のみ).
 *  - D6 (measure/decide) ALWAYS stays dual-score — short-term-only = a boring
 *    extraction machine, which is a constitution violation.
 *  - No service-specific branching: routing reads only generic profile signals.
 */

import { DECISION_SPINE, type ArbitrationMode, type DecisionId } from "./decision-spine";
import type { ServiceProfile } from "../profile/service-profile";

export interface RoutedDecision {
  id: DecisionId;
  question: string;
  arbitration: ArbitrationMode;
  /** Which stance(s) lean to fire for this profile. */
  firing: string;
  rationale: string;
}

export interface DoctrineRouting {
  serviceId: string;
  decisions: RoutedDecision[];
}

interface Signals {
  newCategory: boolean;
  established: boolean;
  hasBrandAssets: boolean;
  riskConstrained: boolean;
  offlineConversion: boolean;
}

function readSignals(profile: ServiceProfile): Signals {
  return {
    newCategory: profile.competitors.length === 0,
    established: profile.competitors.length >= 2,
    hasBrandAssets: profile.brandAssets.colors.length > 0 || profile.brandAssets.taglines.length > 0,
    // Only explicit risk/budget constraints tighten arbitration — legal/brand/ops do not.
    riskConstrained: profile.constraints.some((c) => c.kind === "risk" || c.kind === "budget"),
    offlineConversion: !profile.conversion.isOnline,
  };
}

/** A conflicting compete-decision collapses to a single committed stance only under risk constraints. */
function arbitrateConflict(s: Signals): ArbitrationMode {
  return s.riskConstrained ? "select" : "compete";
}

const QUESTION: Record<DecisionId, string> = Object.fromEntries(
  DECISION_SPINE.map((d) => [d.id, d.question]),
) as Record<DecisionId, string>;

export function routeDoctrine(profile: ServiceProfile): DoctrineRouting {
  const s = readSignals(profile);

  const d2Firing = s.newCategory || !s.hasBrandAssets
    ? "Godin寄り：最小実行可能オーディエンスに尖って投下"
    : s.established
      ? "Sharp寄り：広いリーチで浸透率を取りに行く"
      : "競合2案（狭×高熱量 / 広×高到達）をテスト";

  const d4Firing = s.newCategory
    ? "Musk/Jobs寄り：需要を創る（上部ファネル・行動変容）"
    : s.established
      ? "Hopkins/Ogilvy寄り：需要を刈る（下部ファネル・即ROI）"
      : "刈取りで即ROI確保＋創出を仮説検証";

  const decisions: RoutedDecision[] = [
    {
      id: "D1",
      question: QUESTION.D1,
      arbitration: "select",
      firing: "Levitt+Drucker（補完）：ジョブを狭/広2解像度で定義",
      rationale: "全サービス必須・スキップ不可。製品でなく顧客のジョブで定義する。",
    },
    {
      id: "D2",
      question: QUESTION.D2,
      arbitration: arbitrateConflict(s),
      firing: d2Firing,
      rationale: s.riskConstrained
        ? "リスク/予算制約あり：実験アームを畳み、尖ったセグメントに集中。"
        : "対立は競合2案を別キャンペーンでテストし、CAC/CVR/浸透で決める。",
    },
    {
      id: "D3",
      question: QUESTION.D3,
      arbitration: arbitrateConflict(s),
      firing: "Godin(話題性)×Jobs(引き算)、Ogilvy拘束（売れる尖り）。捨てるものを1つ決める。",
      rationale: "BoringFilterの基準そのもの。複数角度を生成→Filter→上位をテスト。",
    },
    {
      id: "D4",
      question: QUESTION.D4,
      arbitration: arbitrateConflict(s),
      firing: d4Firing,
      rationale: s.riskConstrained
        ? "制約下：主リーンに絞り、即ROIの確度を優先。"
        : "下部ファネルで即ROIを確保しつつ上部を検証。比率はデータで動的に。",
    },
    {
      id: "D5",
      question: QUESTION.D5,
      arbitration: "select",
      firing: `有効チャネル: ${profile.channels.join(", ")}（各々ネイティブ化＋クラフトを両適用）`,
      rationale: profile.channels.includes("sms")
        ? "チャネル毎にメッセージ別生成（使い回し禁止）。SMSは簡潔・即時・オファー明確を最優先。"
        : "チャネル毎にメッセージ別生成（使い回し禁止）。各チャネルでBoringFilter通過必須。",
    },
    {
      id: "D6",
      question: QUESTION.D6,
      // ALWAYS dual-score — never narrowed, even under constraints (constitution).
      arbitration: "dual-score",
      firing: "短期(ROAS/CPA/CVR)＋長期(到達/想起/浸透)の二重スコア",
      rationale: s.offlineConversion
        ? "オフラインCVのため、まず計測基盤（来店/予約のイベント設計）を立ててから評価。"
        : "短期効率と長期健全性の両建て。短期偏重は凡庸な刈取り機に堕ちる（憲法違反）。",
    },
    {
      id: "D7",
      question: QUESTION.D7,
      // Scale decisions need data, not budget-narrowing — stays compete.
      arbitration: "compete",
      firing: "孫(タイミング/群)×Musk(第一原理/コスト)。勝ち筋がデータ確認後のみ大胆投下。",
      rationale: "拡大はslop拡散防止のためデータ確認後のみ。単位経済破綻なら構造を作り直す。",
    },
  ];

  return { serviceId: profile.serviceId, decisions };
}
