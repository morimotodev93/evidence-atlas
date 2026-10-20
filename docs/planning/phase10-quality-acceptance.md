# Phase 10 — Quality Acceptance Criteria

作成日: 2026-10-19 (JST)。対象 Repository: `morimotodev93/evidence-atlas`。

## Purpose / Scope

Phase 10 の11項目について、既存証拠、未検証範囲、今後の合否判定を固定する。対象は現在実装されている Public Demo、通常 SaaS の Research/Workspace/Organization、Chat・引用・検索・索引と、その実行境界である。将来の招待・課金・高度な権限・未実装のテーマ切替は要求しない。

この文書の作成は品質検証の実行でも完了承認でもない。**チェック状態は E2E のみ完了、他10項目は未完了のまま維持する。** 以下のコマンド・シナリオは将来の手順であり、今回実行していない。既存の詳細な検証記録は移動・削除・修正しない。

## Current baseline and evidence sources

開始時に確認したブランチは `docs/phase10-quality-acceptance`、HEAD は指定 Baseline `6efd253d3a3477109326a0853ada7d2290f01943`。`docs/planning/roadmap.md` には既存の未コミット変更（表の整形・空白変更）があったため保持した。新文書とロードマップへの短い追記のみを今回の変更とする。

### 証拠の種類

| 記号 | 種類 | 使用できる結論 / 限界 |
| --- | --- | --- |
| S | 今回の静的確認 | 追跡されたソース・設定・文書の存在と内容。実行成功、配備状態、実DB内容を証明しない |
| C | 過去の Codex 実行結果として記録された証拠 | 記載されたコミット・環境・モック境界・コマンド内の結果。今回の再実行や独立した実ログ監査ではない |
| D | 開発者提供の実行報告・ログ | 報告された環境と範囲の結果。Codex の実行・観測に読み替えない |
| G-local | 今回確認したローカル Git 履歴 | マージコミットと実装の到達を確認。GitHub API、Checks、レビュー、現在の配備を照会した証拠ではない |
| G-remote | GitHub 上の PR・差分・マージ・CI | 将来照会した場合も C/D と別に記録する。マージや緑の CI だけで実サービス成功としない。今回は未取得 |

外部情報は [source-memo.md](source-memo.md) に従う。今回はリポジトリ内の静的情報だけを確認し、外部仕様・モデル提供状況や GitHub の現在状態を調査していない。以下の PR リンクは照合先であり、今回のリモート取得結果ではない。

### PR #1〜#9 の証拠索引

#### [#1](https://github.com/morimotodev93/evidence-atlas/pull/1) / `969af82`

- **既存の検証実績と証拠の種類:**
  D: C2 authenticated read-only Smoke **4/4**、Chat mock-only **6/6**。各段階 exit 0、Session revoke、保存 state 削除
- **根拠・留保:**
  [roadmap Phase 10](roadmap.md#phase-10--testing--quality)、[C2 runtime](c2-local-runtime.md)、
  [Route B](c2-e2e-session-route-b.md)。Google OAuth を行わない DB Session 作成。fixture 前後
  `present:8 / plannedInserts:0 / plannedDeletes:8` は削除実行ではない。DBコンテナー同一性は証明されていない

#### [#2](https://github.com/morimotodev93/evidence-atlas/pull/2) / `dd46982`

- **既存の検証実績と証拠の種類:**
  C: Public Demo **8/8**（desktop 6、375px 1、768px 1）、Vitest 52ファイル / 976件
- **根拠・留保:**
  Research一覧と代表詳細 Developer Productivity のリサイズ・遷移。物理モバイル・タッチではない

#### [#3](https://github.com/morimotodev93/evidence-atlas/pull/3) / `b8b97c1`

- **既存の検証実績と証拠の種類:**
  C: Public Demo **11/11**、3サイズでキーボード・構造・フォーカス露出。数値コントラストは限定サンプル
- **根拠・留保:**
  375px逆Tabで Sourceリンクが sticky header と部分的に重なる。完全遮蔽でないという既存判定を、問題解決としない

#### [#4](https://github.com/morimotodev93/evidence-atlas/pull/4) / `71c9ec7`

- **既存の検証実績と証拠の種類:**
  C: Public Demo **14/14**、残り3詳細を desktop で追加。D: Windows Chrome native 200% の部分結果
- **根拠・留保:**
  D: キーボード・縦スクロール、文字欠け・操作不能なしとの報告。全4詳細別の結果、横スクロール、正確な環境値は不足。CSS zoom と native zoom は別証拠

#### [#5](https://github.com/morimotodev93/evidence-atlas/pull/5) / `589af59`

- **既存の検証実績と証拠の種類:**
  C: 隔離 `pnpm build` は中断・exit 1・compile段階、`BUILD_ID` なし。D: Windows通常ビルドは工程完了、数値exit未提供
- **根拠・留保:**
  [roadmap PR #5](roadmap.md#initial-codex-isolated-verification)。Dの `.env.local, .env` 読込は隔離成功ではない。`build/**` の
  Vitest除外をSで確認。D: 修正後52ファイル / 976件成功

#### [#6](https://github.com/morimotodev93/evidence-atlas/pull/6) / `5072bbc`

- **既存の検証実績と証拠の種類:**
  C: Vitest **55ファイル / 1,029件**。Chat malformed JSON、Workspace選択の例外処理を修正、エラー経路を追加
- **根拠・留保:**
  [roadmap PR #6](roadmap.md#phase-10--testing--quality)、`chatRoutes`、`requireCurrentWorkspace`、`global-error`、Sentry
  runtime の各テスト。SDK capture mock は実送信ではない

#### [#7](https://github.com/morimotodev93/evidence-atlas/pull/7) / `ecd3766`

- **既存の検証実績と証拠の種類:**
  C: Vitest **56ファイル / 1,053件**。実guardを使う役割変更24件とWorkspace切替4件
- **根拠・留保:**
  `memberRoleActions.test.ts`、`switchWorkspace.test.ts`。DB/auth I/Oはモック、最後のADMIN検査は逐次動作であり競合保証ではない

#### [#8](https://github.com/morimotodev93/evidence-atlas/pull/8) / `05e4b71`

- **既存の検証実績と証拠の種類:**
  roadmapの実行記録: Vitest **58ファイル / 1,255件**。7 schema、11 Action、onboarding、役割入力、Demo拒否
- **根拠・留保:**
  PR #9は比較値を developer-provided と表記。証拠帰属を統一して独立実行と主張せず、PR #8本文の実行記録とPR #9の比較値を区別する

#### [#9](https://github.com/morimotodev93/evidence-atlas/pull/9) / `6efd253`

- **既存の検証実績と証拠の種類:**
  C: Vitest **58ファイル / 1,287件**、tsc/lint/diff成功。Source URLをHTTP(S)に限定
- **根拠・留保:**
  schema **129件**、direct Action **71件**。保存入力の検証であり、既存DBレコード、表示リンクの安全性、実通信を証明しない

全9件のマージコミットはローカル履歴で確認した（G-local）。PR #1の古い Draft/unmerged や C2 pending の記述は当時の記録であり、後日の成功・マージ記録と併読する。過去の件数は各時点の実績で、今回テストを実行した値ではない。

### 実行設定と既存テストの棚卸し（S）

[package.json](../../package.json) は `pnpm@12.9.1`、`test=vitest`、`test:e2e=playwright test`、`build=next build`。[vitest.config.ts](../../vitest.config.ts) は標準除外に `e2e/**`, `e2e-c2/**`, `build/**` を追加し、`@` と `server-only` を解決する。coverage閾値や unit/integration の別プロジェクト設定はない。**58は追跡 `*.test.ts` の静的ファイル数でもあるが、1,287という実行件数を静的に再計測したわけではない。**

以下は配置別の重複しないファイル数。unit/integration の性質は同一ファイル内でも異なるため、ファイル名だけで分類しない。

#### `src/types/research` / 1

- **対象テスト・実モジュール:**
  [validation.test.ts](../../src/types/research/validation.test.ts): Research title/description、status、Source、Finding、
  Comment、Tag、Conclusionの7 schemaモジュール
- **モック境界 / 保証しないもの:**
  Zod入力契約を実行。FormData transportやDB制約ではない

#### `src/auth` / 11

- **対象テスト・実モジュール:**
  [researchActions](../../src/auth/researchActions.test.ts) は10 mutation×6境界で実Research/Workspace guard、
  [researchCreateActions](../../src/auth/researchCreateActions.test.ts) は作成系caller、
  [inputValidationActions](../../src/auth/inputValidationActions.test.ts) は11 Actionと実guard、
  [memberRoleActions](../../src/auth/memberRoleActions.test.ts) は実User/access/admin guard
- **モック境界 / 保証しないもの:**
  `researchActions` のUser guard、`researchCreateActions` のResearch guardはモック。auth/DB/index/navigation等は外部境界としてモック

#### 同上（11の内訳の続き）

- **対象テスト・実モジュール:**
  [chatRoutes](../../src/auth/chatRoutes.test.ts)、[requireUser](../../src/auth/requireUser.test.ts)、
  [createInitialWorkspace](../../src/auth/createInitialWorkspace.test.ts)、
  [researchPages](../../src/auth/researchPages.test.ts)、
  [researchDetailDisplay](../../src/auth/researchDetailDisplay.test.ts)、
  [publicDeploymentRoutes](../../src/auth/publicDeploymentRoutes.test.ts)、
  [publicDeploymentWrites](../../src/auth/publicDeploymentWrites.test.ts)
- **モック境界 / 保証しないもの:**
  Chatはauth/access/context/retrieval/resolver/SDK/DBを基本モック。実prompt builder、選択ケースの `vi.importActual` validator/parser
  は実結合。onboardingはtransactionコールバックの模擬実行。静的React renderingはブラウザmountではない

#### `src/workspace` / 2

- **対象テスト・実モジュール:**
  [requireCurrentWorkspace](../../src/workspace/requireCurrentWorkspace.test.ts): cookie再検証・fallback・DB例外。
  [switchWorkspace](../../src/workspace/switchWorkspace.test.ts): 実guardとActionの結合
- **モック境界 / 保証しないもの:**
  cookie、auth、DB、Next navigation/cacheはモック。実cookie配送や同時変更ではない

#### `src/lib/ai` / 5

- **対象テスト・実モジュール:**
  [source-citations](../../src/lib/ai/source-citations.test.ts)、
  [ai-chat-dataset](../../src/lib/ai/ai-chat-dataset.test.ts)、
  [resolve-workspace-sources](../../src/lib/ai/resolve-workspace-sources.test.ts)、
  [retrieve-workspace-context](../../src/lib/ai/retrieve-workspace-context.test.ts)、
  [index-research](../../src/lib/ai/index-research.test.ts)
- **モック境界 / 保証しないもの:**
  引用・datasetは実処理、resolverはpredicateを実行するDBダブル。retrievalはembedding/vector search/DB/Sentryをモックし主に1件の観測属性経路。
  indexはchunker/embedding/lock/DB/Sentryをモックしupsert・冪等性を確認。実pgvector・lock・rollbackではない

#### `src/lib/demo` 1 + `src/app/demo` 1

- **対象テスト・実モジュール:**
  [read](../../src/lib/demo/read.test.ts) の実Demo reader・scope制限と、[pages](../../src/app/demo/pages.test.ts)
  の表示・notFound・例外
- **モック境界 / 保証しないもの:**
  reader側DB、pages側reader/Next/authをモック。private metadata除外と別Workspace拒否を確認するが実HTTPではない

#### `src/lib/deployment-mode.test.ts` / 1

- **対象テスト・実モジュール:**
  [deployment-mode](../../src/lib/deployment-mode.test.ts): Demo環境値のfail-closed契約
- **モック境界 / 保証しないもの:**
  配備時の設定値や認証セッションを保証しない

#### `src/lib/observability` 2 + `src/app/global-error.test.ts` 1

- **対象テスト・実モジュール:**
  [sentry-config](../../src/lib/observability/sentry-config.test.ts)、
  [sentry-runtime](../../src/lib/observability/sentry-runtime.test.ts)、
  [global-error](../../src/app/global-error.test.ts): sample rate・初期化・静的error表示と登録effectの明示呼出し
- **モック境界 / 保証しないもの:**
  SDKはモック。実イベント配送・任意例外のredaction・ブラウザ回復ではない

#### `src/app/api/inngest` 2 + `src/inngest` 1

- **対象テスト・実モジュール:**
  [route](../../src/app/api/inngest/route.test.ts)、
  [request-research-index](../../src/app/api/inngest/request-research-index.test.ts)、
  [client](../../src/inngest/client.test.ts): Demo拒否、lazy dispatch、enqueue失敗、SDK mode境界
- **モック境界 / 保証しないもの:**
  Cloud通信・署名交換・ジョブ実行やretry実績ではない

#### `src/lib/c2` / 4

- **対象テスト・実モジュール:**
  [runtime-database](../../src/lib/c2/runtime-database.test.ts)、
  [service-isolation](../../src/lib/c2/service-isolation.test.ts)、
  [build-isolation](../../src/lib/c2/build-isolation.test.ts)、
  [sentry-client-isolation](../../src/lib/c2/sentry-client-isolation.test.ts)
- **モック境界 / 保証しないもの:**
  DB/サービス拒否、synthetic dotenvと実loader、設定alias・inert adapterを確認。実DB・Next build・通信全遮断の証拠ではない

#### `scripts` / 26

- **対象テスト・実モジュール:**
  `c2-*.test.ts` **24**: DB target、launcher/診断、fixture、Session、runner/config/state、OAuth観測、probe、network lifecycle、
  Chat mock、実SSR summary/locator等。`evaluation-cli-options.test.ts`, `evaluation-run-storage.test.ts` **2**
- **モック境界 / 保証しないもの:**
  browser/HTTP/process/SQL等はダブルまたはsynthetic subprocess/source確認。storageは一時ファイルの実I/Oを含む。
  C2/E2Eという名前でもブラウザや実サービスを起動した結果ではない

[playwright.config.ts](../../playwright.config.ts) は `e2e/`、Desktop Chrome project（Chromium）、1 worker、最初の失敗で停止、ローカルサーバー自動起動なし。既定は公開Demo URLで `E2E_BASE_URL` により変更可能。[public-demo.spec.ts](../../e2e/public-demo.spec.ts) は動的展開を含む14件（従来desktop 6 + mobile 2 + accessibility 3 + 他詳細desktop 3）で、preflightとbrowser non-GET拒否を持つ。

[playwright.c2.config.ts](../../playwright.c2.config.ts) は固定C2 originのSmoke専用、[playwright.c2.chat.config.ts](../../playwright.c2.chat.config.ts) は別のChat専用。4件と6件は別suite・別opt-inで、global setup/state/network制限、1 worker、retryなし、trace/screenshot/videoなし、snapshot抑止・redacted reporterを使う。C2は実Chatエンドポイントを503にするため、Chat suiteはAPI全体をブラウザ側でmockする。

手動用の `scripts/test-vector-search.ts`, `test-retrieve-workspace-context.ts`, `test-source-citations.ts`, `evaluate-retrieval-context.ts`, `evaluate-ai-chat.ts` はVitestの合格suiteと同一視しない。特に検索・評価スクリプトはDB/AIに到達し得るため、今回importも実行もしない。

### 関連仕様・実行記録と整合性

- [product-definition §9.6–9.7](product-definition.md#96-authentication--authorization)、[data-model §6–8](../architecture/data-model.md#6-data-boundaries)、[directory-structure](../architecture/directory-structure.md)、[AI architecture](../architecture/ai-architecture.md)、[design system](../design/design-system.md) を実装範囲の基準とする。
- [C2 local PostgreSQL](c2-local-postgres.md) はtarget/role/portとmigrationの準備、[runtime](c2-local-runtime.md) は起動・OAuth・fixture・mock suiteの段階別記録。[runner refusal](c2-runner-config-refusal-report.md)、[D19](c2-d19-scenario-investigation.md) は失敗・offline修正を保持。[Route B](c2-e2e-session-route-b.md) の成功手順をOAuth成功に読み替えない。
- C2 Step 2-CのGoogleログインとUser/Account/Session増加、Steps 3-B/3-Cの8件fixture・手動閲覧は限定的な実DB利用記録。DB整合性・transaction・競合テストの合格ではない。後の手動Edge成功も自動Google OAuthの成功ではない。
- **文書と現状の差異:** directory-structure の「E2E suite未配置」は現存3 suiteと相違する。AI architecture §6の「prompt追加は未コミット」は `e707e23` がHEADの祖先であること、およびquality reportの追記と相違する。ただし歴史的な実行時prompt identity・配備は未証明。`docs/planning/requireCurrentWorkspace.ts` はcookie導入前のsnapshotで現行runtime仕様に使わない。今回はこれらを報告し、原文を黙って更新しない。

## Completion decision policy

1. 下表と詳細手順の有限な対象を契約とする。全関数・全ブラウザ・全WCAGの無制限な網羅、coverage率、テスト件数の増加を合格条件にしない。
2. 各行の対象ケースを既存assertionへ対応付ける。実関数、モックしたguard/I/O、期待値、成功・拒否・例外時の副作用を記録し、既存ケースで満たす部分は再実装しない。新しいリスクを観測するassertionだけを追加する。
3. 判定は `Pass / Fail / Not run / Blocked` を使う。許可・環境不足はBlocked、未実行はNot run。収集のみの `--list`、EPERMでcollection前に停止、compile中断をPassにしない。
4. 必要証拠は対象commit/差分、実行者（C/D/CI）、日時・timezone、OS/tool version、対象/除外・mock境界、コマンドと数値exit、期待/実測結果、失敗も含むartifact参照。秘密値・cookie・raw private dataは含めない。配備対象を使う場合はbuild/commit identity、特定できなければその限界も記録する。
5. 既存証拠の対象コードが変わらず、その行の全条件を満たすとレビューで確認できれば再実行を機械的に要求しない。変化した境界だけ対象を再検証する。最終的なチェック更新は別PRの明示的判定で行い、本PRでは一切更新しない。
6. 必須ケースの失敗やblocking defectが残る行は完了しない。対象外・既知のdeferred riskには理由と追跡先を残す。行の対象を縮めて失敗を消す場合は別のscope変更としてレビューし、元の結果を保存する。
7. E2Eの完了済み範囲は固定する。Google OAuth・実AI・DB engineの合格を追加しない。他の行がBlockedでも過去の限定E2E合格を取り消したり、逆に他の行まで完了にしない。

優先度: **P0**=安全前提・露出境界、**P1**=次に進める有限の品質gate、**P2**=準備と承認後の実環境gate。順番は重要度だけでなく依存関係で決める。

## Phase 10 acceptance criteria matrix

「条件」は後続の同じIDの手順・期待結果・証拠・対象外を含む。実サービス欄の「不要」はその行の限定判定に不要という意味であり、実環境が検証済みという意味ではない。

| ID / 項目 | 現在のチェック | 優先度 |
| --- | --- | --- |
| [U / Unit tests](#u--unit-tests) | 未完了 | P1 |
| [I / Integration tests](#i--integration-tests) | 未完了 | P1（HTTPはP2） |
| [DB / Database tests](#db--database-tests) | 未完了 | P2、計画P1 |
| [AI / AI-related tests](#ai--ai-related-tests) | 未完了 | P1準備 / P2実行 |
| [EE / End-to-end tests](#ee--end-to-end-tests) | **完了を維持** | 維持 |
| [V / Validation tests](#v--validation-tests) | 未完了 | P1 |
| [AZ / Authorization tests](#az--authorization-tests) | 未完了 | P1 |
| [E / Error handling review](#e--error-handling-review) | 未完了 | P1 offline / P2 runtime |
| [A / Accessibility review](#a--accessibility-review) | 未完了 | P1（修正P0） |
| [R / Responsive UI review](#r--responsive-ui-review) | 未完了 | P1 Demo / P2 SaaS |
| [PB / Production build verification](#pb--production-build-verification) | 未完了 | P2、準備P0 |

### U / Unit tests

- **現在のチェック:**
  未完了
- **実装・検証済み:**
  schema、引用、Demo mode、設定・C2/CLI純粋境界
- **根拠:**
  上記58ファイル棚卸し、PR #6–#9、Cの1,287件
- **未検証:**
  chunkerの空/境界/分割、既存テストと契約の対応
- **判定可能な完了条件:**
  Uの有限ケースを実関数で満たし、対象suite exit 0、差分に応じたoffline回帰成功
- **残作業:**
  対応表とchunkerの不足ケースのみ追加
- **優先度:**
  P1
- **実サービスの要否:**
  不要
- **判定を妨げる依存関係:**
  subprocess/依存状態の確認。DB/AI待ちは不要

### I / Integration tests

- **現在のチェック:**
  未完了
- **実装・検証済み:**
  実guard→Action、prompt/validator/parser→Chat、resolver predicate、SSR結合の一部
- **根拠:**
  C1、PR #6–#9、`chatRoutes`, `inputValidationActions`, `memberRoleActions`
- **未検証:**
  実context/selection結合、Next HTTP/Server Action transport、送信後失敗
- **判定可能な完了条件:**
  Iの実モジュール鎖と限定HTTPケースを成功・拒否・失敗時の状態まで検証しexit 0
- **残作業:**
  境界表、context/selection不足、通常SaaS隔離harnessとHTTP検証
- **優先度:**
  P1（HTTPはP2）
- **実サービスの要否:**
  providerはmockで可。HTTP時は隔離ローカルruntime。実DBは採用設計次第で別承認
- **判定を妨げる依存関係:**
  U、Eのerror契約、安全な非C2 Chat harness。C2の503を無効化して代用しない

### DB / Database tests

- **現在のチェック:**
  未完了
- **実装・検証済み:**
  限定C2 schema/fixture/session利用報告、mock transaction/index upsert
- **根拠:**
  C2 runtime/Route B、data-model、`index-research.test.ts`
- **未検証:**
  実FK/unique/cascade、rollback、lock、ADMIN競合
- **判定可能な完了条件:**
  DBの使い捨てDBケースで制約・原子性・競合不変条件を全て満たす。前後検査とcleanup完了
- **残作業:**
  専用計画、承認、fixture・障害・barrier実装、実DB実行
- **優先度:**
  P2、計画P1
- **実サービスの要否:**
  **実DB必須・明示許可**。OAuth/実AI不要
- **判定を妨げる依存関係:**
  DB同一性/権限/別namespace、既存C28件保護、競合保証の設計

### AI / AI-related tests

- **現在のチェック:**
  未完了
- **実装・検証済み:**
  引用/allowlist、dataset、C1 mock、過去Gemini/Groq評価
- **根拠:**
  [quality report](ai-chat-quality-evaluation.md)、AI architecture、AIの5 suite
- **未検証:**
  再現可能なprompt/設定、C2/I2/N2採点、意味的grounding、実検索・実Chat
- **判定可能な完了条件:**
  AI-A offline、AI-B固定条件のGemini18回答、AI-C実検索/Chatの限定検証を各gateで満たす
- **残作業:**
  rubric固定、失敗保持、保存artifact、承認済み実AI評価と通常SaaS検証
- **優先度:**
  P1準備 / P2実行
- **実サービスの要否:**
  **実AI/embedding必須・承認**。AI-Cは実DB/セッションとrate-limit境界も必要
- **判定を妨げる依存関係:**
  U/I/DB、予算・隔離・rubric、実Chat用target。Groq再比較は必須ではない

### EE / End-to-end tests

- **現在のチェック:**
  **完了を維持**
- **実装・検証済み:**
  Public Demo、C2 read-only Smoke4/4、Chat mock6/6
- **根拠:**
  PR #1–#4、C:Demo14/14、D:C2 transcript
- **未検証:**
  Google OAuth自動化、実AI/API、DBコンテナー同一性、完全egress
- **判定可能な完了条件:**
  既存限定scopeの成功・cleanup記録を保持。変更時のみ該当suiteを安全に再検証
- **残作業:**
  今回は証拠整理のみ
- **優先度:**
  維持
- **実サービスの要否:**
  既存判定に再接続不要。再実行はDemo HTTP/C2実DB・Sessionの別承認
- **判定を妨げる依存関係:**
  追加実行時のtarget/fixture/state安全gate。未検証機能をscopeへ足さない

### V / Validation tests

- **現在のチェック:**
  未完了
- **実装・検証済み:**
  7schema、11 Action、onboarding、roles、HTTP(S)入力、拒否時無副作用
- **根拠:**
  PR #8/#9、schema129・Action71、既存Chat400
- **未検証:**
  transport、duplicate keys、全File型方針、grapheme UX
- **判定可能な完了条件:**
  Vの保存入力契約を既存assertionへ対応付け、正規化/限界/拒否/正常副作用/例外を全て満たす
- **残作業:**
  対応表と未定policyの明記。既存証拠で満たせれば追加テスト不要
- **優先度:**
  P1
- **実サービスの要否:**
  限定direct-call判定は不要
- **判定を妨げる依存関係:**
  PR #9を最終URL仕様とする。transportはI、表示URLは別P0

### AZ / Authorization tests

- **現在のチェック:**
  未完了
- **実装・検証済み:**
  実guard、tenant scope、独立ADMIN、逐次last-ADMIN、Demo拒否、switch
- **根拠:**
  PR #6/#7、Research/Chat/Demo既存suite
- **未検証:**
  settings/onboarding等のread境界の対応漏れ、実transport、権限変更race
- **判定可能な完了条件:**
  AZのroute/caller表で許可/拒否・漏洩/副作用なしを示し、mock guardを実guard証拠で補完
- **残作業:**
  read入口を静的照合、不足ケースのみ追加。逐次契約は既存証拠で満たす可能性
- **優先度:**
  P1
- **実サービスの要否:**
  限定逐次判定は不要。raceはDB/HTTPはI
- **判定を妨げる依存関係:**
  実guard対応表。DB競合保証は別gateとして未検証のまま明示

### E / Error handling review

- **現在のチェック:**
  未完了
- **実装・検証済み:**
  malformed JSON400、予期しない例外伝播、Workspace fallback修正、capture mock
- **根拠:**
  PR #6、C1、Demo reader、global-error/Sentry tests
- **未検証:**
  未対応caller失敗、stream/abort、production response・browser回復、実redaction
- **判定可能な完了条件:**
  Eの障害表と隔離production-mode応答/回復を満たし、false success/秘密漏洩なし
- **残作業:**
  不足の代表障害・stream policy、production artifact後の安全なmount/HTTP確認
- **優先度:**
  P1 offline / P2 runtime
- **実サービスの要否:**
  実AI/DB障害/Sentry送信はmock注入で可。実Sentry配送は別承認で対象外
- **判定を妨げる依存関係:**
  I、PB、合意した部分保存/abort契約、Sentry metadata取り扱い

### A / Accessibility review

- **現在のチェック:**
  未完了
- **実装・検証済み:**
  代表詳細×3幅のTab/Shift+Tab/構造、限定contrast、全詳細desktop表示
- **根拠:**
  PR #3/#4、Public Demo14件、D:Chrome200%部分報告
- **未検証:**
  全4詳細の全幅操作、native zoom詳細、テキストspacing/focus状態、375px重なり
- **判定可能な完了条件:**
  Aの対象ページで名前/構造/keyboard/可視focus/可読性/zoomを全て記録。375px重なりは修正・再確認する
- **残作業:**
  既存ケース再利用、追加詳細・zoom結果表、overlap修正と回帰
- **優先度:**
  P1（修正P0）
- **実サービスの要否:**
  Demo GET/browser必要。DB直接接続/OAuth/AI不要
- **判定を妨げる依存関係:**
  Rと共同レビュー、配備identity、native Chrome手動環境

### R / Responsive UI review

- **現在のチェック:**
  未完了
- **実装・検証済み:**
  375×812、768×1024代表詳細、1280×720 desktop全詳細
- **根拠:**
  PR #2–#4、D:Chrome200%部分報告
- **未検証:**
  他3詳細の狭幅、全ページnative200%、SaaSのdesktop/mobile AI操作
- **判定可能な完了条件:**
  Rの固定ページ×viewport表でoverflow/clipping/重なりによる操作不能なし。SaaS配置切替はsynthetic Chatで確認
- **残作業:**
  4詳細×3幅の差分確認、native200%補完、SaaS breakpoint確認、overlap解決
- **優先度:**
  P1 Demo / P2 SaaS
- **実サービスの要否:**
  Demo HTTP。SaaSは承認C2 read-only＋Chat mockで可
- **判定を妨げる依存関係:**
  A、C2/session安全gate、画面間state非同期を仕様として記録

### PB / Production build verification

- **現在のチェック:**
  未完了
- **実装・検証済み:**
  D:Windows通常ビルド工程完了。C:隔離run中断を詳細記録
- **根拠:**
  PR #5、`next.config.ts`, package scripts、env/Sentry記録
- **未検証:**
  credential-free build完走、数値exit0、完全artifact、依存再現性・egress境界
- **判定可能な完了条件:**
  PBの隔離条件で通常production `pnpm build` exit0、compile/type/route完了、`BUILD_ID`等を確認
- **残作業:**
  環境・copy/junction・pnpm lock問題を整理後、承認された安全な再build
- **優先度:**
  P2、準備P0
- **実サービスの要否:**
  アプリ実サービス不要。通常font取得は限定network許可が必要になり得る
- **判定を妨げる依存関係:**
  env自動読込とSentry upload隔離、依存状態、resource上限。C2 buildで代替不可

### U / I — 重複を増やさない実施手順

- **U:** schema/引用/Demo mode/C2 policy/CLI設定の既存assertionを一覧化し、成功、無効値、境界、失敗時の拒否を対応付ける。追加は現状mockされる `chunkText` / `estimateTokenCount` の空白入力、短いASCII/CJK、閾値前後、複数chunkの元テキスト保持・overlap・終了性の代表ケースに限定する。実tokenizer精度や全Unicode組合せは対象外。テストが関数の行を写すだけにならず、入出力と本文欠落を観測すること。
- **Iのoffline gate:** (1) 実 `buildResearchContext` をDBダブルに結合し、missing Research、null Conclusion、未リンク/リンクSource、Comments/Source本文を含めない契約を確認。(2) 実 `retrieveWorkspaceContext` に固定vector候補を渡し、distance=0.35/超過、候補要求10/出力最大5、同一type/id重複、同一ResearchのCONCLUSION/RESEARCHの区別、missing元レコードをskipし補充しない動作、Finding chunk本文と現在Source metadataを確認。(3) 実prompt/validator/parserを使う既存C1・resolverとguard→Actionを再利用する。embed/search/DB/SDK mockの存在を表に記録し、実SQL結合と呼ばない。
- **IのHTTP gate:** 通常SaaSの隔離targetで、既存の契約を使いResearch更新Action成功/invalid入力/非member拒否、Chat会話作成・list・detail・固定stream送信/復元を各1代表経路確認する。401/404/400、指定targetのみに保存、拒否時write/AIなし、期待するredirect/履歴を観測する。provider/Redis等はローカルの固定応答に置換した専用harnessを別PRでレビューし、C2 guardは緩めない。guardの直呼び合格だけでtransport合格にしない。実DBを使う案ならDB gateの許可・fixture計画を先に満たす。
- 将来の実行例は `pnpm exec vitest run <対象ファイル>` と、差分に応じた `pnpm test --run`。対象suiteは全件成功・exit0、独立する既存テストを黙って除外しない。変更した契約とassertion、mock一覧、実行ログを証拠にする。今回これらは未実行。

### DB — 実DB専用の有限gate

実施前にDB安全gateを満たす。現在のC2保護fixtureとは別の、使い捨てDBまたは明確に分離した所有manifestを使う。対象contract/migration revisionを固定し、必要なschema準備・書込・cleanupを個別に許可する。通常開発/本番にfallbackしない。手順が未実装のため、以下は自動実行できる既存suiteの主張ではない。

1. 独立2tenantのUser/Organization/Workspace/Researchと最低限の子を作る。Membership/WorkspaceMembership複合キー、FindingSource/ResearchTag複合キー、Workspace内Tag名、RetrievalChunk unique keyで同じキーを2回書き、重複拒否または設計されたupsert結果1件を確認する。必要な親なしの子追加はFK違反で拒否されること。
2. Source/Findingそれぞれの削除でFindingSourceがcascadeし、反対側の本体は残ることを確認する。別Research Sourceリンク・別Workspace TagはアプリActionで拒否、他tenantのrow差分ゼロを確認する。独立FKだけでは同じResearch/Workspaceを強制しないため、DB制約が保証すると書かない。
3. onboardingのOrganization/Workspace/2 membership、Tag新規作成とResearchTag、index replacementの各transactionで途中に合成障害を1箇所注入し、新規rowゼロまたは旧chunk完全保持を確認する。成功時は期待graphが全件できること。既存mock transactionが呼ばれたこととは別証拠にする。
4. barrier付き2 connectionで同じResearchのindex replacementを競合させ、advisory lockの待機/解放、重複なし・半端なchunk集合なしを確認する。embeddingは固定値でよく、実AIは不要。異なるResearchの操作が不必要に同じlockで止まらない代表ケースも1件確認する。
5. Organization/Workspace各scopeの最後の2 ADMINを同時に降格する代表ケースで、commit後ADMINが最低1人残り、敗者が明示的拒否/rollback等で扱われることを要求する。現在のread/count→別updateには原子的保証がないため、失敗した場合は実装修正が必要であり「テスト済み」で完了にしない。権限取消とwriteの競合も1代表ケースで期待する整合点・拒否方針を先に固定し、取消後に無権限writeが確定しないことを検証する。
6. 各caseの期待/実測row数・constraint種別・transaction outcome・競合の順序を秘匿化して残す。終了時は所有manifestだけcleanupし、他row/既存C2 fixture/auth rows不変、全connection終了を確認する。cleanup失敗はgate失敗として報告する。

対象外は全migration経路の互換性、負荷限界・性能benchmark、災害復旧、全分離レベルの組合せ。`AiUsageEvent` と `RetrievalChunk` のscalar attributionにはFKがないため、存在しない参照制約を合格条件にしない。Chat全writeのtransaction化も現行仕様ではなく、途中失敗時の部分保存はI/Eで判断する。

### AI — offline、モデル品質、実Chatを分ける

[quality report](ai-chat-quality-evaluation.md) のモデル応答・採点は開発者提供の実行観測（D）であり、今回のCodex実行ではない。元Geminiは **Pass4 / Provisional1 / Fail1**。Case03はsemantic引用のscope違反。prompt改善後のCase03反復5回は引用適切5/5、満点1/5。最新Geminiは **Pass3 / Fail3**（02:5/6、03:7/8、04:7/8）。引用IDの適格性だけでは因果表現・限定・説明不足を解決しない。

Groqは `openai/gpt-oss-120b` の評価専用。01は2回とも4/6 Fail、02はraw4/6 Fail（正規化後6/6相当でもraw判定を変更しない）、03は定性的失敗で統合点なし、04は7/8 Fail、05は8/10 Fail、06のみ6/6 Pass。Finding ID/metadataを引用にする失敗、review時間増加を余力と逆解釈する失敗等を保持する。異なるprompt/反復数の比較からモデル優劣・料金・再現性を推定しない。

#### AI-A: 実行不要の準備とoffline処理

- **手順・期待結果:**
  実prompt builder、dataset v1.0、引用allowlist/正規化/parse、C1、Iのcontext/selection、run-storage契約を対応付ける。
  C2/I2/N2の因果/限定/測定助言の0/1/2採点を例付きで固定し、datasetのGemini専用verdict文言との差異を解消する方針を別PRで決定する
- **必要な証拠 / 対象外:**
  prompt commitと構築後SHA-256、fixture hash、SDK/model ID・設定表。既存testで足りる所を複製しない。C2/I2/N2は採点criterion IDで、C2 runtimeとは別。
  provider呼出し不要

#### AI-B: boundedな実モデル品質gate

- **手順・期待結果:**
  production設定のGoogle `gemini-3.6-flash`（実行前にID/利用可否を確認）で6ケース×事前固定3反復=**18 assessable回答**。各expected behavior=2、failure
  conditionなし、claimと引用の意味的対応が全回答で成立することをPass条件とする。02/03/04は2評価者で採点し、差は理由付きで合意。曖昧さを実行後に緩めない
- **必要な証拠 / 対象外:**
  全失敗/Not runも保持、成功だけ選ぶretry不可。HTTP/生成失敗は内容Failと区別し、再実行回数/費用は事前承認。18件はこのfixtureのgateであり統計的な本番信頼度ではない。Groqの再比較は任意で、
  行の完了に必須ではない

#### AI-C: 実検索と実Chatの限定gate

- **手順・期待結果:**
  承認済みの通常SaaS隔離DBで2tenant・固定Researchをindexし、旧16問の関連度groupを利用して4代表問（同Research、同Workspace別Research、関連なし、
  別Workspaceのみ）を実embedding/searchで確認する。返るID/順位/期待空集合を実行前に明記し、無関係・別tenant引用なし。
  続けて引用可能な正常回答と資料不足回答の各1会話で送信→stream完了→usage/message保存→History復元を確認する
- **必要な証拠 / 対象外:**
  期待関連ID、実retrieval結果・許可Source、raw/validated/persisted/renderedの差、finish reason・usage・復元結果。別tenantの変更ゼロ。
  DB/AI/必要なrate-limitサービスの接続は個別承認。全16問のrecall統計、長会話・他言語・全injection・Groq production採用は対象外

実行metadataには日時、実行者、provider/model ID（aliasの場合はその限界）、prompt commit/hash、dataset/fixture hash、generation settings（未指定ならSDK/provider defaultと明記）、各反復のraw/validated/parsed、採点criterion/reviewer/reason、usage/finish reason、許可された費用を含める。現行 `--save` はprompt/fixture hashと応答段階・usageを保存するが、prompt全文snapshot、採点者・採点・全generation settings・finish reasonの完全な記録ではない。不足はsanitized sidecarで補い、secretやprivate資料を保存しない。`.env` を読む実行CLIを承認前に起動しない。

post-validationで空になるAI Message、raw streamと保存後引用の差、Source refresh失敗は既知の動作。空回答・引用表示の受入policyを先に決め、正常回答と扱わないこと、未許可/非HTTP(S)リンクを操作可能にしないことをI/E・表示防御の後続PRで確認する。修正が必要なら本PRではなく実装PRで扱う。

### V / AZ / E — 既存証拠で判定できる部分と追加gate

#### V

- **実施手順と期待結果:**
  PR #8/#9の表を7schema→11 Actionへ対応付ける。missing/null/blank/trim/newline、min/max−1/max/max+1、status enum、
  description/Conclusion null、Source HTTP(S)/localhost/不許可protocol、onboarding名・role
  enumで既存の正規化payload/同一error契約/拒否時無副作用を確認する。成功時auth→正しいscope保存→必要index/redirect、save失敗時既存error/throwを確認
- **必要証拠 / 対象外:**
  既存schema129・Action71と関連suiteのassertion参照で満たせる可能性。新テスト数を要求しない。重複form keys、全fieldのFile拒否、payload/transport上限、
  grapheme長、ID形式の新policyは対象外・別PR。HTTPはI、既存保存URL表示はP0で別管理

#### AZ

- **実施手順と期待結果:**
  route/caller表をdirectory-structureの入口に対応付ける。未認証、別tenant MEMBER/ADMIN、同scope MEMBER/ADMIN、複数Workspace membership、
  missing子/会話と違うResearchを有限caseにする。Organization/Workspace role独立、target複合predicate、逐次last ADMIN、current cookie再検証、
  Demoのauth/private lookup前拒否、chat401/404を示す。Chatは認証UserのWorkspace membership→Research→Conversation IDとResearch
  IDの一致を確認し、会話作成者限定という新要件を作らない。settings read/onboarding入口も現在の実guardを追い、漏れだけ追加
- **必要証拠 / 対象外:**
  guard自体をmockしたcaller testは他の実guard testと対応させる。拒否時query/write/cookie/cache/index/AIなし、許可時target以外変更なしのassertionを示す。
  現存逐次caseは再追加しない。実OAuth/transportは対象外、競合はDB gate。これでproduction全体の認可保証を主張しない

#### E

- **実施手順と期待結果:**
  PR #6の各error分類をcallerに対応付け、未対応のWorkspace/admin/onboarding/Conversation list/detailのDB例外を代表各1件で確認する。成功/404に誤変換せず、
  固定されたAction error/throwを守る。stream開始前/後・abortをsynthetic providerで注入し、
  spinner解除・再操作・USER/usage/AIの部分保存と未完了AI非成功扱いを記録する。PB成功後の隔離production-modeで合成例外のHTML/RSC/HTTPとglobal error表示を確認し、
  message/stack/secret marker漏洩なし、ブラウザ再操作可能を確認
- **必要証拠 / 対象外:**
  既存Chat400/401/404/429・例外同一性・no-write、Demo例外・notFound、global-error mockを再利用。実Sentry送信を要件にしない。
  capture引数とredaction方針をreviewし、任意例外文やextras/breadcrumbを自動redactする保証はないと明記。実provider outage/実DB停止、完全監視監査は別gate

Vの既存入力契約、AZの既存逐次guard契約、Uの既存純粋policy部分、Eの既存error経路は、コードが変わらず対応表が埋まれば過去証拠だけで満たす可能性がある。ただしUのchunker、I/DB/AI、A/R、PBとEのruntime部分は現存証拠だけでは満たさない。AZのread入口監査で未対応境界が見つかれば、そこだけ追加する。

### A / R — 限定した画面受入レビュー

対象は `/demo` と全4詳細 **Developer Productivity / Code Quality & Reliability / Developer Experience / Adoption & Organizational Impact**。A/R共同の結果表を使い、既存14ケースで済む部分を再実装しない。viewportは **1280×720、375×812、768×1024**。3つの詳細はdesktop回帰だけなので、狭幅も確認済みとしない。

1. 各ページ×3幅でh1/main、Conclusion/Sources/Findings/Discussion、本文/Source title/empty state、Back、一覧の4リンクを確認。`scrollWidth <= clientWidth`、必要本文のclippingなし、重なりで読めない/使えない箇所なしを期待する。意図した一覧ellipsis/URL preview短縮は許容し、全文がlink name等で識別できること。
2. Tab/Shift+Tab/Enterのみでheader、全Research、Back、Source/Supporting Sourceを到達・操作でき、順序が理解可能、trapなし、focus-visibleが目視可能であること。外部Source/GitHubへは遷移せず、名前とHTTP(S)先だけ検査する。**375pxの既知のSource/sticky header部分重なりは未解決。focusしたリンクの表示とindicatorがheaderに隠れない状態へ修正し、forward/reverse Tabの再現手順・修正前後を記録するまでA/Rは完了しない。** 完全遮蔽でない既存assertionをそのまま修正完了証拠にしない。
3. native Chrome 200%を同じwindowで全5ページ確認し、version、Windows、window/viewport、OS scaling（取得不可なら明記）、日時、menuの200%を記録する。各ページの本文・縦scroll・横scroll・keyboard/focus/Backに個別結果を残す。既存D報告は部分証拠に留め、CSS `zoom:2` / deviceScaleFactorは代替にしない。
4. 全5ページでtext-only 200%およびline-height1.5、paragraph spacing2em、letter spacing0.12em、word spacing0.16emの上書きに対し、主要本文と必要リンクの欠落・操作不能なしを確認し元に戻す。使用したブラウザ/方法を記録する。light themeの本文/metadata/タグの代表contrastとfocus/hover/sticky背景の可視性を追加確認し、既存5組の比率を全状態へ一般化しない。採用する限定基準は通常text4.5:1、大きなtext3:1、必要な非text/focus境界3:1。測定不能・不一致は合格扱いにせず記録する。
5. RのSaaS追加範囲は実装済みのoverview/list/detail、Workspace selector、Research作成/編集・代表Source dialog、settings役割form、onboarding formの375px/768px/desktop表示とkeyboard操作、およびChatの`lg`前後（1023/1024px）のside panel/mobile dialog/History/送信error/citation。合成データ・mockで確認し実mutationをしない。viewport切替でpanel instanceのdraft/選択が同期しない既存仕様は、Historyで保存会話を開き直せることを確認し、同期機能の追加要件にしない。現C2 fixtureにないform/設定はoffline preview等の別harnessをレビューする。

必要証拠はpage×viewport×操作のPass/Fail/未実施表、匿名化したfocus/欠け/重なりのcapture、検査実行者・環境・対象配備identity。Aはこの有限範囲の構造・操作・可読性レビュー、Rは上記画面の配置/操作レビューであり、**WCAG完全適合監査ではない**。screen reader/全支援技術、他ブラウザ・物理device、dark theme、全contrast全状態はdeferred riskとして残す。SaaS form全画面の正式なa11y監査もこのA gateには含めない。

### PB — 安全な通常production buildの受入

PR #5の通常Windows工程完了（D）とcredential-free copy中断（C）は別結果である。中断後のPostCSS errorを自然発生のアプリ不具合・OOM・font errorと断定しない。`runAfterProductionCompile`完了はSentry upload実施/無効化の証拠でもない。

1. 通常production configを使う別checkout/隔離copyと、pnpm12.9.1・lockfileに合う依存状態を用意する。既存`.env*`やbuild出力・`node_modules`を無条件copyしない。PR #5のjunction/copy layout、subprocess権限、pnpm project/store lockエラーを先に解決・記録する。依存導入が必要なら別途許可された環境で `pnpm install` を使い、packageManagerやverifyDepsを変更して回避しない。
2. fresh process環境と追跡ファイルだけを使用し、Nextの `.env.production.local`, `.env.local`, `.env.production`, `.env` とSentryの `.env.sentry-build-plugin`、user/project `.sentryclirc`、shellのDSN/token/org/project/upload設定・provider/DB/auth/Redis/Inngest/preload設定が入らないことを確認する。`.env.sentry-build-plugin` はpluginがprocess.envへ上書きし得るため、shellのunsetだけでは足りない。値は出力しない。
3. 本番DB/DEMO_WORKSPACE_IDを与えず、`PUBLIC_DEMO_MODE=true`、Next telemetry無効、Sentry DSN/build tokenなし、release/upload先なしで実施する。`withSentryConfig`の`telemetry:false`はsource map/release uploadの包括無効化ではない。C2 alias・inert fontに置き換えて通常buildの成功としない。font取得が必要なら認めたGoogle Fonts宛のtransportだけを使う。アプリサービスへのegressは拒否し、DB/OAuth/AI/Upstash/Inngest/Sentry接続が観測されたら停止する。
4. 事前合意した時間・memory上限内で **`pnpm build` exit 0**、compile、組込TypeScript、page data/static generation、最終route出力が完了すること。`.next/BUILD_ID`と必要manifest/server/static出力の存在・非空、`/demo`と`/demo/research/[researchId]`のrouteを記録する。生成typeだけや途中chunkを完全artifactとしない。build時にDemoデータをqueryしない設計のまま確認する。
5. 数値exit、stage、artifact一覧、warning分類、依存/環境確認、設定上の隔離と観測した通信の範囲を残す。意図しないcredential混入・upload・アプリサービス通信なしをgateにするが、packet観測が限定的なら完全egress監査と主張しない。生成物/logのsecret scanと元env/作業ツリー不変を確認し、build出力をGitへ追加しない。

期待結果を満たさなければFail/Blockedとし、再実行で中断記録を消さない。対象外はdeploy、実運用、DB接続、OAuth/AI、Sentry実送信/ソースマップuploadの疎通。PB成功をPhase 11の本番稼働保証に拡張しない。今回はbuildを実行しない。

## Remaining work by priority

### P0 / Source表示防御と375px overlap、build/env安全計画

- **順位:**
  P0
- **作業:**
  Source表示防御と375px overlap、build/env安全計画
- **終了時の成果 / 依存:**
  PR #9の入力制限だけで既存URL表示は安全にならない。Research Sources/SupportingとAI citationのHTTP(S)表示allowlist・非リンク表示はPR #13の作業差分で実装し、offline rendererで確認した（下記追記）。
  DB既存値監査は別承認。overlapはA/Rのblocking defectとして追跡

### P1 / U/V/AZ/Eの証拠対応、I offline不足、AI採点・version固定

- **順位:**
  P1
- **作業:**
  U/V/AZ/Eの証拠対応、I offline不足、AI採点・version固定
- **終了時の成果 / 依存:**
  既存caseの再利用表、必要な追加caseだけのdiff、範囲ごとの合否。実サービス待ちのない作業から進める

### P1 / Demo A/R補完とnative200%結果、DB/実Chatの設計

- **順位:**
  P1
- **作業:**
  Demo A/R補完とnative200%結果、DB/実Chatの設計
- **終了時の成果 / 依存:**
  4詳細×3幅・zoom/keyboardの結果、未解決修正。DB transaction/競合・非C2 Chat harnessの仕様と承認対象を固定

### P2 / PBの安全な再build

- **順位:**
  P2
- **作業:**
  PBの安全な再build
- **終了時の成果 / 依存:**
  完全artifactと隔離証拠。Eのproduction-mode確認の前提

### P2 / 実DB整合性/rollback/競合

- **順位:**
  P2
- **作業:**
  実DB整合性/rollback/競合
- **終了時の成果 / 依存:**
  DB不変条件を満たす。発見したraceは実装PRで修正後に同じcaseを再確認

### P2 / I/E runtime、SaaS R、AI-B/AI-C

- **順位:**
  P2
- **作業:**
  I/E runtime、SaaS R、AI-B/AI-C
- **終了時の成果 / 依存:**
  各承認後にbounded実行。AI-BはDB不要なのでrubric・予算確定後に独立してよい。AI-CはDB/Iと通常SaaS実行環境に依存

## Required safety gates

この文書・過去の許可・PRのマージは新しい実行許可を与えない。以下は**将来の実行直前**に対象、操作、通信先、上限、停止/cleanup、証拠の扱いを具体化し、必要な明示許可を得るためのgateである。今回許可を求めたり実行したりしない。

### Offline

- **必要条件・承認単位:**
  script import/設定ロードの副作用、pnpm自動依存検証、子processとネットワーク境界を確認。synthetic値だけでSDK/DB/Cloud境界をmock
- **拒否・停止と終了条件:**
  予期せぬ通信やreal credential読込は停止。EPERMなら実行なしとして記録し、勝手に別環境へ拡大しない

### 実DB

- **必要条件・承認単位:**
  **read-onlyも含め明示許可**。host/port5433/database/role、実サーバー/コンテナー同一性、schema revisionを別々に確認。URL guardだけでidentityを証明しない。
  別manifest/使い捨てDB、接続数/timeout/操作範囲を固定
- **拒否・停止と終了条件:**
  migration/schema準備、insert/update/delete、cleanupを各許可に含める。既存C28件・実User/Account/Sessionと本番/開発DBは保護。曖昧target、所有権不明、
  cleanup失敗は停止し再試行しない

### C2 / Session / OAuth

- **必要条件・承認単位:**
  server起動、fixture verify/write、Route B Session create/use/revoke、browser run、Google OAuthは**別操作として明示許可**。Route
  BはGoogleログイン検証ではない。最小app cookieをprivate/ignored stateに保存し録画・trace・raw errorを残さない
- **拒否・停止と終了条件:**
  fixture前後8件、Session exact revoke、state不存在を確認。60分cookieでもAuth.jsによるDB期限更新があり明示revoke必須。旧許可を再利用しない。OAuthは今の限定EE判定に不要

### 実AI / rate-limit

- **必要条件・承認単位:**
  provider/model、syntheticデータ、prompt/rubric、18回答等の呼出数・token/費用上限・timeout・retry上限・保存先を事前承認。
  AI-CのDB/Redis等は接続先・書込・cleanupを別記
- **拒否・停止と終了条件:**
  privateデータ・secretのprovider送信禁止、上限/予期せぬ外部先/未承認retryで停止。Groq追加比較は別予算。Upstash/Inngest Cloud/Sentryをついでに起動しない

### Browser / Public Demo

- **必要条件・承認単位:**
  read-only GET対象、non-GET/外部遷移拒否、target identity、記録範囲を確認。SaaSは別隔離targetでsynthetic値を使い、実form submitはIの許可範囲内だけ
- **拒否・停止と終了条件:**
  公開サービスへmutation/OAuth/AIなし。private Sessionやpage dataをcaptureしない。viewport変更を物理端末検証と表記しない

### Build / production-mode error確認

- **必要条件・承認単位:**
  PBのclean copy・fresh env・Sentry plugin env除外・fontだけのnetwork・resource/時間上限を承認。元envを移動/削除せず、通常/C2同時起動しない
- **拒否・停止と終了条件:**
  許可外サービス通信/secret混入/上限超過は対象processだけ停止しinconclusive記録。production-mode error確認は合成dataと外部mockで、実DB停止やSentry送信を誘発しない

C2で外部サービスが止まること、通常SaaS/DemoでDSN設定時のSentry送信があり得ることは別である。実Sentry配送・redaction・dedup、Inngest Cloud、Upstash実通信の確認が必要になれば独立scopeで承認し、capture mock・mode guardをその実績に読み替えない。

## Known deferred risks

- 保存済みの不許可Source URLは入力制限で修復されない。PR #13の作業差分ではSource/Supporting/AI panelにHTTP(S)表示allowlistを適用し、不許可値は非リンク表示とした。実DBの既存値・実browserでのexploitabilityは未確認。データ監査/修復は別承認とする。SSRF/hostname/private-IP遮断は入力・表示のHTTP(S) policyとは別要求。
- raw streamは保存allowlistでfilterされず、History復元後とtext/引用が異なり得る。引用だけの出力はvalidation後に空で保存され得る。未解決のまま意味品質・正常会話の合格にしない。
- last ADMINのread/count→update、認可とmutationの間の競合、index lock/rollback、scalar attributionの孤立はmockで実保証できない。DB gate完了までproduction競合安全性を主張しない。
- C2 preflightはDBコンテナーidentity・egress全監査ではない。OAuth自動化の失敗歴、probeの制限、Route Bのrefresh/revoke caveatを保つ。EE完了を根拠に再ログインやSession操作を行わない。
- A/Rは限定scope。375px overlapは未解決のblocking defect。DのChrome200%部分報告、light themeの5色sampleだけでは全page/reflow/支援技術の適合を証明しない。
- Sentryの任意例外・extras・breadcrumbのredaction、実配送、Cloud署名交換、実provider障害と長会話/大量データ/負荷/複数browserは未検証。今回定義した限定gateの外に残し、公開SaaS全体の品質保証と表現しない。
- PR #5の通常buildが読んだenvによる外部副作用は不明。隔離runのsecret scanを通常buildへ流用できない。pnpm依存再現性、copy/junction/resource問題は後続PBの前提。

## Recommended follow-up PR sequence

1. **表示境界の修正:** SourceリンクのHTTP(S)表示防御（保存値は変更しない）はPR #13の作業差分とoffline rendererで対応。375px sticky header overlapは別PRで修正し、必要なDemo回帰だけ実行する。
2. **Offline証拠と不足の整理:** U/Iのchunker・context/selection、V/AZの対応表とread入口、Eの未対応caller/stream契約、AI-Aの採点/version固定。既存assertionで足りる項目は結果と限界だけ記録し、完了候補は別PRで判定する。
3. **Demo A/R:** 全詳細の狭幅・keyboard・native zoom/spacingを共同で検証し、結果表とblocking defect解消を提示する。既存14ケースを維持し、同じassertionを複製しない。
4. **隔離build:** PB前提を具体化し許可後に通常production buildを再検証。exit0/完全artifact/安全証拠が揃ってからPBを判定する。
5. **DB整合性と競合:** 使い捨てtarget・manifest・期待不変条件をレビューし、明示許可後にDB gateを実行。失敗は最小修正PR→同caseの再検証へ回す。
6. **通常SaaSのI/EとR:** 安全なHTTP/Chat stub harness、production-mode合成error・browser回復、form/AI breakpointを検証。C2のサービス拒否は維持する。
7. **承認済みAI品質:** AI-Bは2の採点固定後に独立して実施可。AI-Cは5/6と接続・セッション・予算承認後。全失敗と設定を残し、18回答だけで一般的なモデル信頼度を主張しない。
8. **完了判定PR:** 11行のPass/Fail/Not run/Blocked、残るdeferred risk、証拠帰属と対象commitを再確認し、条件を満たす行だけチェック更新する。限定EEの既存チェックは維持する。

## This PR verification

今回の検証は静的な文書整合確認に限定した。

- `git diff --check` は成功。新規未追跡ファイルも `git diff --no-index --check -- /dev/null docs/planning/phase10-quality-acceptance.md` でwhitespace診断なし（exit 1は追加差分の存在を表す）。LF→CRLFのGit通知はwhitespace違反ではない。
- 相対ファイルリンクの存在、新文書へのroadmapリンク、受入表11行、Phase 10チェック11件のHEADとの完全一致を確認した。完了はE2Eの1件のみ。
- roadmapから今回の2行の挿入だけを除いた内容のSHA-256は開始時と一致し、既存未コミット差分・PR #1〜#9の詳細記録を保持している。その他の追跡文書に差分はない。
- statusはroadmap変更と新文書の未追跡追加のみ。通常の `git diff --stat` は既存roadmap差分も含み、新文書は含まないため、追加ファイルのstatを別に示す。

テスト、tsc、lint、build、browser、DB、OAuth/Session、実AI、Cloud通信は今回実行していない。過去の1,287件成功と今回の静的検証は別結果である。commit・push・PR作成も行わない。

## PR #13 follow-up — Source URL render guard (2026-10-19 JST)

この追記は上記の文書作成時の記録と区別した、未コミットの実装・offline検証記録である。開始時は `fix/source-url-render-guard` / `6efd253` / clean。リモートmainを取得し、PR #12後の手動更新を含む最新 `b235390` へfast-forwardしてから実装した。`.vscode/settings.json` と `roadmap.md` は今回変更していない。Phase 10のチェック状態は維持する。

- 共通関数 `src/lib/source-url.ts` の `safeSourceHref(unknown)` は、baseなしのWHATWG `URL`で解析し、protocolが `http:` / `https:` のときだけ正規化済み `URL.href` を返す。それ以外・非文字列・解析失敗は `null`。scheme/hostの大小文字、default port、末尾slash、空白・escapeなどは標準URLの正規化に従う。保存値と画面のURL文字列は変更せず、リンク先だけ正規化する。localhost/loopback/private IPを遮断する仕様ではなく、取得・疎通確認・SSRF対策は行わない。
- Research詳細のSourceカードとFinding Supporting sourcesは共通判定を使用する。不許可でもカード・タイトル・保存URL・日時・Findingとの関連を残し、編集/削除/関連解除controlは維持する。共通Research表示を使うPublic Demoにも適用され、既存HTTPSリンクとread-only境界を維持する。
- AIのSupporting sourcesだけを `ResearchAiSupportingSources` に切り出し、live/履歴復元の両方が通る表示境界に同じ判定を適用する。不許可はSourceタイトルのテキスト表示。本文、citation解析/照合、conversation保存/復元、通信・AI呼出条件は変更しない。
- Offline回帰はURL関数34件（HTTP(S)/localhost/大小混在/正規化9、拒否文字列17、非文字列8）、Research renderer16件、AI renderer16件、Demo追加3件、認証済み詳細追加1件の計70件。AI rendererには復元APIと同じSource shapeを渡し、許可/不許可混在とfetch未実行を確認した。実際の履歴UI操作やChat API通信を再現したものではない。
- 初回restricted Vitestはesbuild `spawn EPERM`でテスト実行前に停止。同じoffline scopeを承認済みの子process起動可能環境で実行した。追加Demoテストのlayoutリンク数の誤った期待値3件と、非文字列テーブルのTypeScript推論エラーを修正した。過去のPR #12の60ファイル/1,325件成功は比較用の既存実績であり、今回の実行結果ではない。
- 最終実行: Node.js **24.16.0** / pnpm **12.9.1**。`pnpm test --run` は **63ファイル / 1,395件成功**（70件追加）、`pnpm exec tsc --noEmit` と `pnpm lint` はexit **0**。`git diff --check` はexit **0**。新規未追跡5ファイルも `git diff --no-index --check` でwhitespace診断なし（exit 1は追加差分の存在）。依存関係・設定・packageManagerは変更していない。
- 実DB、保存値修復、migration/seed、認可変更、実Session/OAuth、実AI/embedding、Sentry/Upstash/Inngest Cloud通信、外部Source URL接続検査、server/browser E2E、production build、deployは対象外。raw streamと保存後citationの差、DB競合、375px overlap等の既知リスクも未対応のまま。commit/push/PR作成は行わない。

## PR #14 follow-up — 375px sticky header focus overlap (2026-10-19 JST)

開始時は `fix/demo-375px-focus-overlap` / `538d2f8de2bba64af5e6a033be6785cf82b05860` / clean。以下は今回の実装・offline検証記録であり、PR #3のブラウザ観測やPR #13の実績とは区別する。実装と回帰テストの準備は完了したが、実ブラウザでの解消確認は **Not run**。既知のblocking defectの解消判定、A / Accessibility review、R / Responsive UI reviewおよびroadmapのチェック状態は変更しない。PR #3の歴史的記録も変更しない。

- **既知の問題（過去の観測）:** PR #3では375pxのShift+TabでSourceリンクの一部がsticky headerの背後に入り、残りは見えていた。既存 `expectExposedKeyboardFocus` は複数点のいずれかが露出すれば成功するため、部分重なりを検出しない。過去の成功を「重なりなし」と読み替えない。今回、新たなブラウザ観測は行っていない。
- **静的に確認した構造と推定原因:** Demo headerは `sticky top-0`、内容は `flex-wrap`。詳細ページには独立したscroll containerがなく、root viewportがスクロール対象となる構造。対象リンクにもrootにも `scroll-margin-top` / `scroll-padding-top` はなかった。Sourceカードのリンクはタイトル・URL preview・更新日時を含むflex itemで、カード外周ではない。Supporting sourcesも文字リンクをflex親に置くため、長いタイトルはその幅内で折り返す。outlineを取り除くクラスはなく、過去のブラウザ記録はnative auto outline / computed 1px / shadowなし。ブラウザのfocus自動スクロールがsticky headerの占有領域を考慮せず、下のリンクから戻るShift+Tabで上端に寄せた対象を覆うことが推定原因。Tabとの実際のスクロール量・折り返し後の高さ・focus paintの実測は承認後に確認する。
- **最小修正:** `src/app/demo/research/[researchId]/page.tsx` の `main` に `[&_a]:scroll-mt-24 sm:[&_a]:scroll-mt-16` を追加。Sources、Supporting sources、BackにDemo詳細限定のscroll marginを設定し、共有 `ResearchDetailContent` と通常SaaSには変更しない。sticky、focus indicator、DOM / Tab順序、Source URLガード、認可・read-only境界は維持する。
- **値の根拠と候補比較:** 標準16px root / 現在の行高から、375pxで2行なら24px + 12px gap + 20px + 上下padding24px + border1px = 約81px、1行なら24 + 24 + 1 = 約49pxと算出する（実測ではない）。6rem = 96px / sm以上4rem = 64pxは各々15pxの余裕を含み、回帰判定で確保する最低4pxのoutline領域も含む。scroll marginは通常のレイアウト寸法や空白を増やさない。rootのscroll paddingはスクロール対象に設定する必要があり、`main` に設定してもこの構造では効かない。rootへのDemo条件付きCSSや動的header計測を追加するより、既存Demo詳細から対象anchorへ適用する方法を選んだ。固定値が任意のzoom / text spacing / 3行以上のheaderを保証するものではない。
- **375pxの回帰強化:** `e2e/public-demo.spec.ts` の既存14件と3幅のkeyboardケースを維持。`expectTabReachable` に逆方向指定を追加し、既存Tab / Shift+Tabの順序に沿って全Sources / Supporting sourcesを検査する。既存逆順loopで対象外だった末尾Supporting Sourceも、Tabで一度末尾を出てShift+Tabで戻る確認を追加。`locator.focus()`、`scrollIntoViewIfNeeded()`、手動scrollを新判定に使用しない。
- **部分重なりのassertion:** 既存の部分露出・focus判定を残したうえで、375pxだけ `expectUnobscuredSourceFocus` を追加。実際のbanner bounding boxと対象の全非空 `getClientRects()` を取得し、全fragmentについて `top - outlineExtent >= header.bottom`、`bottom + outlineExtent <= viewport.height`、左右もoutline込みでviewport内であることを要求する。focused / `:focus-visible` / outlineの存在も要求。`outlineExtent` は最低4 CSS pxとcomputed outline幅 + offsetの大きい方で、auto outlineの描画差に余裕を取る保守的な検査。これは重なりの許容誤差ではなく、**部分重なりの許容は0px**。shadowへの変更時は明示的に失敗させ、indicator境界の検査を見直す。知覚的なfocus contrastを証明する検査ではない。ページの横overflow、URL不変、popupなしも確認する。
- **実行時の通信防御:** 既存browser non-GET拒否を維持し、承認対象baseURLと異なるoriginの通信も拒否するよう `beforeEach` を強化。外部Sourceはhref / targetの属性確認とfocus移動のみで、Enter / clickを行わない。Playwright設定の公開URL既定値は変更していないため、将来の実行でも明示した `E2E_BASE_URL` が必須。APIRequestによるGET preflight / 既存GETケースとredirect先のidentity確認は別途必要で、このbrowser routeだけで全通信の監査済みとはしない。
- **今回実行したoffline検証:** Node.js **24.16.0** / pnpm **12.9.1**。初回 `pnpm test --run` はconfig読込時にesbuild `spawn EPERM`で起動失敗（テスト失敗ではなく、テスト未実行）。同一コマンドを承認済みの子process起動可能環境で再実行し、**63ファイル / 1,395件成功、exit 0**。`pnpm exec tsc --noEmit`、`pnpm lint`、`git diff --check` は **exit 0**。PR #13の63ファイル / 1,395件は比較用の過去実績で、上記は今回の再実行結果。新たなofflineテストや依存更新は加えていない。C2名のVitestもoffline/mock検査であり、実C2接続ではない。
- **幅別の影響・未確認:** 375×812は96px、768×1024 / 1280×720は64pxのscroll marginのみ変更。幅・padding・カード配置は維持する設計。768px / desktopの既存ケースは維持するが、今回3幅ともブラウザ未実行であり、横scrollなし・重なり解消・実際のfocus描画は未確認。全4詳細の狭幅、native zoom / text spacing、他browserもこの変更だけで完了しない。

### 承認待ちのブラウザ手順（未実行）

実行前に、(1)この差分を含む接続先の完全URLと配備commit / artifact identity（未コミット差分を配備済みと扱わない）、(2)Public Demo read-onlyでありGET以外を拒否しOAuth / AI / mutationを行わない境界、(3)外部Source / Source codeへ遷移しないこと、(4)取得・記録を公開Demoの表示内容・URL / HTTP status・viewport / bounding box / computed focus情報・匿名化した実行結果に限定すること、(5)以下のコマンドと既存14件全体を対象とすること、を別途明示承認する。trace / screenshot / video / Session stateの取得は行わない。未承認のserver起動や配備はこの手順に含めない。配備identityまたはread-only境界が確認できなければ停止する。

承認後のみ、PowerShellで明示URLを指定し、既存設定の公開URLへfallbackさせずに実行する（下記は手順例で、今回は未実行）:

```powershell
$env:E2E_BASE_URL = 'https://<approved-host-containing-this-diff>'
pnpm exec playwright test e2e/public-demo.spec.ts --project=chromium --trace=off
```

375pxで両方向の全対象focusを確認し、768px / 1280pxを含む14件のPass / Failと対象identityを新しい記録に残す。必要に応じて実測header高・auto-scroll位置を使いCSS値を再検討する。静的検証とVitest成功だけで375pxの問題を解消済みとは判定しない。今回、ブラウザ / server / production build / deploy、実DB / migration / seed、OAuth / 実Session、実AI / embedding / Cloud接続、commit / push / PR作成は行っていない。

### PR #14 failure investigation / verified Preview regression (2026-10-19 JST)

上記の未実行記録に続く別の調査・実行記録。実行者はCodex。開始時は同じ `fix/demo-375px-focus-overlap`、HEAD `cf59f67a0013fc15164924fffaac89d56615753f`、clean。今回は接続先identityとGET read-only境界の確認後、依頼されたブラウザ診断・回帰を実行した。過去のNot runやPR #3の部分露出記録は変更しない。

- **報告された失敗の帰属:** ユーザー報告の **12 passed / 1 failed / 1 not run** は、URLのない既存ログだけではPreviewの結果と特定できなかった。今回ユーザーから実行時の `E2E_BASE_URL=https://evidence-atlas-mu.vercel.app` と回答を得た。現プロセスに環境変数がないことは、過去の実行で既定URLを使った証拠ではない。
- **配備identity:** GitHubの[Preview deployment 7164615772](https://api.github.com/repos/morimotodev93/evidence-atlas/deployments/7164615772) / [success status](https://api.github.com/repos/morimotodev93/evidence-atlas/deployments/7164615772/statuses) は、commit `cf59f67a0013fc15164924fffaac89d56615753f` と `evidence-atlas-e1thk4j9t-morimotodev93.vercel.app` を対応付けている。一方、GitHub mainは `538d2f8de2bba64af5e6a033be6785cf82b05860`。[Production deployment 7164420687](https://api.github.com/repos/morimotodev93/evidence-atlas/deployments/7164420687) / [status](https://api.github.com/repos/morimotodev93/evidence-atlas/deployments/7164420687/statuses) のhostは `evidence-atlas-72u1svc3z-morimotodev93.vercel.app`。申告された公開aliasとこのProductionの `/demo` が参照するNext static asset一覧のSHA-256は同一 `21b5a8ccbce510cee5cf5b537512bf24933846f7897614236fcd8679b5036290`、Previewとは異なる。現在の公開aliasがProductionと同じ配信artifactを参照する証拠であり、過去の実行時点のalias割当やruntime commitを直接取得した証拠ではない。詳細HTMLでも公開aliasにはscroll marginクラスがなく、PreviewにはPR #14のクラスが存在した。
- **安全確認:** ブラウザ起動前に対象GETでrootの307→`/demo`、Demoの200とread-only / Workspace表示、`/research`・`/api/auth/session`・`/api/inngest` の404を確認した。ブラウザは既存context routeでnon-GETと別originを拒否し、service worker無効。外部Source / Source codeへ遷移せず、trace / screenshot / video / cookie / Session stateを取得しない。記録は公開タイトル、host、CSS / rect / scroll値、HTTP status、実行結果に限定。server / build / deploy / 実DB接続 / OAuth / 実AI / Cloud操作は行っていない。
- **今回の変更:** CSSは変更しない。`e2e/public-demo.spec.ts` は明示的な `E2E_BASE_URL` を必須にしてhostをログ出力し、`E2E_FOCUS_DIAGNOSTICS=1` のときだけ375px外部Source対象の実Tab / Shift+Tab前後にread-only snapshotを記録する。対象kind、scroll container、computed margin / root padding、header / link rect、outline / shadow、focus状態を含む。実際のキー操作は維持し、`focus()`、強制scroll、0px重なり条件や4px確保条件の変更はない。今回の調査用変更はE2Eとこの追記だけで、配備されたUIは `cf59f67` のまま。

**実ブラウザ観測（375×812、全対象のmarginは各hostで同じ）:**

| 対象 / 操作 | computed margin / root padding | header下端 | scrollY 前→後 | link top 前→後 | focus後rect / outline | 判定 |
| --- | --- | --- | --- | --- | --- | --- |
| 公開alias、同名Supporting sourceへShift+Tab（今回の再現失敗箇所） | 0px / auto | 81px | 1475→1475 | 78→78px | left33 / right342 / bottom118px、auto 1px・offset1px、shadowなし | top−4 = 74px < 81px、7px不足でFail |
| Preview、最初のSourceカードへTab | 96px / auto | 81px | 0→0 | 688→688px | left33 / right342 / bottom808px、auto 1px・offset1px、shadowなし | top−4 = 684px、bottom＋4 = 812pxでPass |
| Preview、最初のSourceカードへShift+Tab | 96px / auto | 81px | 758→592 | −70→96px | left33 / right342 / bottom216px、auto 1px・offset1px、shadowなし | top−4 = 92px ≥ 81pxでPass |
| Preview、Stack OverflowのSourceカードへShift+Tab | 96px / auto | 81px | 929→924 | 91→96px | auto 1px・offset1px、shadowなし | 5pxの自動scrollでmargin適用、Pass |

元の失敗メッセージのタイトルはSourceカードと複数のSupporting sourcesで共通し、タイトルだけでは要素を一意にできない。今回の公開alias再現はSupporting sourceで最初に失敗したため、元のログを「最初のSourceカードの失敗」と断定しない。Previewの全Sources / Supporting sourcesは両方向とも厳密判定を通過した。

**原因とCSS判断:** 公開aliasで今回観測した7px不足は、PR #14のmarginが適用されていない配信内容で再現した。Previewでは `scroll-mt-24` がcomputed 96pxになり、実際のShift+Tabによる再配置も確認できた。scroll containerはHTML、sticky headerはtop0 / height81px、rootのscroll paddingはauto。Previewはこのままで合格するため、margin増量・scroll padding追加は根拠がなく行わない。余白があっても毎回scrollするわけではなく、最初のカードへのTabや、top126pxのSupporting sourceへのShift+TabではscrollYが変わらなかった（どちらも安全な位置でPass）。公開aliasのtop78pxはレイアウトviewport内にあるためscrollYが変わらず、stickyによる遮蔽は残った。これは今回のChromiumでの観測で、任意のscroll履歴・zoom・browserについて再配置を保証する結論ではない。

**実行結果:**

- 初回restricted Preview実行はworkerの `spawn EPERM` で起動失敗し、ブラウザテストは未実行。同一対象・コマンドを子process起動可能な承認済み環境で実行した。
- Preview、375px accessibility 1件: **1 passed**。続けて同じPreviewで既存Public Demo全体: **14 passed**（375×812 / 768×1024 / 1280×720の既存ケースを含む）。テスト判定を緩めていない。公開aliasの375px比較診断: **1 failed**、expected ≥81 / actual74を再現。これらはユーザー報告の12/1/1とは別の今回の実行結果。
- `pnpm test --run`: **63ファイル / 1,395件成功**、`pnpm exec tsc --noEmit`、`pnpm lint`、`git diff --check`: **exit 0**。Node.js24.16.0 / pnpm12.9.1。Vitestはoffline/mock scopeで、実C2 / 実DB検証ではない。
- 調査ログはignored `test-results/pr14-preview-investigation.log`、`pr14-preview-full.log`、`pr14-production-investigation.log` に分離して保存。元の失敗contextは保持した。公開aliasの失敗はPreviewでの375px修正不成立の証拠とは扱わない。Previewの代表詳細における問題解消確認であり、全詳細×全幅・native zoom / text spacing・他browserやPhase 10全体の合格ではない。A / Rチェック状態とroadmapは変更しない。commit / push / PR作成は行わない。

再現用コマンド（今回実行済み、接続先の配備identityを再実行時にも確認する）:

```powershell
$env:E2E_BASE_URL = 'https://evidence-atlas-e1thk4j9t-morimotodev93.vercel.app'
$env:E2E_FOCUS_DIAGNOSTICS = '1'
pnpm exec playwright test e2e/public-demo.spec.ts --project=chromium --grep 'Public Demo accessibility at 375px' --trace=off --output=test-results/pr14-preview-investigation
$env:E2E_FOCUS_DIAGNOSTICS = '0'
pnpm exec playwright test e2e/public-demo.spec.ts --project=chromium --trace=off --output=test-results/pr14-preview-full
```

## PR #15 follow-up — Public Demo narrow-viewport coverage (2026-10-19 JST)

この追記はPR #3 / #4 / #14の歴史的な観測・実行結果と区別した、Codexによるテスト追加とoffline検証の記録である。開始ブランチは `test/demo-narrow-viewport-coverage`、HEADは指定された `e5a6ad58c493c8a5978a5c3b098eb8e1537d635c`、`git status --short` は空（clean）。ローカルの `main` / `origin/main` も同じHEADだった。offline作業のためfetchやリモートの最新状態の再照会はしていない。Node.js **24.16.0** / pnpm **12.9.1**を使用し、packageManager・依存・設定は変更しない。

### 対象と既存証拠との関係

- **追加は6件:** Code Quality & Reliability、Developer Experience、Adoption & Organizational Impactの各詳細 × **375×812 / 768×1024**。Research IDは固定せず、`/demo` の該当タイトルの実リンクから取得する。
- **既存14件は保持:** desktopのroot/list/代表詳細/read-only/404/無効endpoint確認、追加3詳細のdesktop表示、375px / 768pxの一覧・Developer Productivity表示、1280px / 375px / 768pxの代表詳細keyboard確認。Developer Productivityの狭幅や追加3詳細のdesktopケースは重複追加しない。
- **過去のブラウザ証拠:** PR #14の確認済みPreviewは **14/14成功**、Vitestは **63ファイル / 1,395件成功**だった。PR #3の部分露出判定とPR #14の厳密な重なり判定の違いは上記の記録を維持する。PR #14のPreview host / deployment identityはPR #15の配備identityとして流用しない。
- **共通化:** 既存desktop3件の構造・本文確認を `expectResearchDetailLayout`、件数・空状態・外部リンク属性確認を `expectResearchDetailCounts` に抽出し、新規6件でも利用する。desktopのHTTP 200 / URL確認、click / Back、一覧復帰確認は残す。既存assertionは緩めず、main / h1の一意性、h2順序、Research説明文、件数表示のclipping、Supporting sourceタイトルの全文検査を追加する。

### 追加したassertionと受入条件

1. **遷移・構造:** `/demo` の選択リンクへ実Tabで到達し、隣接する前のResearchとのShift+Tab / Tab順序も確認してEnterで開く。実hrefに一致するURL、単一main / h1、選択タイトル、他Researchのh1不在、Conclusion / Sources / Findings / Discussionの順序と存在を要求する。Backのhrefは `/demo`、Enterで一覧へ戻り4タイトルとリンク数を確認し、選んだResearchへ再びTabで到達できることを確認する。
2. **表示:** `expectResponsiveElement` と `expectNoHorizontalOverflow` を再利用し、main、詳細タイトル・説明、4セクション見出し、本文、Sourceタイトル、Supporting sourceタイトル、件数、空状態、必要リンクのviewport内配置・全文のclippingを検査する。一覧タイトルの既存ellipsisとSource URL previewの意図的なtruncateは許容する。Sourcesは表示h3数、Findings / Discussionは表示article数から件数を算出し、表示件数と一致させる。0件なら既存の `No sources yet.` / `No findings yet.` / `No discussion yet.` を要求し、非0件なら空状態の不在を要求する。固定の件数を捏造せず、空のSource / Supporting source一覧にリンクを要求しない。
3. **keyboard・focus:** 詳細ではheaderの2リンク→Back→全Source→全Supporting sourceを実Tabで順に検査し、末尾を含め逆順もShift+Tabで検査する。最初の到達には `expectTabReachable` を使い、隣接リンク間は1回のキー操作後にfocusedを要求して余分なtab stopを見逃さない。全対象に `:focus-visible`、outline / shadowのindicator、hit testによる露出を要求する。
4. **PR #14の厳密判定:** 新規6件では**両幅・両方向**の全Source / Supporting sourceに、変更していない `expectUnobscuredSourceFocus` を適用する。全非空fragmentについてoutlineを最低4 CSS px（computed幅＋offsetが大きければその値）確保し、上端が実header下端以上、下端・左右がviewport内、**部分重なりの許容0px**を要求する。focus検査中は手動scroll / `locator.focus()`を使わず、実keyboard auto-scrollを観測する。computed style / hit testだけで知覚的contrastの合格とはしない。
5. **外部遷移防止:** Source / Supporting sourceは非空accessible name、HTTP(S) href、`target="_blank"`だけを検査し、click / Enterしない。GitHubも開かない。focus往復後の詳細URL不変とpage数1を要求する。既存の明示的 `E2E_BASE_URL` 必須、Public Demo GET preflight、browser non-GET拒否・別origin拒否、service worker無効化を保持する。

### 今回実行したoffline検証

| コマンド | 今回の結果 |
| --- | --- |
| `pnpm exec playwright test e2e/public-demo.spec.ts --list` | exit 0、**20件列挙（既存14＋追加6）**。browser / preflightは実行しない |
| `pnpm test --run` | 初回はesbuild `spawn EPERM`でconfig読込中にexit 1、テスト未実行。同一コマンドを子process起動可能な承認済み環境で再実行し、**63ファイル / 1,395件成功、exit 0** |
| `pnpm exec tsc --noEmit` | exit 0 |
| `pnpm lint` | exit 0 |
| `git diff --check` | exit 0。GitのLF→CRLF通知のみでwhitespace違反なし |
| `git diff --stat` | E2E specと本追記の2ファイルのみ。アプリ本体・roadmap・Playwright設定は変更なし |
| `git status --short` | `M docs/planning/phase10-quality-acceptance.md`、`M e2e/public-demo.spec.ts` のみ |

今回のVitest結果はPR #14と件数が同じでも別の再実行結果であり、offline/mock scopeである。静的レンダリングやC2名のVitestを実ブラウザ・実C2成功として扱わない。`--list`の成功もブラウザ成功の証拠ではない。

### PR #15ブラウザ結果 — Not run

**今回のPlaywright実行状態: Pass 0 / Fail 0 / Not run 20（うち新規6）。** PR #15のPreview URL・deployment ID / status・配備commitとの対応は**未確認**。現在の `E2E_BASE_URL` は未設定。ブラウザ起動・HTTP preflightを行っておらず、新しいUI不具合の再現や修正完了は主張しない。

以下は別途承認されたブラウザ確認後に実測で埋める表。URL / 配備commit / 実行者 / Chromium version / 実行日時と、各行のPass / Fail、失敗時の操作・期待結果・実際の結果を併記する。

| Research | viewport | 遷移・構造・Back | 表示・件数・空状態 | Tab / Shift+Tab / focus | 総合 |
| --- | --- | --- | --- | --- | --- |
| Code Quality & Reliability | 375×812 | Not run | Not run | Not run | Not run |
| Developer Experience | 375×812 | Not run | Not run | Not run | Not run |
| Adoption & Organizational Impact | 375×812 | Not run | Not run | Not run | Not run |
| Code Quality & Reliability | 768×1024 | Not run | Not run | Not run | Not run |
| Developer Experience | 768×1024 | Not run | Not run | Not run | Not run |
| Adoption & Organizational Impact | 768×1024 | Not run | Not run | Not run | Not run |

実行前にPR #15固有のPreview URLと配備commit / deployment successとの対応、およびPublic Demoのread-only接続先を確認し、追加承認を得たうえでそのURLを明示的な `E2E_BASE_URL` に設定する必要がある。未設定・identity不明のまま実行せず、既定公開aliasやPR #14のPreviewを代用しない。安全境界を維持して既存14件を含む20件の結果を記録する。ブラウザで不具合が再現した場合だけページ・viewport・操作・期待/実際を残し、実装修正の規模と独立PRへの分割を評価する。

### 残る受入項目・停止状態

**Phase 10のチェックボックスと `roadmap.md` は変更しない。Accessibility review / Responsive UI reviewは未完了のまま。** 新規6件のブラウザ検証に加え、全5ページのnative Chrome 200% zoomの環境値・ページ別結果、text-only 200% / text spacing、focus / hover / sticky背景・metadata / tag等のcontrast、SaaS各画面の375px / 768px / desktopとChatの1023 / 1024px配置・keyboard確認が残る。screen reader・他browser・物理device等のdeferred riskも既存契約どおり残す。

今回はアプリ本体・PR #13のSource表示防御・PR #14のscroll margin / 厳密focus helper・通信境界に変更なし。server起動、実ブラウザ、実DB接続、migration / seed、OAuth / Session、実AI / embedding、Sentry / Upstash / Inngest Cloud通信、production build、deploy、commit / push / PR作成は行わず、未コミットのレビュー可能な状態で停止する。

## PR #15 follow-up — Bottom-edge keyboard focus clearance (2026-10-19 JST)

上記の「PR #15ブラウザ結果 — Not run」と結果表はテスト追加時点の履歴として保持する。以下は、その後の別実行についてユーザーから提供されたPreview実測（D）と、それを受けたCodexのoffline修正・検証の記録である。開始ブランチは `test/demo-narrow-viewport-coverage`、HEADは `910fe3d`、作業ツリーはclean。今回、外部接続・ブラウザ実行による独立確認は行っていない。

### 後続のPreview実測 — 375px追加3件すべてFail（修正前）

- **報告された接続先:** `https://evidence-atlas-git-test-demo-narrow-viewpo-46de39-morimotodev93.vercel.app`
- **報告された対象commit:** `910fe3d`。deployment ID / success statusとの対応は今回再照会していない。
- **実行環境・帰属:** Chromium実ブラウザ、375×812。報告提供者はユーザー。実行者、正確な実行日時・timezone、OS / Chromium version、キー方向・何番目のTabか、実ログartifactは未提供。これらを推測で補わない。

| Research | 失敗したSourceリンク | viewport下端 | focus後リンク下端 | outline確保条件 | 判定値 / 不足 | 総合 |
| --- | --- | --- | --- | --- | --- | --- |
| Code Quality & Reliability | NIST Secure Software Development Framework | 812px | 812px | 最低4px | 816px / 4px不足 | Fail |
| Developer Experience | Research: Quantifying GitHub Copilot's impact on developer productivity and happiness | 812px | 812px | 最低4px | 816px / 4px不足 | Fail |
| Adoption & Organizational Impact | DORA Research | 812px | 812px | 最低4px | 816px / 4px不足 | Fail |

共通のcomputed `scroll-margin-top` は **96px（適用確認済み）**、sticky header下端は **81px**。期待は各リンクの全非空fragmentとoutline余白がheaderより下かつviewport内に収まること。実際はリンク本体の下端がviewport下端に一致し、`812 + 4 = 816 > 812` で失敗した。報告された375px追加3件は **Pass 0 / Fail 3**。この報告だけで20件全体や768px追加3件、途中で到達しなかった操作の成否は確定しない。

### 原因候補と最小CSS修正

実測から、上端marginの未適用ではなく、keyboard auto-scrollがリンク本体をviewport内に収めても下端outline余白を確保していないことが原因候補となる。ただしChromium内部のscroll判断を今回独立して観測した結論ではない。

`src/app/demo/research/[researchId]/page.tsx` のmain配下リンクに `[&_a]:scroll-mb-2` を追加する。既存の `[&_a]:scroll-mt-24 sm:[&_a]:scroll-mt-16` は維持し、上端の96px / sm以上64pxというPR #14の防御を変更しない。下端8pxは現在の最低4px条件を上回る値として採用する。レイアウト用paddingやリンク構造、rootのscroll paddingは変更しない。

`e2e/public-demo.spec.ts` は変更不要。実Tab / Shift+Tab、`:focus-visible`、全fragmentの上端とsticky headerの比較、下端・左右のviewport内配置、最低4px（computed outlineが大きければその値）、部分重なり許容0px、横overflowなしのassertionをすべて維持する。`locator.focus()`への置換やfocus検査直前の強制scrollは追加しない。

### 今回のoffline検証（修正後）

実行者はCodex、Windows / Node.js **24.16.0** / pnpm **12.9.1**。packageManager・依存・設定は変更していない。

| コマンド | 今回の結果 |
| --- | --- |
| `pnpm exec playwright test e2e/public-demo.spec.ts --list` | exit 0、**20件列挙（既存14＋追加6）**。browser / HTTP preflightは未実行 |
| `pnpm test --run` | 初回はconfig読込時のesbuild `spawn EPERM`でexit 1、テスト未実行。同一コマンドを子process起動可能な承認済み環境で再実行し、**63ファイル / 1,395件成功、exit 0** |
| `pnpm exec tsc --noEmit` | exit 0 |
| `pnpm lint` | exit 0 |
| `git diff --check` | exit 0 |

`--list` は収集のみ。Vitestはoffline/mock scopeであり、これらはChromiumのkeyboard auto-scrollの証拠ではない。変更は本追記とDemo詳細ページのCSS / コメントのみで、E2E specは変更していない。

### 修正後ブラウザ結果 — Not run / Preview再実行手順

**修正後の実ブラウザ結果は未確認（Not run 20）。CSS追加だけで問題解消・受入完了とは判定しない。** server起動、Playwright実ブラウザ、build、deploy、外部接続は今回実行していない。Phase 10チェックボックス・roadmapは変更しない。

1. 別途承認後、修正差分を含むPreviewを用意し、その配備commit / deployment success / URLとPublic Demoのread-only接続先を確認する。上記hostは修正前の報告先であり、修正版が配備された証拠として流用しない。
2. 確認したURLを明示的に `E2E_BASE_URL` に設定し、下記の順に375px追加3件と既存14件を含む20件を実行する。既存preflight・GET同一origin制限・service worker無効化を維持し、Source / Source codeの外部リンクを開かない。
3. 実Tab / Shift+Tabによる全Source / Supporting sourceの往復で、computed `scroll-margin-bottom` が8px、上端marginが375pxで96pxであることと、各fragmentの上下左右＋outline最低4pxが収まることを確認する。既存diagnosticsはtop margin等を記録するがbottom marginは出力しないため、bottom marginのcomputed値は別のread-only style観測で記録する。手動scrollやfocus代入で合格させない。横overflowも確認する。
4. 配備identity、実行者・日時・timezone、OS / Chromium version、コマンド・exit、全件結果と失敗時のキー操作・rect / scroll値を別の実行記録に残す。診断と全体回帰は別実行として区別し、元のFail記録を保持する。

```powershell
# 別途承認・修正版Previewのidentity確認後にのみ実行（今回は未実行）
$env:E2E_BASE_URL = 'https://<verified-preview-host-containing-this-fix>'
$env:E2E_FOCUS_DIAGNOSTICS = '1'
pnpm exec playwright test e2e/public-demo.spec.ts --project=chromium --grep 'Public Demo additional details at 375px' --max-failures=0 --trace=off --output=test-results/pr15-bottom-edge-diagnostics
$env:E2E_FOCUS_DIAGNOSTICS = '0'
pnpm exec playwright test e2e/public-demo.spec.ts --project=chromium --max-failures=0 --trace=off --output=test-results/pr15-bottom-edge-full
```

`scroll-margin-bottom` が実keyboard focus移動で作用しない場合は、computed値とキー前後のscrollY / 全fragment rectを採取し、rootのscroll padding、実scroll containerと最大scroll位置、祖先のoverflow / clipping、Sourceカード・折返しinlineリンクの構造を調べる。その結果に基づき、root scroll padding（影響範囲が全ページに広がる）、スクロール可能領域の末尾余白（最大scroll位置の不足時）、リンク領域の構造変更（fragment / clippingが原因の場合）を理由付きの代替案として提示する。現時点では無効と判明していないため、これらの追加修正は行わない。

commit / push / PR作成は行わず、この2ファイルの未コミット差分をレビュー可能な状態で停止する。

## PR #15 final Preview results — 20/20 passed (2026-10-20 JST)

この追記は、上記の修正前Failおよび修正直後Not runに続く、修正版Previewでの別実行結果である。過去の記録・表はその時点の履歴として保持する。ブラウザ結果と配備情報は**ユーザー提供の実行結果（D）**であり、今回Codexがブラウザを再実行・外部照会して得た結果ではない。

### 対象identityと成功報告

- **PR / ブランチ:** #15 / `test/demo-narrow-viewport-coverage`。
- **検証対象commit（ユーザー提供）:** `964a0be8651dc46b700976de0d09a3926215a542`。今回のローカルHEADも同じcommitで、開始時の作業ツリーはclean。
- **Vercel Preview（ユーザー提供）:** `https://evidence-atlas-git-test-demo-narrow-viewpo-46de39-morimotodev93.vercel.app`。
- **Vercel deployment / status（ユーザー提供）:** `D8UVTzaNn5okuCnAwjj6VAjWvQh3` / **success**。URL・配備commit・deploymentの対応は今回リモートで再照会していない。

| 別実行 | 対象 | ユーザー提供の結果 |
| --- | --- | --- |
| 375px追加ケースの確認 | Code Quality & Reliability / Developer Experience / Adoption & Organizational Impact、375×812の追加3件 | **3 passed (40.7s)** |
| Public Demo全体回帰 | 同じ修正版Preview、既存14件＋追加6件（375×812 / 768×1024の追加3詳細を含む） | **20 passed (1.7m)** |

両実行とも修正版Previewを明示的に指定した手順で行ったとのユーザー報告である。3件の実行と全20件の実行は分けて記録し、23件の異なるケースがあるとは扱わない。正確な実行日時・timezone、実行者、OS / Chromium version、実際のコマンド全文・数値exit、修正後のcomputed style / rect / scroll値は今回確認できていないため補わない。本見出しの日付は記録日（JST）である。

### ローカルartifactとの照合と限界

Codexが今回read-onlyで確認した `test-results/pr15-bottom-fix/.last-run.json` と `test-results/pr15-full-964a0be/.last-run.json` は、どちらも `"status": "passed"` / `"failedTests": []` だった。各ディレクトリに残っていたのはこのJSONのみで、接続先ホスト、対象commit、テスト件数、所要時間は含まれていない。ローカルで確認した `test-results` のログ・JSON・テキスト、および `memo/a11y/review.log` に、今回のホストと3件 / 20件の成功を照合できる記載は見つからなかった。PR #14のログは別Previewの履歴であり流用しない。

したがって残存artifactの成功状態は確認できるが、ホスト・件数・時間および配備identityとの対応を独立に証明するものではない。これらの具体値は上記のユーザー提供結果に帰属させる。ignored artifactは変更・追加追跡していない。

### 修正前後と上下のフォーカス防御

- **修正前 `910fe3d`:** 375px追加3件は、NIST Secure Software Development Framework、Copilotの生産性・幸福度研究、DORA Researchの各SourceでFail。共通してリンク下端812px＋outline最低4px＝816pxとなり、viewport下端812pxに対して4px不足した。既存の上端 `scroll-margin-top: 96px` は適用済みだった。
- **PR #14の上端防御:** `[&_a]:scroll-mt-24 sm:[&_a]:scroll-mt-16` により、sticky headerと上端outlineのための余白（375pxで96px、sm以上64px）を指定する。
- **PR #15の下端防御 / 修正commit `964a0be`:** `[&_a]:scroll-mb-2` により `scroll-margin-bottom: 8px` を追加した。今回ローカルGit差分で追加を確認した。PR #14の上端指定は維持され、`910fe3d` から `964a0be` のE2E specに差分はない。8pxのcomputed値そのものを今回実ブラウザで再観測したわけではない。
- **修正後:** ユーザー提供結果では375px追加3件と同じPreviewの全20件が成功した。実Tab / Shift+Tab、`:focus-visible`、sticky headerとの非重複、全fragmentとoutline最低4pxのviewport内配置、部分重なり許容0px、横overflowなしという既存assertionを維持した範囲の成功報告として記録する。

### 残る受入項目と今回の変更範囲

**Phase 10 Accessibility review / Responsive UI review全体は引き続き未完了。** 今回のPublic Demo 20件成功を全体の受入完了へ拡張しない。全5ページのnative Chrome 200% zoomの環境値・ページ別結果、text-only 200% / text spacing、focus / hover / sticky背景・metadata / tag等のcontrast、通常SaaS各画面の375px / 768px / desktopおよびChatの1023 / 1024px配置・keyboard確認が残る。screen reader・他browser・物理device等の既存deferred riskも保持する。

今回の変更はこの品質受入文書への追記だけ。CSS・テストassertion・roadmap・Phase 10チェックボックスは変更しない。実ブラウザ・server起動・外部接続、実DB・OAuth・AI・Cloud、build・deployを実行せず、commit・push・PRマージを行わない。未コミットのレビュー可能な状態で停止する。

## PR #16 preparation — Public Demo zoom / text spacing (2026-10-20 JST)

開始時は `test/demo-zoom-text-spacing-review` / `15d5cb44d1a283a54fb1a6e28146c74381d09ea8` / clean、単一worktree。ローカルmainと一致するがfetchや外部照会はしていない。PR #4のnative Chrome部分報告とPR #14 / #15の履歴は保持し、上記PR #15のユーザー提供20/20成功を今回のブラウザ実行やnative zoom成功に読み替えない。

[Public Demo zoom / text spacing review](public-demo-zoom-text-spacing-review.md)に、全5ページのnative Windows Chromeメニュー200%、browser固有text-only 200%、一時CSS text spacing（line height 1.5 / paragraph spacing 2em / letter spacing 0.12em / word spacing 0.16em）を区別した手順・環境欄・ページ別結果表を追加した。ユーザー手動結果（D）とCodex offline結果（C）を別記録にし、全ブラウザ項目は **Not run**。表示されない空状態は未検証として残す。

既存20件のspec / helper / 安全境界は変更せず、追加テスト0件。今回の不足はブラウザUI設定・目視の証拠なので同じDOM assertionを複製しない。CSS上書きの検査案はnative zoom / text-only機能と同一視せず、実測した問題がないためアプリCSSも変更しない。A / Rは未完了、roadmapおよび全Phase 10チェック状態は変更しない。

今回のCodex offline検証（C）は`pnpm exec playwright test e2e/public-demo.spec.ts --list`が20件列挙・exit 0、`pnpm test --run`が63ファイル / 1,395件成功・exit 0、`pnpm exec tsc --noEmit` / `pnpm lint` / `git diff --check`がexit 0。Vitest初回はesbuild `spawn EPERM`でテスト開始前に停止し、同一コマンドを承認済みの子process起動可能な環境で再実行した。列挙はブラウザ成功ではなく、VitestのC2名テストもoffline / mock範囲。ブラウザ・外部Preview・server・実DB / OAuth / Session・AI / Cloud・production build / deployは未実行。変更はこの追記と新規レビュー文書のみ、commit / push / PR作成を行わずレビュー可能な未コミット状態で停止する。

## PR #17 — Native Chrome 200%ユーザー提供結果（記録日: 2026-10-20 JST）

開始時は `docs/demo-native-zoom-results` / `9c7127e242c3d70620aa038a9ab20a8cc46767d2` / clean、worktreeは `C:/Users/owner/Desktop/sm-dev/evidence-atlas` の1つ。ローカルmainも同じHEADで、PR #16のマージをローカル履歴で確認した。fetchやリモートの最新状態の照会はしていない。

PR #16マージ後に提供された**ユーザーの手動レビュー結果（D）**は、Windows 11 Home / Google Chrome 157 / Native Chrome 200%（ユーザー申告）で、Research一覧（`/demo`）、Developer Productivity、Code Quality & Reliability、Developer Experience、Adoption & Organizational Impactのページ別総合結果が **5 Pass / 0 Fail（ユーザー申告）**。Codex自身による今回のブラウザ操作・再実行・独立確認ではない。[レビュー文書のPR #17追記](public-demo-zoom-text-spacing-review.md#pr-17--native-chrome-200ユーザー提供結果記録日-2026-10-20-jst)に原文・環境情報・ページ別総合表を記録した。PR #15 / #16と過去のNot run記録はその時点の履歴として保持する。

原文の **「実行日:10:20」** は時刻か日付か明確でないため解釈せず、正確な実行日時・timezoneは未確認とする。本見出しの日付は文書記録日。Chromeの完全なversion / build、Windows build、対象URL / deployment SHA、window寸法、100% / 200%のviewport寸法、OS display scalingは未確認。Tab / Shift+Tab別結果、全Sourceリンクのfocus、その他各項目の詳細なPass / Fail・操作ログは未取得で、画像・動画の有無も未確認。ページ別総合Passをこれらの詳細項目の合格に展開しない。

**B1: Browser-specific text-only 200%、B2: Text spacing（line-height 1.5 / paragraph spacing 2em / letter spacing 0.12em / word spacing 0.16em）は未実施のまま。** 次回はPR #16で準備した既存手順・表を使う。Contrast / hover / sticky header追加確認、通常SaaSのResponsive検証、Chatの1023px / 1024px境界確認も未実施であり、**Accessibility review / Responsive UI reviewは引き続き未完了**。roadmapおよびPhase 10チェック状態は変更しない。

今回の変更はMarkdown文書2ファイルへの証拠追記のみ。既存Playwright 20件・Vitest・型検査・lintは今回再実行しておらず、過去の成功を今回の検証結果として扱わない。アプリCSS・Playwright・依存・roadmapは変更せず、ブラウザE2E・外部Previewアクセス・server起動・実DB / OAuth / Session・AI / Cloud・production build / deploy・commit / push / PR作成 / mergeは行わない。
