/**
 * Studio view-model — a pure presenter that turns the engine's
 * {@link ServiceProfile} + {@link DoctrineRouting} into render-ready rows.
 * No service-specific logic: it only reshapes generic engine output.
 */

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
