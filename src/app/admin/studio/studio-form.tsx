"use client";

import { useActionState } from "react";
import { Badge } from "@/app/_components/ui/badge";
import { Card } from "@/app/_components/ui/card";
import { runStudioAction } from "./actions";
import { initialStudioState, type StudioState } from "./state";
import type { StudioView } from "./view-model";

const field =
  "w-full rounded-lg border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink " +
  "placeholder:text-faint transition-colors hover:border-line-strong focus:border-accent";
const label = "block text-xs font-medium text-subtle";

export function StudioForm() {
  const [state, action, pending] = useActionState(runStudioAction, initialStudioState);

  return (
    <div className="space-y-8">
      <Card className="p-6">
        <form action={action} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className={label} htmlFor="name">
                サービス名 <span className="text-accent">*</span>
              </label>
              <input
                id="name"
                name="name"
                maxLength={200}
                className={field}
                placeholder="B-Ticket"
                required
              />
            </div>
            <div className="space-y-1">
              <label className={label} htmlFor="url">
                URL（任意）
              </label>
              <input id="url" name="url" type="url" className={field} placeholder="https://…" />
            </div>
          </div>
          <div className="space-y-1">
            <label className={label} htmlFor="hints">
              一言ヒント（任意）
            </label>
            <textarea
              id="hints"
              name="hints"
              rows={2}
              maxLength={4000}
              className={field}
              placeholder="何を、誰に、どう売るか。一文でいい。"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink
                transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "発火中…" : "ドクトリンを発火"}
            </button>
            <span className="text-xs text-faint">
              シード → プロファイル → D1〜D7 の意思決定スパインを実行
            </span>
          </div>
        </form>
      </Card>

      <Results state={state} />
    </div>
  );
}

function Results({ state }: { state: StudioState }) {
  if (state.status === "error") {
    return (
      <div className="rounded-card border border-danger/30 bg-danger-surface p-5 text-sm text-danger">
        {state.message}
      </div>
    );
  }
  if (state.status !== "ok") {
    return (
      <div className="rounded-card border border-dashed border-line bg-surface/40 px-6 py-12 text-center">
        <p className="text-sm text-subtle">まだ発火していません。</p>
        <p className="mt-1 text-xs text-faint">
          サービス名を入れて「ドクトリンを発火」を押すと、12人の巨匠がこのサービス向けに振り切ります。
        </p>
      </div>
    );
  }

  return <ProfileResult view={state.view} mode={state.mode} />;
}

function ProfileResult({ view, mode }: { view: StudioView; mode: "mock" | "live" }) {
  return (
    <div className="space-y-6">
      <ProfileSummary view={view} mode={mode} />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-ink">意思決定スパイン D1〜D7</h3>
          <Badge tone="accent">{view.contestedCount} / 7 が競合・二重評価</Badge>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {view.decisions.map((d) => (
            <Card key={d.id} className="flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-accent">{d.id}</span>
                <Badge tone={d.tone}>{d.arbitrationLabel}</Badge>
              </div>
              <h4 className="font-display text-base font-semibold tracking-tight text-ink">
                {d.question}
              </h4>
              <p className="text-sm leading-relaxed text-ink">{d.firing}</p>
              <p className="text-xs leading-relaxed text-subtle">{d.rationale}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProfileSummary({ view, mode }: { view: StudioView; mode: "mock" | "live" }) {
  return (
    <Card className="space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
            {view.name}
          </h3>
          <p className="font-mono text-xs text-faint">{view.serviceId}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={mode === "live" ? "success" : "neutral"} dot>
            {mode === "live" ? "AI推定" : "モック推定"}
          </Badge>
          <Badge tone="neutral">確信度 {view.confidencePct}%</Badge>
        </div>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <Field term="カテゴリ" value={view.category} />
        <Field term="ビジネスモデル" value={view.businessModel} />
        <Field term="ジョブ（JTBD）" value={view.jobToBeDone} />
        <Field term="提供価値" value={view.valueProposition} />
      </dl>

      <dl className="space-y-1.5">
        <dt className="text-xs text-faint">有効チャネル</dt>
        <dd className="flex flex-wrap gap-1.5">
          {view.channels.map((c) => (
            <span
              key={c}
              className="rounded bg-accent-soft px-1.5 py-0.5 font-mono text-xs text-accent"
            >
              {c}
            </span>
          ))}
        </dd>
      </dl>
    </Card>
  );
}

function Field({ term, value }: { term: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-faint">{term}</dt>
      <dd className="text-sm leading-relaxed text-ink">{value}</dd>
    </div>
  );
}
