import Link from "next/link";
import { Brand } from "@/app/_components/brand";
import { Backdrop } from "@/app/_components/ui/backdrop";
import { Badge } from "@/app/_components/ui/badge";
import { buttonClasses } from "@/app/_components/ui/button";
import { Card } from "@/app/_components/ui/card";
import { Stat } from "@/app/_components/ui/stat";

const PRINCIPLES = [
  {
    no: "01",
    title: "ドクトリン・ルーター",
    body: "12人の巨匠は矛盾している。混ぜれば出汁が薄まる。状況ごとに1つ、あるいは対立する2つを選んで振り切る。",
  },
  {
    no: "02",
    title: "ボーリング・フィルター",
    body: "「競合の誰が書いても同じ」は即ボツ。生成と採点を別エージェントに分離し、凡庸を専任で殺す。",
  },
  {
    no: "03",
    title: "閉じる改善ループ",
    body: "配信・計測データに接続し、結果を見て自分で打ち手を変える。提案で終わらせない。回し続ける。",
  },
  {
    no: "04",
    title: "計測直結",
    body: "ROAS / CAC / LTV——売上に直接ひもづく指標でしか勝敗を測らない。測れない出力は未完成。",
  },
];

export default function Home() {
  return (
    <div className="relative isolate flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-line/60 bg-canvas/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Brand size={26} />
          <nav className="flex items-center gap-2">
            <Link href="#engine" className={buttonClasses("ghost", "sm")}>
              仕組み
            </Link>
            <Link href="/login" className={buttonClasses("primary", "sm")}>
              管理画面へ
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative flex-1">
        {/* ---------- Hero ---------- */}
        <section className="relative overflow-hidden mesh">
          <Backdrop />
          <div className="relative mx-auto w-full max-w-6xl px-6 pb-24 pt-20 sm:pt-28">
            <div className="max-w-3xl">
              <Badge tone="accent" dot className="animate-fade-up">
                AI MARKETING ENGINE
              </Badge>

              <h1
                className="mt-6 font-display text-5xl font-semibold leading-[1.02] tracking-tight text-ink animate-fade-up sm:text-7xl"
                style={{ animationDelay: "80ms" }}
              >
                <span className="text-gradient">「無難」</span>は、
                <br />
                いちばん高くつく。
              </h1>

              <p
                className="mt-6 max-w-xl text-lg leading-relaxed text-subtle animate-fade-up"
                style={{ animationDelay: "160ms" }}
              >
                平均化されたベストプラクティスは、誰の心も動かさない。Sharp
                は状況ごとに思想を選んで振り切り、配信データを見て自分で改善する——
                売上を非線形に伸ばすためのマーケティング・エンジン。
              </p>

              <div
                className="mt-9 flex flex-wrap items-center gap-3 animate-fade-up"
                style={{ animationDelay: "240ms" }}
              >
                <Link href="/login" className={buttonClasses("primary", "lg")}>
                  管理画面に入る
                  <span aria-hidden="true">→</span>
                </Link>
                <Link href="#engine" className={buttonClasses("outline", "lg")}>
                  エンジンを見る
                </Link>
              </div>
            </div>

            <div
              className="mt-20 grid grid-cols-2 gap-8 border-t border-line/70 pt-10 animate-fade-up sm:grid-cols-4 sm:gap-6"
              style={{ animationDelay: "320ms" }}
            >
              <Stat value="D1–D7" label="意思決定スパイン" caption="7ステージの思考" />
              <Stat value="12" label="巨匠ドクトリン" caption="矛盾を武器化" />
              <Stat value="∞" label="閉じた改善ループ" caption="配信データで自走" />
              <Stat value="0" label="凡庸の許容" caption="Boring Filter 必須" />
            </div>
          </div>
        </section>

        {/* ---------- Principles ---------- */}
        <section id="engine" className="relative mx-auto w-full max-w-6xl px-6 py-24 scroll-mt-20">
          <div className="max-w-2xl">
            <Badge tone="neutral">THE SHARP BET</Badge>
            <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              混ぜない。使い分ける。
            </h2>
            <p className="mt-4 text-base leading-relaxed text-subtle">
              巨匠たちが矛盾しているなら、その矛盾こそ知能の核になる。
              どの思想をいつ発火させるか——その判断がエンジンの中身。
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PRINCIPLES.map((p) => (
              <Card key={p.no} interactive className="flex flex-col gap-4 p-6">
                <span className="font-mono text-sm text-accent">{p.no}</span>
                <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
                  {p.title}
                </h3>
                <p className="text-sm leading-relaxed text-subtle">{p.body}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* ---------- Product preview ---------- */}
        <section className="relative mx-auto w-full max-w-6xl px-6 pb-24">
          <Card className="overflow-hidden p-0">
            <div className="grid gap-0 lg:grid-cols-[1.1fr_1fr]">
              <div className="space-y-5 p-8 sm:p-10">
                <Badge tone="accent" dot>
                  DOCTRINE ROUTER
                </Badge>
                <h3 className="font-display text-2xl font-semibold tracking-tight text-ink">
                  状況を読み、思想を1つ選んで振り切る
                </h3>
                <p className="text-sm leading-relaxed text-subtle">
                  サービスプロファイルを自動生成し、競合・チャネル・目標から「いま発火させるべき思想」を決定。
                  ハードコードされた正解はない。すべて実行時に導出する。
                </p>
                <ul className="space-y-2.5 pt-2">
                  {[
                    "サービス固有のロジックはコードに持たない",
                    "生成 → Boring Filter → 配信の役割分離",
                    "破壊的操作は人間の承認ゲートを必ず経由",
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2.5 text-sm text-ink">
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative border-t border-line bg-surface-2/60 p-8 lg:border-l lg:border-t-0">
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between text-faint">
                    <span>decision-spine</span>
                    <span className="text-success">● live</span>
                  </div>
                  {[
                    { k: "D1 状況把握", v: "B2C / 新規獲得" },
                    { k: "D2 思想選択", v: "Ogilvy ⚔ Halbert" },
                    { k: "D3 Boring Filter", v: "PASS" },
                    { k: "D5 指標設計", v: "ROAS · CAC" },
                    { k: "D7 改善ループ", v: "再配分 +3 案" },
                  ].map((row, i) => (
                    <div
                      key={row.k}
                      className="flex items-center justify-between rounded-lg border border-line bg-canvas/60 px-3.5 py-2.5"
                      style={{ animation: "var(--animate-fade-up)", animationDelay: `${i * 60}ms` }}
                    >
                      <span className="text-subtle">{row.k}</span>
                      <span className="text-accent">{row.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* ---------- CTA band ---------- */}
        <section className="relative mx-auto w-full max-w-6xl px-6 pb-28">
          <div className="relative overflow-hidden rounded-card border border-line mesh px-8 py-16 text-center sm:px-16">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              凡庸を、出荷しない。
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-subtle">
              チャネル認証情報を登録して、尖った打ち手を回し始める。
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/login" className={buttonClasses("primary", "lg")}>
                管理画面に入る
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-faint sm:flex-row">
          <Brand size={22} />
          <span>尖ったマーケティングを自動で。</span>
        </div>
      </footer>
    </div>
  );
}
