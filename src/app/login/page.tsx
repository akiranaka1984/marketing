import { Brand } from "@/app/_components/brand";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ログイン — Sharp",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <Brand size={40} withWordmark={false} />
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-ink">管理画面にログイン</h1>
            <p className="text-sm text-subtle">運用者専用。IDとパスワードを入力してください。</p>
          </div>
        </div>

        <div className="rounded-[var(--radius-card)] border border-line bg-surface/80 p-7 shadow-2xl shadow-black/40 backdrop-blur">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-faint">
          認証情報は暗号化して保存され、コードには残りません。
        </p>
      </div>
    </main>
  );
}
