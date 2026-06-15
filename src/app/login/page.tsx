import Link from "next/link";
import { Brand } from "@/app/_components/brand";
import { Backdrop } from "@/app/_components/ui/backdrop";
import { Badge } from "@/app/_components/ui/badge";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ログイン — Sharp",
};

const HIGHLIGHTS = [
  "状況ごとに思想を選んで振り切る Doctrine Router",
  "凡庸を専任で殺す Boring Filter",
  "配信データで自走する閉じた改善ループ",
];

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ---------- Brand panel ---------- */}
      <aside className="relative hidden overflow-hidden border-r border-line mesh lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Backdrop />
        <div className="relative">
          <Brand size={28} />
        </div>

        <div className="relative max-w-md">
          <h2 className="font-display text-4xl font-semibold leading-tight tracking-tight text-ink">
            <span className="text-gradient">「無難」</span>を、
            <br />
            運用から締め出す。
          </h2>
          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map((line) => (
              <li key={line} className="flex items-start gap-3 text-sm text-subtle">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-faint">尖ったマーケティングを自動で。</p>
      </aside>

      {/* ---------- Form panel ---------- */}
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col gap-4 lg:hidden">
            <Brand size={32} />
          </div>

          <div className="space-y-2">
            <Badge tone="neutral" dot>
              運用者専用
            </Badge>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
              管理画面にログイン
            </h1>
            <p className="text-sm text-subtle">IDとパスワードを入力してください。</p>
          </div>

          <div className="mt-7 rounded-card border border-line bg-surface/70 p-7 shadow-2xl shadow-black/40 backdrop-blur">
            <LoginForm />
          </div>

          <p className="mt-6 text-center text-xs text-faint">
            認証情報は暗号化して保存され、コードには残りません。
          </p>

          <div className="mt-4 text-center">
            <Link href="/" className="text-xs text-faint underline-offset-4 hover:text-subtle hover:underline">
              ← トップに戻る
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
