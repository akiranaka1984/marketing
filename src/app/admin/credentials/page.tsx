import type { CredentialRef } from "@/core/credentials/credential-store";
import { Badge } from "@/app/_components/ui/badge";
import { Card } from "@/app/_components/ui/card";
import { requireAdmin } from "@/app/lib/auth";
import { AdminShell } from "../_components/admin-shell";
import { deleteCredentialAction } from "./actions";
import { CredentialForm } from "./credential-form";
import { getCredentialService } from "./service";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "認証情報 — Sharp",
};

export default async function CredentialsPage() {
  const session = await requireAdmin();

  let stored: CredentialRef[] = [];
  let configError: string | null = null;
  try {
    stored = await getCredentialService().list();
  } catch (err) {
    configError = err instanceof Error ? err.message : String(err);
  }

  const channelCount = new Set(stored.map((c) => c.channel)).size;

  return (
    <AdminShell active="credentials" title="チャネル認証情報" sessionSub={session.sub}>
        <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-6 py-8">
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
              チャネル認証情報
            </h2>
            <p className="max-w-2xl text-sm text-subtle">
              API認証情報はコードや{" "}
              <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-xs text-ink">.env</code>{" "}
              に置かず、ここから入力して暗号化（AES-256-GCM）して保存します。
            </p>
          </div>

          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <div className="text-xs text-faint">登録チャネル</div>
              <div className="mt-1 font-display text-2xl font-semibold text-ink">{channelCount}</div>
            </Card>
            <Card className="p-5">
              <div className="text-xs text-faint">保存済みフィールド</div>
              <div className="mt-1 font-display text-2xl font-semibold text-ink">{stored.length}</div>
            </Card>
            <Card className="p-5">
              <div className="text-xs text-faint">保存先</div>
              <div className="mt-2 flex items-center gap-1.5 text-sm text-subtle">
                <span className="size-1.5 rounded-full bg-amber-400" aria-hidden="true" />
                インメモリ
              </div>
            </Card>
          </div>

          <p className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-xs text-faint">
            <span className="size-1.5 rounded-full bg-amber-400" aria-hidden="true" />
            現状の保存先はインメモリです。サーバー再起動で消えます（Postgresアダプタは後続）。
          </p>

          {configError ? (
            <div className="rounded-card border border-danger/30 bg-danger-surface p-5 text-sm text-danger">
              <p className="font-medium">設定エラー: {configError}</p>
              <p className="mt-1 text-xs text-danger/80">
                .env.local に CREDENTIAL_ENCRYPTION_KEY（base64・32バイト）を設定してください。
              </p>
            </div>
          ) : (
            <Card className="p-6">
              <h3 className="mb-5 font-display text-sm font-semibold text-ink">新規・更新</h3>
              <CredentialForm />
            </Card>
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-ink">保存済み</h3>
              <Badge tone="neutral">{stored.length}件</Badge>
            </div>

            {stored.length === 0 ? (
              <div className="rounded-card border border-dashed border-line bg-surface/40 px-6 py-12 text-center">
                <p className="text-sm text-subtle">まだ登録されていません。</p>
                <p className="mt-1 text-xs text-faint">上のフォームから最初の認証情報を追加してください。</p>
              </div>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-card border border-line">
                {stored.map((ref) => (
                  <li
                    key={`${ref.tenantId}:${ref.channel}:${ref.name}`}
                    className="flex items-center justify-between gap-3 bg-surface px-4 py-3 text-sm transition-colors hover:bg-surface-2"
                  >
                    <span className="flex flex-wrap items-center gap-2 font-mono text-xs">
                      <span className="text-ink">{ref.tenantId}</span>
                      <span className="rounded bg-accent-soft px-1.5 py-0.5 text-accent">{ref.channel}</span>
                      <span className="text-subtle">{ref.name}</span>
                    </span>
                    <form action={deleteCredentialAction}>
                      <input type="hidden" name="tenantId" value={ref.tenantId} />
                      <input type="hidden" name="channel" value={ref.channel} />
                      <input type="hidden" name="name" value={ref.name} />
                      <button
                        type="submit"
                        className="rounded-md px-2 py-1 text-xs text-subtle transition-colors hover:bg-danger-surface hover:text-danger"
                      >
                        削除
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>
    </AdminShell>
  );
}
