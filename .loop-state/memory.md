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
- #4管理画面: CredentialService(境界Zod検証+env鍵factory) + store.list()(秘密非露出)。
  src/app/admin/credentials/: page(server)+credential-form(client, useActionState)+actions('use server')
  +service(globalThis singleton, in-memory非永続=再起動で消える, Postgresは後続)+form-data(requireString)
- Next16 server action注意: FormData値はFileの場合あり→String()で"[object File]"化しZodすり抜け。
  requireString(typeof===string強制)で防御。deleteは入力検証(FormFieldError/ZodError)のみno-op、運用エラーは表面化
- ブラウザ検証済(Playwright): 保存→一覧表示→削除のCRUD動作OK。gate全green(90件)
- Codexレビュー: MEDIUM(File coercion), LOW(delete 500), LOW(catch過大)→全修正→確認済
- #4残: 認証(後続)、Postgres CredentialStoreアダプタ(DATABASE_URL設定後)
- #2 実AIプロファイラ雛形(APIキー前でも検証可): src/core/profile/llm-client.ts(LlmClient port:
  complete({system,prompt})=>string) + claude-profiler.ts(ClaudeProfiler。seed検証→LLM→JSON抽出
  (prose/fence許容)→parseServiceProfile。provenance.derivedBy/generatedAtはprofiler側で刻印)
- 重要(maker≠checker, RULES第3条): provenanceにverifiedBy/verifiedAt追加。isUsableProfileは
  derivedBy≠mock && verifiedBy有 && verifiedBy≠derivedBy && confidence>=0.5。モデル自己申告confidenceでは
  usableにできない。makerはverifiedByを設定しない→別checker検証まで未usable
- seed検証: name1..200/hints<=4000/url=http(s)のみ<=2048(new URLでscheme確認)/channels。モデル呼出前に弾く
- gate全green(101件)。Codex: HIGH(自己認証)→verifiedBy導入, MEDIUM(seed SSRF/cost)→seedSchema,
  HIGH(verifiedBy==derivedBy許容)→!==追加。全修正→ClaudeProfilerはLGTM
- #2 checker(verifier)実装: src/core/profile/profile-verifier.ts(ProfileVerifier)。LlmClientで独立審査
  →verdict{approve|reject,confidence,reasons}。checker===derivedByは拒否(maker≠checker)。承認時のみ
  verifiedBy/verifiedAt/checker confidenceを刻印。confidenceはcheckerの独立スコアで上書き(maker自己申告は無効)
- 重要(偽造防止): src/core/profile/verification.ts。HMAC-SHA256(PROFILE_VERIFICATION_KEY)で承認profileに
  verificationToken署名(canonical=sorted-key/token除外)。isUsableProfile(profile, KEY)はtoken検証必須化。
  →DB行/API由来でverifiedBy等を偽装しても通らない。reject時はverifiedBy/verifiedAt/token strip(recheck-reject穴塞ぎ)
- gate全green(114件)。Codex: HIGH(構造フィールド偽造→HMAC token), MEDIUM(verifiedAt必須化), MEDIUM(recheck-reject strip)
  →全修正。再レビューでcanonicalization/length-extension/timing問題なしと確認(LGTM)
- closed-loop憲法ゲート: runClosedLoopは最初のpreconditionでisUsableProfile(profile, verificationKey)を要求。
  未検証(maker-only)/wrong-keyはthrow→route/approve/publishの前に落ちる(配信前にmaker≠checker強制)。
  verificationKeyはcaller注入(composition rootで環境変数読込)。gate全green(116件)。Codex: 指摘なしLGTM
- 実Anthropic LlmClient: src/core/profile/anthropic-llm-client.ts(AnthropicLlmClient)。POST /v1/messages,
  x-api-key+anthropic-version。fetch注入でnetwork無しにunit可。createAnthropicLlmClient(model)=composition root helper
- ハードニング(Codex HIGH×3+MEDIUM×2修正済): (1)baseUrl SSRFガード normalizeBaseUrl(https限定/credentials禁止/
  private+loopback+IPv4-mapped-IPv6[::ffff:]禁止) (2)エラーはstatus+error.type(/^[a-z_]{1,64}$/のみ)だけ。
  raw body非露出でkey/prompt漏洩防止 (3)AbortControllerで60sタイムアウト, abort時はsanitized message
- 残DNS-rebinding(Codex MEDIUM)はbaseUrl=deploy/code config(user入力でない)前提でresidual許容
- gate全green(128件)。Codex最終: IPv4-mapped IPv6/error.type漏洩とも解消, 残CRITICAL/HIGHなしLGTM
- #2 composition root配線: src/core/profile/profiling-pipeline.ts。ProfilingPipeline.run(seed)=maker.profile→checker.verify。
  createProfilingPipeline(config)はmaker/checker別モデルのAnthropicLlmClient2本を生成。makerModel===checkerModelはthrow(maker≠checker二重防御:
  factory model不一致 + verifier checker!==derivedBy)。profilingConfigFromEnv(env)=ANTHROPIC_API_KEY/PROFILE_VERIFICATION_KEY/
  PROFILER_MODEL/VERIFIER_MODELを読込・必須検証。.env.exampleにPROFILER_MODEL=claude-opus-4/VERIFIER_MODEL=claude-sonnet-4追加
- 契約強化(Codex MEDIUM): verifierはverdict!=='approve' || confidence<MIN_USABLE_CONFIDENCE をreject扱い(strip+token無)。
  →approved:trueは常にusable confidence以上を含意。sub-floor approveが署名されてisUsableで弾かれる矛盾を解消
- gate全green(138件)。Codexレビュー: 当初MEDIUM2件(profile返却shape, sub-floor署名)→sub-floor修正・再レビューResolved。残CRITICAL/HIGH無
- #2 ★実APIでe2e検証成功(2026-06-15): maker=claude-opus-4-7, checker=claude-sonnet-4-6。B-Ticket seed→
  maker生成(尖ったPHプロファイル)→checker独立監査でapprove(confidence0.72)。maker≠checkチェーンが実APIで動作証明
- 実モデルID注意: API /v1/models で確認。claude-opus-4/claude-sonnet-4は404。有効: claude-opus-4-8/4-7/4-6,
  claude-sonnet-4-6/4-5-20250929, claude-haiku-4-5-20251001等。.env.exampleはopus-4-7/sonnet-4-6に更新
- liveスモーク: src/core/profile/profiling-pipeline.live.test.ts。describe.runIf(RUN_LIVE_PROFILE==='1' && KEY)で
  既定OFF→pnpm test(loop.sh)はhermetic維持(1 skipped)。実行は set -a; . ./.env.local; set +a; RUN_LIVE_PROFILE=1 pnpm vitest run <file>
- .env.local注意: 行末改行が無いとappendが値に連結する(ANTHROPIC_API_KEYにPROFILE_VERIFICATION_KEYが癒着した事故→perl分割で修復)
- gate全green(138 passed/1 skipped)。Codex: live test レビュー指摘無(既定OFF/秘密非露出/非決定的出力に妥当なassertion)
- #2 DONE(コア)。残発展: profiling結果のadmin UI露出(認証後), Postgres永続化(#4)

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
