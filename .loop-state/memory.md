# LOOP MEMORY — run間の引き継ぎ

> ループは会話を忘れる。このファイルは忘れない。各runの最初に読み、最後に更新する。

## 現在のフェーズ
Phase 1 → 雛形 → #2土台 → #5 Router+BoringFilter → #6 Closed Loop(縦切り)完了
→ 次は #4 管理画面+暗号化認証情報ストア / #2 実AI Profiler(Agent SDK, APIキー後)

## 技術メモ（重要）
- Next.js 16.2.9 / React 19.2.4 / pnpm。**Next16は破壊的変更あり**→ Next固有コードは
  node_modules/next/dist/docs/ を読んでから書く（AGENTS.md 警告）
- 品質ゲート: `./loop.sh`（= pnpm verify = lint+typecheck+test）。緑=出荷
- 最初の実コード src/core/doctrine/decision-spine.ts（D1〜D7のデータ化）+ vitest 3件green
- git init 済み・未コミット（ユーザーの明示指示までコミットしない）

## 完了したこと
- 2026-06-15: プロジェクト構造作成、VISION/RULES/ROSTER/ARCHITECTURE 草案
- 設計憲法確定：超尖らせる・平準化はFAIL・巨匠は混ぜず使い分け
- 汎用知能原則確定：サービス固有のハードコード＝バグ。Profile/WorkflowはAI自動導出
- ドクトリンエンジン完成：doctrine/ENGINE.md に D1〜D7 の意思決定背骨を蒸留
- 裁定の既定：対立は競合2案を立て実データで決める（承認済）
- スタック雛形: Next.js16+vitest+品質ゲート+loop.sh+.env.example、decision-spine実装
- ServiceProfile確定: src/core/profile/ に Zodスキーマ(service-profile.ts)＋Profiler port(profiler.ts)
  ＋MockProfiler(mock-profiler.ts) ＋テスト計13件。gate全green(16件)。zod 4.4.3導入
- ServiceProfileは汎用構造（category/JTBD/market/audience/channels/conversion.isOnline/provenance）
  ＝AIが後でAgent SDKで自動生成。MockProfilerはAPIキー無しでloopをgreenに保つ test double
- ビルドループ: scripts/dev-loop.sh（claude -p で1タスクをgate greenまで反復、closed loop, MAX_ITERS=8）
- DoctrineRouter v1: src/core/doctrine/router.ts。ServiceProfile→D1〜D7の発火＆裁定。
  不変条件: D6は常にdual-score、対立のselect縮約は risk/budget制約時のみ（constraintsを型付け）
- BoringFilter v1: src/core/doctrine/boring-filter.ts（D3ゲート=checker, maker≠checker）。
  常套句＋曖昧語(everyone/amazing/誰でも等)を却下、score 0..1。実意味判定は後でAIに委譲
- ServiceProfile.constraints を型付け: {kind: risk|budget|legal|brand|ops|other, note}
- gate全green(42件)。Codex(gpt-5.5)レビューでHIGH2件指摘→両方修正→LGTM確認済
- Codex注意: ChatGPTアカウントは gpt-5/gpt-5-codex不可。--model gpt-5.5 を使う
- #6 Closed Loop縦切り(src/core/channel/, src/core/loop/): route→BoringFilter→人間承認
  →ChannelAdapter publish→metrics→D6 dual-score。サービス固有コードゼロで閉じる
- ChannelAdapter port + MetaAdapter(dry-run, 認証情報注入・無ければ自動simulated, live未実装はthrow)
- D6 dual-score: 短期=ROAS/CAC/CVR, 長期=ユニークreach(浸透。impressionsは使わない/頻度で水増し回避)。
  両方0.8以上のみscale。reach不明はscale不可。rejected publishはmetrics取得せず非scored
- gate全green(61件)。Codexレビュー: HIGH(impressions→reach), MEDIUM(rejected publish)指摘→修正→LGTM
- #4 暗号化認証情報ストア(src/core/credentials/): crypto.ts(AES-256-GCM, v1:iv:tag:ct, optional AAD)
  + credential-store.ts(InMemoryCredentialStore, port=put/get/has/delete)。秘密はciphertextのみ保持
- refIdentity=JSON.stringify([tenantId,channel,name])をmap key兼GCM AADに使用→DB行swap攻撃は認証失敗
- gate全green(77件)。Codexレビュー: MEDIUM(blob-swap→AAD), LOW(key曖昧性→JSON)指摘→修正→LGTM
- #4残り: 管理画面UI(Next.js, dev server+ブラウザ検証必須)。Postgres CredentialStoreアダプタは後で

## 確定した方針（2026-06-15）
- 汎用・マルチテナント・設定駆動で最初から作る（特定サービスへのハードコード禁止）
- API認証情報は管理画面から後入力・DB暗号化保存
- 最初の検証テナント＝B-Ticket × Meta（アプリ内CVでループがクリーンに閉じる）
- daimasu はオフラインCV(来店)が難所、エンジン確立後に対応
- 対象サービス：B-Ticket(クーポンアプリ/PH)、daimasu(日本食レストラン/PH)、今後拡大

## 未決定（一緒に設計する論点）
- [ ] 最初の検証テナント B-Ticket で合意するか
- [ ] ドクトリン対立の裁定方式（選ぶ vs 競わせる）
- [ ] 技術スタック最終承認

## 次の一歩
Phase 1 プラン提示 → 合意後に着工（コード前にチェックイン）。
