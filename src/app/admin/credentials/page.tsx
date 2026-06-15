import type { CredentialRef } from "@/core/credentials/credential-store";
import { Brand } from "@/app/_components/brand";
import { requireAdmin } from "@/app/lib/auth";
import { deleteCredentialAction } from "./actions";
import { logoutAction } from "./auth-actions";
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

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-canvas/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-6">
          <Brand size={26} />
          <form action={logoutAction} className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-xs text-subtle">
              <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
              {session.sub}
            </span>
            <button
              type="submit"
              className="rounded-md border border-line px-2.5 py-1 text-xs text-subtle transition-colors hover:border-line-strong hover:text-ink"
            >
              ログアウト
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-6 py-10">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">チャネル認証情報</h1>
          <p className="max-w-2xl text-sm text-subtle">
            API認証情報はコードや <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-xs text-ink">.env</code>{" "}
            に置かず、ここから入力して暗号化（AES-256-GCM）して保存します。
          </p>
          <p className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-xs text-faint">
            <span className="size-1.5 rounded-full bg-amber-400" aria-hidden="true" />
            現状の保存先はインメモリです。サーバー再起動で消えます（Postgresアダプタは後続）。
          </p>
        </div>

        {configError ? (
          <div className="rounded-[var(--radius-card)] border border-danger/30 bg-danger-surface p-5 text-sm text-danger">
            <p className="font-medium">設定エラー: {configError}</p>
            <p className="mt-1 text-xs text-danger/80">
              .env.local に CREDENTIAL_ENCRYPTION_KEY（base64・32バイト）を設定してください。
            </p>
          </div>
        ) : (
          <section className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
            <h2 className="mb-5 text-sm font-semibold text-ink">新規・更新</h2>
            <CredentialForm />
          </section>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">保存済み</h2>
            <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-xs text-subtle">
              {stored.length}件
            </span>
          </div>

          {stored.length === 0 ? (
            <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-surface/50 px-6 py-10 text-center">
              <p className="text-sm text-subtle">まだ登録されていません。</p>
              <p className="mt-1 text-xs text-faint">上のフォームから最初の認証情報を追加してください。</p>
            </div>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line">
              {stored.map((ref) => (
                <li
                  key={`${ref.tenantId}:${ref.channel}:${ref.name}`}
                  className="flex items-center justify-between gap-3 bg-surface px-4 py-3 text-sm transition-colors hover:bg-surface-2"
                >
                  <span className="flex flex-wrap items-center gap-2 font-mono text-xs">
                    <span className="text-ink">{ref.tenantId}</span>
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-accent">{ref.channel}</span>
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
    </div>
  );
}
