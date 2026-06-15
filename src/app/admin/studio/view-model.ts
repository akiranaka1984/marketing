/**
 * Studio view-model — a pure presenter that turns the engine's
 * {@link ServiceProfile} + {@link DoctrineRouting} into render-ready rows.
 * No service-specific logic: it only reshapes generic engine output.
 */

import type { GeneratedCreative } from "@/core/creative/creative-maker";
import type { CreativeSelection } from "@/core/creative/creative-selector";
import type { ArbitrationMode } from "@/core/doctrine/decision-spine";
import type { DoctrineRouting, RoutedDecision } from "@/core/doctrine/router";
import type { ServiceProfile } from "@/core/profile/service-profile";

export type BadgeTone = "neutral" | "accent" | "success";

interface ArbitrationStyle {
  label: string;
  tone: BadgeTone;
}

const ARBITRATION: Record<ArbitrationMode, ArbitrationStyle> = {
  select: { label: "選択（補完）", tone: "neutral" },
  compete: { label: "競合（A/Bで決着）", tone: "accent" },
  "dual-score": { label: "二重スコア", tone: "success" },
};

export interface DecisionView {
  id: RoutedDecision["id"];
  question: string;
  arbitration: ArbitrationMode;
  arbitrationLabel: string;
  tone: BadgeTone;
  firing: string;
  rationale: string;
}

export interface StudioView {
  serviceId: string;
  name: string;
  category: string;
  businessModel: string;
  jobToBeDone: string;
  valueProposition: string;
  channels: string[];
  confidencePct: number;
  derivedBy: string;
  /** Decisions NOT collapsed to a single stance — the sharp, contested calls. */
  contestedCount: number;
  decisions: DecisionView[];
}

/** A sharp creative that survived the BoringFilter (D3) gate. */
export interface CreativeRowView {
  headline: string;
  body: string;
  audience: string;
  angle: string;
  metricHypothesis: string;
  dailyBudget: number;
  /** Sharpness 0–100 (higher = sharper). */
  sharpnessPct: number;
}

/** A creative the BoringFilter killed, with the reasons it was too boring. */
export interface RejectedCreativeView {
  headline: string;
  reasons: string[];
}

export interface CreativeSelectionView {
  passing: CreativeRowView[];
  rejected: RejectedCreativeView[];
}

/** Reshape the engine's creative selection into render-ready rows. Pure presenter. */
export function buildCreativeSelectionView(
  selection: CreativeSelection<GeneratedCreative>,
): CreativeSelectionView {
  return {
    passing: selection.passing.map(({ creative, sharpness }) => ({
      headline: creative.headline,
      body: creative.body,
      audience: creative.audience,
      angle: creative.angle,
      metricHypothesis: creative.metricHypothesis,
      dailyBudget: creative.dailyBudget,
      sharpnessPct: Math.round(sharpness * 100),
    })),
    rejected: selection.rejected.map(({ creative, reasons }) => ({
      headline: creative.headline,
      reasons,
    })),
  };
}

export function buildStudioView(
  profile: ServiceProfile,
  routing: DoctrineRouting,
): StudioView {
  const fallback: ArbitrationStyle = { label: "—", tone: "neutral" };
  const decisions: DecisionView[] = routing.decisions.map((d) => {
    const style = ARBITRATION[d.arbitration] ?? fallback;
    return {
      id: d.id,
      question: d.question,
      arbitration: d.arbitration,
      arbitrationLabel: style.label,
      tone: style.tone,
      firing: d.firing,
      rationale: d.rationale,
    };
  });

  return {
    serviceId: profile.serviceId,
    name: profile.name,
    category: profile.category,
    businessModel: profile.businessModel,
    jobToBeDone: profile.jobToBeDone,
    valueProposition: profile.valueProposition,
    channels: [...profile.channels],
    confidencePct: Math.round(profile.provenance.confidence * 100),
    derivedBy: profile.provenance.derivedBy,
    contestedCount: decisions.filter((d) => d.arbitration !== "select").length,
    decisions,
  };
}
