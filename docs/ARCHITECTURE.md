# ARCHITECTURE — AI Marketing System

> Status: v0 draft (2026-06-15). スタックは Claude/ループ前提で最適化。要・合意。

## 設計の中心思想
複数サービス（B-Ticket / daimasu / 今後…）に対し、AIが**サービスごとに設計を変える**。
**最初から汎用・マルチテナント・設定駆動**で作る（特定サービスへのハードコード禁止）。
### 最優先原則：サービス固有の作り込みは禁止（=汎用知能が価値）
未知のサービスが来ても、AIが**自力で最適なワークフローと戦略を導出し売上を上げる**こと。
特定サービス向けのチューニング／分岐／固定値は**バグ**とみなす。B-Ticketは検証用の被験者に過ぎず、専用ロジックを書かない。

「脳（汎用・不変）」と「対象（サービス固有・実行時導出）」を完全分離する:
- **ドクトリン** = 12人の思想を構造化した普遍的マーケ推論エンジン。サービス非依存。これが汎用知能の核。
- **個別対応** = 実行時にAIが調査・計画・導出。コードに固有値を持たない。

そのための核:
1. **ServiceProfile（AI自動生成）** — 人が埋めるのではなく、AIがDISCOVERで対象を自動調査して生成
   （URL/アプリ/市場PH/競合/客層/現状KPI）。人間は最小限の起点と承認のみ。
2. **Workflow Planner（動的）** — 固定パイプラインではなく、サービスごとにAIが最適な手順を組む
3. **Doctrine Router** — ドクトリンを参照し、どの思想 × どのチャネルで振り切るかを導出（混ぜない）
4. **Admin / Onboarding** — 管理画面でサービス登録、各チャネルAPI認証情報を後から投入

## 認証情報・マルチテナント（コア機能・RULES第4条）
- サービスはDBの **Service エンティティ**として登録。各 Service が複数チャネル接続を持つ。
- API認証情報（Metaトークン等）は**管理画面から後入力**。**DBに暗号化保存**（平文禁止）。
- 開発・検証は各媒体の**サンドボックス/テストモード**で行い、実トークンは準備でき次第UIから投入。
- 実課金を伴う配信は人間の承認ゲートを必須に。

## 推奨スタック（理由 = ループの6要素に1:1で対応）

| レイヤ | 採用技術 | なぜこれか（ループ観点） |
|---|---|---|
| エージェント中核 | **Claude Agent SDK (TypeScript)** | subagents / MCP connectors / memory が記事の6要素に直結。Maxプランと最も親和 |
| 耐久ループ・自動化 | **Inngest**（durable steps + cron + retry） | ①Automations の「心拍」。長時間ループ・再試行・スケジュールを安全に |
| アプリ/UI | **Next.js 15 (App Router) + React + Tailwind + shadcn/ui** | 承認ゲート・ダッシュボード。既存スキルと一致 |
| DB | **Postgres (Supabase) + pgvector** | サービス/施策/実績/ドクトリン判断を保存。pgvector=過去施策の意味記憶（⑥Memory） |
| 観測・コスト | **Langfuse**（trace + token cost） | ループのデバッグ性と⑤検証の透明性。尖り判断の根拠を残す |
| コネクタ | **Meta Marketing API / Google Ads API / TikTok等SNS / SMS(Twilio + PH: Semaphore/Movider) / GA4 + アプリ計測** | ④Connectors。これが繋がって初めて改善ループが閉じる |
| デプロイ | Vercel(app) + worker(既存VPS/PM2 or Railway)、secrets=.env/Doppler | RULES第4条準拠 |

## コア抽象（コードの骨格）
```
ServiceProfile        # B-Ticket / daimasu… を構造化（業種/客層/市場=PH/有効チャネル/ブランド資産/現状KPI/制約）
DoctrineRouter        # Profile + goal → 発火する思想 + 対立時の裁定（選ぶ or 競わせる）
ChannelAdapter        # Meta/Google/SNS/LP/SMS を共通IFに（plan→generate→[承認]→launch→measure）
BoringFilter          # 凡庸を殺す専任ゲート。合格しないと出荷不可
ClosedLoop            # 1施策の自己改善サイクル（下記）
```

## 製品レベルの Closed Loop（1施策あたり）
```
ServiceProfile 読込 → DoctrineRouter が戦略決定
   → クリエイティブ/コピー生成（思想に振り切る）
   → BoringFilter で凡庸チェック（FAILなら再生成）
   → 人間の承認ゲート（実課金前に必須・RULES第4条）
   → ChannelAdapter で配信
   → 実績データ取込（ROAS/CAC/CVR…）
   → 評価：勝ち/負け → memory(pgvector)に学習
   → 次サイクルへ（改善）
```

## 段階実装方針（重要：一気に作らない）
**設計は最初から汎用**。ただし全チャネル×全サービスを同時に"動かす"のは失敗の道。
**汎用エンジン＋管理画面を作り、それを最初の1社(=B-Ticket想定)を実際に通して動作証明**する。
これは縦切り(vertical slice)＝汎用配管への最初の通水であり、特定サービスへのハードコードではない。
daimasu 追加 = 管理画面でサービス登録＋認証情報入力のみ（作り直しゼロ）。

最初に閉じるループ：**B-Ticket × Meta**（アプリ内CV＝計測がクリーン）。
daimasu はオフラインCV(来店)が難所のため、エンジン確立後に対応。

## 未確定（合意が必要）
- [ ] 最初の検証テナント：B-Ticket でよいか（推奨）
- [ ] ドクトリン裁定方式：1つ選ぶ vs 複数を競わせて結果で決める
- [ ] 技術スタック最終承認（Claude Agent SDK + Inngest + Next.js + Supabase + Langfuse）
