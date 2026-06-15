import { requireAdmin } from "@/app/lib/auth";
import { AdminShell } from "../_components/admin-shell";
import { StudioForm } from "./studio-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ドクトリン・スタジオ — Sharp",
};

export default async function StudioPage() {
  const session = await requireAdmin();

  return (
    <AdminShell active="studio" title="ドクトリン・スタジオ" sessionSub={session.sub}>
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-6 py-8">
        <div className="space-y-2">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
            ドクトリン・スタジオ
          </h2>
          <p className="max-w-2xl text-sm text-subtle">
            サービスの種を渡すと、AIがプロファイルを生成し、12人の巨匠の思想を
            <strong className="text-ink">矛盾ごと</strong>
            このサービス用に振り切ります。混ぜない。状況ごとに選ぶ。これがエンジンの中身です。
          </p>
        </div>

        <StudioForm />
      </main>
    </AdminShell>
  );
}
