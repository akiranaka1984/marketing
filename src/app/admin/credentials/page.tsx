import type { CredentialRef } from "@/core/credentials/credential-store";
import { requireAdmin } from "@/app/lib/auth";
import { deleteCredentialAction } from "./actions";
import { logoutAction } from "./auth-actions";
import { CredentialForm } from "./credential-form";
import { getCredentialService } from "./service";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "認証情報 — 管理画面",
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
    <main className="mx-auto w-full max-w-3xl px-6 py-12 space-y-10">
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">チャネル認証情報</h1>
          <form action={logoutAction} className="flex items-center gap-3">
            <span className="text-xs text-black/50">{session.sub}</span>
            <button type="submit" className="text-xs text-black/60 hover:underline">
              ログアウト
            </button>
          </form>
        </div>
        <p className="text-sm text-black/60">
          API認証情報はコードや.envに置かず、ここから入力して暗号化（AES-256-GCM）して保存します。
        </p>
        <p className="text-xs text-amber-700">
          現状の保存先はインメモリです。サーバー再起動で消えます（Postgresアダプタは後続）。
        </p>
      </header>

      {configError ? (
        <div className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          設定エラー: {configError}
          <p className="mt-1 text-xs">
            .env.local に CREDENTIAL_ENCRYPTION_KEY（base64・32バイト）を設定してください。
          </p>
        </div>
      ) : (
        <section className="rounded-lg border border-black/10 p-6">
          <h2 className="mb-4 text-sm font-semibold">新規・更新</h2>
          <CredentialForm />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">保存済み（{stored.length}件）</h2>
        {stored.length === 0 ? (
          <p className="text-sm text-black/50">まだ登録されていません。</p>
        ) : (
          <ul className="divide-y divide-black/10 rounded-lg border border-black/10">
            {stored.map((ref) => (
              <li
                key={`${ref.tenantId}:${ref.channel}:${ref.name}`}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span className="font-mono">
                  {ref.tenantId} · {ref.channel} · {ref.name}
                </span>
                <form action={deleteCredentialAction}>
                  <input type="hidden" name="tenantId" value={ref.tenantId} />
                  <input type="hidden" name="channel" value={ref.channel} />
                  <input type="hidden" name="name" value={ref.name} />
                  <button type="submit" className="text-xs text-red-600 hover:underline">
                    削除
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
