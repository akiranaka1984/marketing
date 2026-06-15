/**
 * runClosedLoop — the vertical slice that proves the loop CLOSES.
 *
 * DISCOVER(profile) → PLAN(route doctrine) → VERIFY(BoringFilter rejects boring
 * creative) → human approval gate (RULES 第4条, before any spend) → EXECUTE
 * (ChannelAdapter publish) → MEASURE(fetch metrics) → ITERATE(D6 dual-score
 * decision). Generic across services: nothing here branches on a service name.
 */

import { routeDoctrine, type DoctrineRouting } from "../doctrine/router";
import { boringFilter } from "../doctrine/boring-filter";
import type {
  AdSpec,
  ChannelAdapter,
  ChannelMetrics,
  PublishResult,
} from "../channel/channel-adapter";
import type { Channel, ServiceProfile } from "../profile/service-profile";
import { scoreCampaign, type CampaignTargets, type DualScore } from "./dual-score";

export interface CreativeCandidate {
  headline: string;
  body: string;
  audience: string;
  dailyBudget: number;
}

export interface ApprovalRequest {
  spec: AdSpec;
  sharpness: number;
}

export type ApproveFn = (req: ApprovalRequest) => boolean | Promise<boolean>;

export interface ClosedLoopInput {
  profile: ServiceProfile;
  channel: Channel;
  candidates: CreativeCandidate[];
  adapter: ChannelAdapter;
  approve: ApproveFn;
  targets?: CampaignTargets;
  dryRun?: boolean;
}

export type ClosedLoopStatus =
  | "scored"
  | "no-sharp-candidate"
  | "rejected-by-human"
  | "rejected-by-platform";

export interface ClosedLoopResult {
  status: ClosedLoopStatus;
  routing: DoctrineRouting;
  chosen?: AdSpec;
  publish?: PublishResult;
  metrics?: ChannelMetrics;
  score?: DualScore;
  rejected: { candidate: CreativeCandidate; reasons: string[] }[];
}

function targetsFromProfile(profile: ServiceProfile, override?: CampaignTargets): CampaignTargets {
  return {
    targetCac: profile.kpis.targetCac,
    targetRoas: profile.kpis.targetRoas,
    ...override,
  };
}

export async function runClosedLoop(input: ClosedLoopInput): Promise<ClosedLoopResult> {
  const { profile, channel, candidates, adapter, approve } = input;

  if (!profile.channels.includes(channel)) {
    throw new Error(`channel "${channel}" is not enabled in the profile`);
  }
  if (adapter.channel !== channel) {
    throw new Error(`adapter is for "${adapter.channel}", not "${channel}"`);
  }

  const routing = routeDoctrine(profile);

  // VERIFY (maker != checker): only sharp creative survives the BoringFilter gate.
  const rejected: { candidate: CreativeCandidate; reasons: string[] }[] = [];
  const passing = candidates
    .map((candidate) => ({ candidate, verdict: boringFilter({ text: `${candidate.headline} ${candidate.body}` }) }))
    .filter(({ candidate, verdict }) => {
      if (!verdict.passed) rejected.push({ candidate, reasons: verdict.reasons });
      return verdict.passed;
    })
    .sort((a, b) => b.verdict.score - a.verdict.score);

  if (passing.length === 0) {
    return { status: "no-sharp-candidate", routing, rejected };
  }

  const best = passing[0];
  const spec: AdSpec = {
    channel,
    headline: best.candidate.headline,
    body: best.candidate.body,
    audience: best.candidate.audience,
    dailyBudget: best.candidate.dailyBudget,
  };

  // Human approval BEFORE any publish/spend.
  const approved = await approve({ spec, sharpness: best.verdict.score });
  if (!approved) {
    return { status: "rejected-by-human", routing, chosen: spec, rejected };
  }

  const publish = await adapter.publish(spec, { dryRun: input.dryRun });
  // A platform-rejected publish never ran — do not feed it into MEASURE/D6.
  if (publish.status === "rejected") {
    return { status: "rejected-by-platform", routing, chosen: spec, publish, rejected };
  }
  const metrics = await adapter.fetchMetrics(publish.externalId);
  const score = scoreCampaign(metrics, targetsFromProfile(profile, input.targets));

  return { status: "scored", routing, chosen: spec, publish, metrics, score, rejected };
}
