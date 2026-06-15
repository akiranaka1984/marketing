import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ログイン — 管理画面",
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6 py-12">
      <div className="space-y-6 rounded-lg border border-black/10 p-8">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold">管理画面ログイン</h1>
          <p className="text-sm text-black/60">IDとパスワードを入力してください。</p>
        </header>
        <LoginForm />
      </div>
    </main>
  );
}
