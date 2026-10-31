# PR #23 — Phase 10 Offline Quality Gates Review

実施日: 2026-10-22 (JST)、実行者: Codex (C)。ローカルの仕様・実装・assertionを照合した (S)。
Repository: `morimotodev93/evidence-atlas`。開始時に branch / HEAD / worktree / status を確認し、
`test/phase10-offline-quality-gates` / `8d4544de9b1c527f405d5da50cc3ab6f74bf2ef6` / 単一worktree /
clean に一致した。リモート照会はしていない。対象はこのHEADと下記の未コミット差分。

根拠は [受入条件](../planning/phase10-quality-acceptance.md) の U / I、V / AZ / E、Completion decision policy、
[現行roadmap](../planning/roadmap.md)、[V / AZレビュー](phase10-validation-authorization-review.md)。
受入文書の初期matrixにあるV / AZ「未完了」は過去の状態で、現行roadmapは両方チェック済み。
この時点差を報告し、過去記録・チェックボックスは変更しない。今回の `Partial` はユーザー指定の評価区分で、行全体の完了を意味しない。

| 対象・受入条件 | 既存証拠と今回の追加 | 現在の判断・完了に必要な残条件 |
| --- | --- | --- |
| U: 純粋policyの成功/拒否/境界、実chunkerの空白・ASCII/CJK・閾値・複数chunk・overlap・本文保持・終了性、対象suite exit 0 | 下表の既存assertionを再利用。`chunk-text.test.ts` **21件追加**、20成功・1失敗 | **Fail**。推定値の丸め誤差を再現。別途修正して再現テストとoffline回帰を成功させる必要がある |
| I: 実context/selection・prompt/validator/parser・guard→Actionと限定HTTPの成功/拒否/失敗状態 | context **6件**、retrieval selection **7件追加**。既存Chat/resolver/guardの結合を再利用。C3は75/75成功 | **Partial（offline gate Pass）**。通常SaaS隔離harnessによるHTTP/Server Action transportが **Not run**。全体回帰はUの1件でexit 1 |
| E: 代表callerのerror/status・無副作用・例外伝播、stream/abort、production responseと回復・秘密非露出 | 既存Chat/Research/Workspace/admin/onboarding/Global Error/Sentryを再利用。list/detail **4件**、Workspace fallback **1件**、onboarding read **1件追加** | **Partial**。direct-call代表障害はPass。実stream開始後のerror/abortとspinner/再操作、隔離production-modeのHTML/RSC/HTTP・browser回復が **Not run** |
| V: 保存入力契約をschema→Actionの正規化/限界/拒否/正常副作用/例外へ対応付ける | schema129件、11 Action71件、onboarding/roles/Demoを監査・再実行。V向け重複追加なし | **Pass維持（限定direct-call契約）**。既存チェックとの不整合なし。transport、duplicate keys、全File型方針、grapheme UXは既存の対象外 |
| AZ: route/callerと実guardの許可/拒否・scope・漏洩/副作用なし、mock guardを補完 | Research/Chat/Demo、real-guard Action、read20件・child13件・roles40件・switch4件を監査・再実行。AZ向け追加なし | **Pass維持（限定逐次契約）**。実transport・権限取消/last-ADMIN競合は別gate。現在のチェックを変更しない |

## Assertionと境界の対応

以下のファイル名は `src/lib/ai/`、authは `src/auth/`、workspaceは `src/workspace/` 配下。
テスト件数をcoverage率や実サービス成功の根拠にはしない。

| 条件 | 実関数・既存assertion / 追加assertion | Mock境界・未検証 |
| --- | --- | --- |
| U / 保存入力 | `src/types/research/validation.test.ts`: missing/null/blank/min/max−1/max/max+1、trim/newline、enum、HTTP(S)許可と他protocol拒否 | 実Zod。FormData transportやDB制約ではない |
| U / 引用・dataset | `source-citations.test.ts`: allowed/unknown/empty allowlist、重複・表記正規化・validate→parse。`ai-chat-dataset.test.ts`: 6固定caseのshapeとSource適格性、null Conclusion | 実純粋関数/JSON。dataset shapeはモデル品質の合格ではない |
| U / Demo・安全policy・CLI | `src/lib/deployment-mode.test.ts`: false系/true系・不明値の拒否。`src/lib/c2/{runtime-database,service-isolation,build-isolation,sentry-client-isolation}.test.ts`: target不整合/サービス拒否。`scripts/evaluation-cli-options.test.ts`: 正常option/unknown/provider/引数超過 | I/Oはダブルまたは純粋設定処理。C2/Playwright script単体テストは実E2Eではない |
| U / chunker（新規） | `chunk-text.test.ts`: 空/ASCII/日本語、2,303/2,304/2,305文字、CJK511/512/513文字、4つの長文fixtureの本文再構成・順序/進捗、全連続chunkの約96-token overlap、段落/句点・早い区切り、推定値 | 実`chunkText`/`estimateTokenCount`、mockなし。境界trimの空白以外の欠落を検査。有限fixtureの終了性であり、全Unicode・実tokenizer精度・性能保証ではない |
| I / context（新規） | `research-context.test.ts`: missing親ならnullで子を読まない。実`buildResearchContext`がResearch scope、linked/unlinked Source metadata、unsourced Finding、null/非null Conclusionを選択。Source本文/Comments/他Researchを除外。3段階のDB例外同一性 | `@/prisma/db`はfixture predicateを評価するダブル。include callbackも検査。認可はこの関数の責務ではなくcallerの実guard証拠で補完 |
| I / retrieval（新規） | `retrieve-workspace-context.selection.test.ts`: distance=0.35採用/0.350001除外、要求10/出力最大5、同type/id重複除外、同ResearchのCONCLUSION/RESEARCH区別、missing Finding/Research skip・補充なし、chunk本文と現在Source metadata、空候補、embedding/search/hydration失敗 | 実`retrieveWorkspaceContext`。embed/vector search/DB/Sentryはダブル。既存`retrieve-workspace-context.test.ts`のcount・秘密属性なしも保持 |
| I / Workspace scope | selection追加でsearchのWorkspace引数とResearch/Conclusion hydrationのWorkspace predicateを検査。既存`resolve-workspace-sources.test.ts`6件は混在2Workspace行に実predicateを適用、重複要求/unknown/orphan/foreignの除外とmetadataのみを確認 | Finding hydrationは`id + researchId`であり、Workspace制限は先行searchに依存。実`search-retrieval-chunks.ts`のWorkspace SQL predicateを静的照合したがSQL/pgvectorは未実行。Findingが独立にWorkspaceを再認可すると主張しない |
| I / Chat連携 | auth `chatRoutes.test.ts`: `passes ordered history...real context-built prompt`、`persists only Current and Retrieved Finding-linked...real validator`、`restores unchanged messages...first-seen AI citations`を再利用。現在Findingとretrieved FINDINGだけを引用allowlistに含める | 実route/prompt、選択caseで`vi.importActual`のvalidator/parser。context/retrieval/resolver/auth/guard/DB/rate-limit/model/SDKはmock。このroute suite単体を実context→HTTPの全鎖成功とは呼ばない |
| V / AZ | auth `inputValidationActions.test.ts`は実schema・User/Research/Workspace guard→11 Action、exact保存payload・拒否時no-write/index/redirect。`readAuthorizationAcceptance.test.ts`はoverview/list/onboarding/settingsと実accessible-Workspace選択。`childAuthorizationAcceptance.test.ts`はmissing子/異ResearchSource/関連pair。`memberRoleActions.test.ts`は独立scope ADMIN・逐次last-ADMIN・例外。`switchWorkspace.test.ts`は実guardとAction | auth・DB・cookie/navigation/cache・indexはmock。`researchActions`のUser guard、`researchCreateActions`のResearch guard、Chat guardのmockは上記実guard suitesと`requireUser`/Demo/read testsで補完。招待/高度権限やDB競合を合格へ追加しない |

## 代表障害の評価

| Caller / 失敗 | 期待と証拠 | 判断・限界 |
| --- | --- | --- |
| Chat入力/認証/認可/rate limit | 既存auth `chatRoutes`: 400/401/404/429とerror body、拒否前後のno-write/AIなし。予期しないauth/access/body readは同じ例外をthrow | Pass、direct-call Responseのみ |
| Conversation list/detail | 追加4件はlist DB read、detail親/Message/Source解決失敗を同一例外でthrowし、200の空配列/部分成功/404へ誤変換しない。write/AIなし | Pass。create失敗は既存の「201を返さない」を再利用 |
| Research / Workspace / admin / onboarding | 既存Research suitesはguard例外・拒否時no-write/index/redirect。`inputValidationActions`は11保存失敗のstate/throw。Workspace選択7件・switch4件の既存経路、rolesのactor/target/count例外・save error、onboarding transaction失敗を再利用。今回fallback/onboardingのaccessible-Workspace read失敗もthrow・副作用なしを追加 | Pass、代表direct-call。transaction呼出失敗は実rollbackの証明ではない |
| Context/retrieval/provider・保存途中 | 新規context/retrievalの合成例外。既存Chatのretrieval失敗はUSER保存前、SDK開始失敗はUSER/Conversation更新後、usage保存失敗はAI保存前、AI保存失敗はusage後でthrow。`length`/空の終了ではusageのみ記録しAI未保存 | Pass、SDK stubと`onFinish`手動呼出の範囲。USER/usageの部分保存をrollback済みとは扱わない。実SDKのerror/abort通知・wire stream・UI回復はNot run |
| Global Error / Sentry | `src/app/global-error.test.ts`2件: generic静的HTMLにmessage/stack/digestなし、effectのcapture引数は元error。`src/lib/observability/sentry-runtime.test.ts`12件: 3runtimeのDSN有無とdataCollection制限。config9件はtrace sample rateの境界 | Pass、SSR/effect/SDK mockのみ。`captureException(error)`/`captureRequestError(...args)`に任意例外を自動redactする独自処理はない。収集flagsだけでmessage/extras/breadcrumbの秘匿を保証しない。実送信/uploadは未実行・要件外 |

既知のcitation-only出力がvalidator後に空AI本文として保存されるケースは、既存Chatテストを保持した。
今回の新規不具合ではなく、raw streamと保存後引用の差とともに既存のAI品質/stream policyの残課題とする。

## 発見した不具合と再現

`estimateTokenCount("a".repeat(2304))`: 重み `1/3` の合計は数学上768だが、実測は **769**。
`src/lib/ai/chunk-text.ts` の反復浮動小数加算後の `Math.ceil` が端数誤差を切り上げる。
`chunk-text.test.ts` の `does not round an exact 768-token ASCII boundary up to 769` が失敗する再現テスト。
skip / expected-failure化、期待値の769への変更、アプリ修正はしていない。
同入力の `chunkText` は1chunkで、前後の2,303/2,305文字も期待する1/2chunk。本文欠落や非終了は今回のfixtureでは観測しなかった。
これはローカル推定値の境界不整合であり、実AIのtoken上限超過・料金・実tokenizer精度の不具合まで証明しない。
対応は別途アプリ修正と再現/回帰の成功確認。仕様を変更して許容する場合も、既存期待を黙って緩めず別の受入判断が必要。

## 実行証拠

Windows `10.0.26200.0` / Node `v24.16.0` / pnpm `12.9.1`（宣言通り）/ Vitest `3.2.7`。
2026-10-22 09:29以降 JST のローカル実行。pnpm installや新規依存追加なし。
Vitest設定は既存の `e2e/**` / `e2e-c2/**` / `build/**` 除外を維持し、テストは除外・削除していない。

| ID | コマンド / scope | 結果・exit code |
| --- | --- | --- |
| C0 | `pnpm exec vitest run src/lib/ai/retrieve-workspace-context.test.ts src/lib/ai/resolve-workspace-sources.test.ts src/auth/chatRoutes.test.ts src/workspace/requireCurrentWorkspace.test.ts src/workspace/switchWorkspace.test.ts src/app/global-error.test.ts src/lib/observability` | restricted環境はesbuild `spawn EPERM`、**exit 1 / Blocked（テスト未実行）**。同一コマンドをsubprocess起動可能環境で実行: **8 files / 92 passed、exit 0**（追加前） |
| C1 | `pnpm exec vitest run src/lib/ai/chunk-text.test.ts src/lib/ai/research-context.test.ts src/lib/ai/retrieve-workspace-context.selection.test.ts` | **3 files / 33 passed・1 failed、exit 1**。最初の不具合再現 |
| C2 | `pnpm exec vitest run src/lib/ai src/auth src/workspace src/types/research src/app/global-error.test.ts src/lib/observability` | **27 files / 628 passed・1 failed、exit 1**。V/AZ/代表Eを含む。失敗は上記Uのみ |
| C3 | `pnpm exec vitest run src/lib/ai/research-context.test.ts src/lib/ai/retrieve-workspace-context.selection.test.ts src/lib/ai/retrieve-workspace-context.test.ts src/lib/ai/resolve-workspace-sources.test.ts src/auth/chatRoutes.test.ts` | 最終fixture整合後 **5 files / 75 passed、exit 0**。I offline gate |
| C4 | `pnpm test --run` | **66 files（65 passed / 1 failed）、1,435 tests（1,434 passed / 1 failed）、exit 1**。失敗は上記Uのみ |
| C5 | `pnpm exec tsc --noEmit` | **exit 0** |
| C6 | `pnpm lint` | **exit 0、0 errors / 3 warnings**。既存ignored `test-results/pr22-retest/verify.mjs` の`format`、`test-results/pr22-verify.mjs` の`format`/`backgroundChains`未使用。今回変更外 |
| C7 | `git diff --check` | **exit 0** |

実行前にimport/ダブルを確認した。アプリのDB初期化はmockし、AI/Redis/Inngest send/Sentry等の通信はmockまたは呼出前拒否。
既存Inngest設定テストは実SDKの構築・mode確認だけでsendしない。C2/Playwright script単体テストはsynthetic query、request、browser、spawnのダブルを使う。
実subprocessを使う既存 `scripts/c2-app-target.test.ts` は一時ディレクトリの合成envを読むNodeだけで、サーバーを起動しない。
synthetic Session-shaped fixtureのテストは実Session発行・OAuthではない。
実DB・migration/seed、実AI/embedding、外部Preview、browser E2E、サーバー、production build、Vercel/Cloud操作は実行していない。
完全なpacket監査や実サービス障害の再現をしたとは主張しない。

## 差分とPR #23の完了候補

新規テスト3ファイル **34件**、既存3ファイルへの不足障害テスト **6件**、合計 **40件追加**。
既存テスト1,395件を削除・弱体化せず、アプリ/依存/設定/roadmapは変更しない。
変更は `src/lib/ai/{chunk-text,research-context,retrieve-workspace-context.selection}.test.ts`、
`src/auth/{chatRoutes,createInitialWorkspace}.test.ts`、`src/workspace/requireCurrentWorkspace.test.ts`、
本レビューと受入文書末尾の参照だけ。

**今回完了できるのはIのoffline subgateと代表caller障害の証拠補完・V/AZ整合性監査。**
Phase 10行全体として新たにチェック完了を提案できる項目はない。
Uは再現不具合、IはHTTP gate、Eはstream/abortとPB後のproduction-mode応答・browser回復gateが残る。
V/AZは既存の限定Passを維持。DB/HTTPの競合・rollback、実AI品質、実Sentry配送を検証済みへ読み替えない。
commit / push / PR作成 / mergeをせず、未コミットで停止する。

## PR #23 follow-up — Chunk Token Estimation Precision Fix（2026-10-22 JST）

上記Failは修正前の履歴として保持する。今回の開始状態も同じbranch / HEAD / 単一worktreeで、
未コミット差分は前回のテスト6ファイル・文書2ファイルだけだった。既存差分を保持した。
以下は09:40以降 JSTの修正・検証結果であり、上記C1/C2/C4の失敗を上書きしない。

**修正:** アプリ変更を `src/lib/ai/chunk-text.ts` だけに限定した。
`estimateTokenCount` / `findChunkEnd` / `findOverlapStart` の合計を6分の1 token単位の整数にし、
ASCII=2単位、非ASCII=9単位を加算する。推定値は最後に `Math.ceil(units / 6)`、
分割/overlap判定は `units >= 768 * 6` / `units >= 96 * 6`。
重み1/3・1.5、目標768・overlap96、`for...of` / index走査、trim、段落・句点優先、進捗保証の処理は維持した。
epsilon補正、依存追加、無関係なrefactorはない。

| 入力 | 推定値 修正前 → 修正後 | chunk文字数 修正前 → 修正後 |
| --- | --- | --- |
| ASCII 2,303文字 | 768 → 768 | `[2303]` → 同じ |
| ASCII 2,304文字 | **769 → 768** | `[2304]` → 同じ |
| ASCII 2,305文字 | 769 → 769 | `[2304, 290]` → `[2304, 289]` |
| 空文字 | 0 → 0 | `[]` → 同じ |
| 空白 `" \t\n "` | 2 → 2 | trim後 `[]` → 同じ |
| `界` × 512 | 768 → 768 | `[512]` → 同じ |
| `abc日本` × 192 | **769 → 768** | `[960]` → 同じ |

**分割への影響:** 修正前snapshotと修正後の実関数をofflineのNodeメモリ内比較で実行した（exit 0）。
生の日本語をPowerShell stdinへ渡した初回probeは文字コード変換が混入したため証拠に採用せず、
ASCIIだけのscriptからcode pointでUnicode fixtureを構築し、期待値assertion付きで再確認した。
長いASCII fixture（既存テストと同じ10,800文字）は6chunkのまま、各通常chunk長2,304は維持。
overlapが289文字から正確な288文字になり、開始offsetは `[0,2015,4030,6045,8060,10075]` から
`[0,2016,4032,6048,8064,10080]`、最終chunk長は725→720へ変わる。
CJK 2,400文字は6chunk、512文字単位/64文字overlapを含めて全chunk一致。
早い句点＋CJK fixtureも全chunk一致。`abc日本` × 600は4chunkのまま、通常長960、末尾483→480。
段落/句点fixtureは既存の短chunk反復も維持し、丸め補正に伴って579→578chunkとなる。
出力完全不変とは主張しない。変更は同じ重み・閾値の正確な判定によるもので、既存本文再構成/overlap/終了性テストは全成功した。

**別件の既存Unicode問題（今回未修正）:** `"aaaaa" + String.fromCodePoint(0x1f600).repeat(600)` の
先頭chunkは修正前後ともUTF-16長516で、末尾がhigh surrogate `0xd83d` になる。
推定関数の `for...of` はcode point、分割/overlapはindexでcode unitを数えるため、補助平面文字を分断できる。
snapshotと現行の両方で確認し、今回の整数化による新規不具合とは区別した。
修正には走査・slice境界の設計と専用回帰が必要で、ユーザー指定の今回の範囲外。
Uの有限ASCII/CJK契約はPassとするが、全Unicode安全性のPassには拡張せず、この問題を別の後続課題として残す。

既存40件を削除・弱体化せず保持した。chunkerには推定値2,303/2,305文字・混在閾値、
正確なASCII overlapの **4件だけ追加**（chunker 21→25件、前回追加40件＋今回4件＝44件）。
元の2,304文字再現assertionは `toBe(768)` のままで、skip/expected-failure化していない。
他のテスト5ファイルは開始時SHA-256と一致した。

| ID | 実行コマンド | ファイル数 / 成功 / 失敗 / exit code |
| --- | --- | --- |
| F0 修正前 | `pnpm exec vitest run src/lib/ai/chunk-text.test.ts` | **1 / 20 / 1 / exit 1**。2,304文字が769でFail |
| F1 修正後・最初の検証 | 同上 | **1 / 25 / 0 / exit 0**。元のFailと追加4件を含む |
| F2 全offline回帰 | `pnpm test --run` | **66 / 1,439 / 0 / exit 0**。既存1,395件＋前回40件＋今回4件 |
| F3 | `pnpm exec tsc --noEmit` | **exit 0** |
| F4 | `pnpm lint` | **exit 0、0 errors / 3 warnings**。上記C6と同じ既存ignoredファイル、今回変更外 |
| F5 | `git diff --check` | **exit 0**。LF→CRLFのGit通知のみ |

環境とoffline/mock境界は上記実行証拠と同じ。テスト・設定・依存の除外変更なし。
DB/OAuth/実Session、実AI/embedding、外部Preview、browser E2E、server/build、Cloud操作はしていない。

| 対象 | 修正後の受入状況 |
| --- | --- |
| Unit | **Pass / 有限契約の完了候補**。丸め不具合を修正し、実chunkerを含む全offline回帰成功。補助平面Unicode問題は上記の別課題 |
| Integration | **Partial（offline gate Pass維持）**。限定HTTP/Server Action transportはNot run |
| Error handling | **Partial維持**。stream/abort、PB後のproduction応答・browser回復はNot run |
| Validation / Authorization | **既存の限定Passとチェックを維持**。今回の変更は契約に影響しない |

今回手を加えたのはchunker本体、chunkerテスト、両レビュー文書の追記のみ。
前回差分を含む全変更は次の9ファイル。roadmap・チェックボックスは変更しない。

- `src/lib/ai/chunk-text.ts`
- `src/lib/ai/chunk-text.test.ts`
- `src/lib/ai/research-context.test.ts`
- `src/lib/ai/retrieve-workspace-context.selection.test.ts`
- `src/auth/chatRoutes.test.ts`
- `src/auth/createInitialWorkspace.test.ts`
- `src/workspace/requireCurrentWorkspace.test.ts`
- `docs/planning/phase10-offline-quality-gates-review.md`
- `docs/planning/phase10-quality-acceptance.md`

commit / push / PR作成 / mergeは行わず、未コミットで停止する。
