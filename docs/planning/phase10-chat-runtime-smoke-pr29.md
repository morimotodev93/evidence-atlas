# PR #29 — Chat Runtime Smoke Verification / Stage A

作成日: 2026-10-23 (JST)。対象Repository: `morimotodev93/evidence-atlas`。
**Stage Aは静的確認と検証計画のみ。Stage Bの実行許可はない。実測は全件Not runまたはBlocked。**

## 1. 目的と対象外

PR #28のChat B Limited Reliability Improvementsについて、既存の通常SaaSローカル環境で行う限定smokeの対象、期待結果、証拠、個別許可と停止境界を固定する。本書は実行許可・実測成功・Phase 10受入完了を意味しない。

今回の変更は本書1ファイルだけ。localhostへのHTTP、browser、OAuth/Session操作、実DB接続（SELECTを含む）、DB書込/削除/migration/seed、実AI/embedding、Redis/Upstash/Inngest/Sentry等の外部通信、build/deploy、依存・環境設定変更、commit/push/PR作成/mergeは行わない。テスト・SDK・アプリ・Prisma CLIも実行せず、コードや設定はテキストとして読む。

ChatAttempt/API v2/SSE/Stop/新たなretry・timeoutの実装、DB障害・provider障害・callback重複・並行POSTの注入、既存データ修復、意味的なAI品質評価、production-mode検証、C2の再検証は対象外。今回の「Stage A/B」は作業段階であり、PR #27の「A案/B案」とは別である。

## 2. Git revisionと環境情報

2026-10-22の開始時、および中断後の2026-10-23の再開時に、次の5コマンドをローカルで確認した。既存変更の破棄・stash・上書きはしていない。

| 確認 | 開始時・再開時の結果 |
| --- | --- |
| `git status --short --branch` | `## main...origin/main`、追跡差分・未追跡ファイルなし |
| `git branch --show-current` | `main` |
| `git rev-parse HEAD` | `fb4097dc00e631e8ac88d198a038a80bd6e9e34e` |
| `git rev-parse origin/main` | `fb4097dc00e631e8ac88d198a038a80bd6e9e34e` |
| `git worktree list` | `C:/Users/owner/Desktop/sm-dev/evidence-atlas`、上記revisionの1件のみ |

ローカル履歴のHEADはPR #28のmerge commitで、指定SHAに一致する。PR #28の実装commitは `0208d5063ccd1c8b8a88a3f4f62a78534e21c9a3`、merge前mainは `f3f2eebbc1001c2709234a64e571201662ba6f31`。fetch・GitHub照会はしておらず、`origin/main` はローカルの追跡refである。

| 項目 | 既知情報 / 未確認事項 |
| --- | --- |
| 通常SaaS origin | ユーザー指定の `http://localhost:3000`。応答・稼働process・提供中revisionは未確認 |
| 閲覧候補 | `/research/h8uo44a86ydzro3j7hl2c6pt`。存在・Workspace・所有/利用権限・内容は未確認 |
| 起動状態 | 通常ローカル環境とDBは起動済みとのユーザー報告。独立した実観測ではない |
| C2 | 別の隔離環境。port/DB/Session/fixture/設定・既存成功記録を流用しない。C2ではChat等が503になるため代用不可 |
| 設定経路 | 通常時のアプリDBとauth DBはともに `DATABASE_URL` を解決する。localhostというUI originだけではDBがローカル・非本番と証明できない |
| 静的バージョン | packageManagerは `pnpm@12.9.1`。ローカルpackageの読取では `ai@6.0.280`、`@ai-sdk/google@3.0.127`、`@prisma/orm-postgres@8.0.0-rc.12`、`next-auth@5.0.0-beta.32`、その `@auth/core@0.41.3` |
| 未取得 | runtimeのNode/pnpm/browser版、通常SaaSのmode、実効env、DB server/role/schema revision、各外部接続先・課金主体・有効設定 |

秘密値を含むdotenvファイルの内容やprocess環境の一覧は出力していない。アプリmoduleをimportせず、dotenv loaderも実行していない。Stage B前にコードSHAと稼働processの対応を別途確認する。再起動・build・設定変更が必要なら、この計画から自動的に実行へ進まない。

## 3. 根拠と静的確認結果

[調査方針](source-memo.md)に従い、リポジトリ内の一次資料とインストール済みpackageのソースを静的に確認した。外部仕様の現行性やモデルの提供状況を調べた結果ではない。

| 根拠 | 今回確認した契約 / 証拠の限界 |
| --- | --- |
| [品質受入](phase10-quality-acceptance.md)、特にEと末尾PR #28・追加レビュー | 未完了AIの非成功扱い、spinner/disabled解除と再操作、保存履歴と当該送信結果の分離。PR #28の最終記録はroute68＋panel29＝97件、全体67ファイル/1,490件のoffline成功。過去のmock証拠で、今回は再実行していない |
| [stream設計](phase10-chat-stream-reliability-design.md)、[I0判断資料](phase10-chat-reliability-i0-decisions.md) | T01/T08/T13/T14のB案に関係する限定範囲を参照。ChatAttempt・冪等key・status・独立usage保存・Stop等のA案や120秒等の仮値は現実装にない。設計全件の受入を要求/認定しない |
| [roadmap](roadmap.md) | 現在チェックはUnit/E2E/Validation/Authorizationの4/11。Error handlingはPartial。冒頭の古い「E2Eのみ」等は日付付きの過去記録として区別する |
| [Chat POST](../../src/app/research/[id]/chat/route.ts)、[routeテスト](../../src/auth/chatRoutes.test.ts) | C2/Demo gate→auth→Research/Workspace認可→入力→Conversation所属→rate limit→context→retrieval/embedding→保存履歴読取→USER作成→Conversation.updatedAt更新→streamText。onFinishはusage→stop/raw非空→引用検証→validated trim/parse後本文非空→AI作成。別writeで、一括transaction・attempt識別なし |
| [Conversation作成/一覧](../../src/app/research/[id]/chat/conversations/route.ts)、[detail GET](../../src/app/research/[id]/chat/conversations/[conversationId]/route.ts) | NewはConversation1件作成・201。listはupdatedAt降順と最初のUSER preview、detailはcreatedAt昇順の保存Message全体と解決済みSources。usageや特定POSTの状態を返さない |
| [panel](../../src/app/research/[id]/_components/research-ai-panel.tsx)、[panelテスト](../../src/app/research/[id]/_components/research-ai-panel.test.tsx) | rawは暫定表示。EOF後は暫定USER/AIを除きdetail GETを1回、成功でmessages/IDs/Sources全置換。GET失敗は旧取得済み履歴を保持し未確認表示。成功HTTPのread Error/AbortError後も1回GET、通信エラーは残す。POST非成功/fetch失敗には自動GET・再POSTなし。テストはhook double/JSX/合成streamで、実mount/DOM/paint/focusではない |
| [History dialog](../../src/app/research/[id]/_components/research-ai-conversations-dialog.tsx)、[mobile wrapper](../../src/app/research/[id]/_components/research-ai-mobile-dialog.tsx)、[Research page](../../src/app/research/[id]/page.tsx) | Historyを開くとlist GET、選択でdetail GET。desktopとmobile dialogのpanel状態は別。画面はResearch以外にSource/Finding/Comment/Tag等も読む。desktop1 panelだけを初回smoke対象にする |
| [引用処理](../../src/lib/ai/source-citations.ts)、[Source解決](../../src/lib/ai/resolve-workspace-sources.ts) | 表示本文と保存validatedTextは別。detailのSource解決は同WorkspaceのResearchを読み、対象引用Sourceを解決する。リンク先サイトを取得する処理ではない |
| [Research context](../../src/lib/ai/research-context.ts)、[prompt](../../src/lib/ai/chat-system-prompt.ts)、[retrieval](../../src/lib/ai/retrieve-workspace-context.ts)、[vector検索](../../src/lib/ai/search-retrieval-chunks.ts) | 現Researchのtitle/description/conclusion・全Sources・Findings/linked Sources、既存Conversation全Messageが生成入力になる。query embedding後、Workspace全体から候補10・distance≦0.35・重複排除後最大5を取得。新規Conversationでも他Researchのprivateなchunk等が生成入力になり得る |
| [model](../../src/lib/ai/model.ts)、[embedding](../../src/lib/ai/embed-texts.ts)、[rate limit](../../src/lib/ai/chat-rate-limit.ts) | 生成はGoogle `gemini-3.6-flash`、embeddingは `gemini-embedding-001`/768次元/RETRIEVAL_QUERY。rate limitはWorkspace×Userの10回/1分、Redis.fromEnv、analytics有効。Chatだけでこれらへ到達する |
| [contract](../../src/prisma/contract.prisma)、[DB runtime](../../src/prisma/db.ts)、[DB target解決](../../src/lib/c2/runtime-database.ts)、[Prisma設定](../../prisma.config.ts)、[auth DB](../../src/auth/authDB.ts) | Messageにはattempt/個人actor/USERとAIの対応がない。usageの帰属IDはscalarでFKなし。Message→Conversationのcascadeは明示されず、Research削除から安全な全cleanupは推定できない。CLI/接続は未実行 |
| [auth](../../src/auth.ts)、[Research認可](../../src/auth/requireResearchAccess.ts)、[Workspace認可](../../src/auth/requireWorkspaceAccess.ts) | database SessionとWorkspace membershipによる認可。Session利用、authのDB読取、Session更新/失効副作用の許可を画面閲覧の許可から省略しない |
| [Sentry server](../../src/sentry.server.config.ts)、[client](../../src/instrumentation-client.ts)、[sample設定](../../src/lib/observability/sentry-config.ts)、[Next設定](../../next.config.ts) | DSNがあれば通常環境で送信し得る。trace rate 0だけではerror送信禁止にならない。dataCollection制限は任意例外/extra/breadcrumbの完全redaction証明ではない |
| [Research作成](../../src/app/research/_actions/createResearch.ts)、[index要求](../../src/inngest/request-research-index.ts)、[index job](../../src/inngest/functions/index-research.ts) | Research作成等はInngest enqueue→embedding/index writeを誘発し得る。index jobにはretries:3。Chat smoke中のResearch/Source/Finding編集やindex実行を許可へ含めない |

### 設定packageソースの補足

- `ai` の `src/util/prepare-retries.ts` は未指定maxRetriesを2にする。`streamText` と `embed` はこの経路を使い、現行呼出側はmaxRetries/abortSignalを指定していない。生成1回＋query embedding1回の論理呼出と、各最大3試行になり得る外部呼出を区別する。実際の試行数・課金は未観測。
- Google providerの既定base URLは `https://generativelanguage.googleapis.com/v1beta`。生成は `streamGenerateContent?alt=sse`、query embeddingは `embedContent` の経路。コードの既定と実効proxy/egress・認証projectは別途確認する。
- `@upstash/ratelimit@2.2.0` 同梱sourceでは未指定timeoutは5秒で、timeout時は `success:true` を返す経路がある。timeoutはRedis通信を止めた証明にならず、routeはsuccessだけを確認する。analyticsはpending処理を追加する。
- `@upstash/redis@1.39.0` の同梱HTTP実装には未指定retryの追加試行がある。REST先は `UPSTASH_REDIS_REST_URL/TOKEN`、Node版では `KV_REST_API_URL/TOKEN` のfallbackもある。limit1回をREST1回と数えず、script fallbackやanalyticsも上限に含める。
- Auth.js coreのdatabase Session処理は期限更新が必要なら `updateSession`、期限切れなら `deleteSession` に進む。既定maxAge30日/updateAge1日をアプリは上書きしていない。cookie更新候補も生成するが、現行の引数なし `auth()` の呼出からbrowserへSet-Cookieが実際に渡るかは未確認。**GETをDB無書込とは扱わない。**

### 文書との不一致を保持して報告する

[AI architecture](../architecture/ai-architecture.md)には、保存条件を検証前の非空/stopだけで記す箇所と、EOF後はSourcesのみ更新・live messagesを置換しない旨が残る。後者はPR #28の実装と明確に不一致で、前者は追加された非空条件を説明していない。PR #26/#27の「現行」表も作成当時のsnapshotである。本書では最新のPR #28受入追記と対象SHAのコードを照合し、不一致を隠さず記録する。原仕様や過去記録の修正は今回行わず、必要な文書同期は差分レビューで別途判断する。

## 4. Stage B開始前の個別許可

全項目が**未許可**。通常環境/DB起動済みという報告、PR merge、過去C2許可、本書の作成は実行許可を兼ねない。承認記録には対象、操作、上限、時限、データ範囲、保持/cleanup、承認日時を残す。複合操作は必要な許可がすべて揃った部分だけ進める。

| 許可ID | 個別に必要な対象と副作用 |
| --- | --- |
| P01 Browser/認証済みHTTP | 通常SaaSの正確なorigin/path、利用する既存User/Session、desktop1 tab、閲覧するprivate範囲、許可するasset/RSC/HMR通信。ブラウザ起動/既存Session利用、auth DBのUser/Session読取、期限更新・期限切れ削除・cookie変化の可能性を明示して許可。OAuth/sign-in/out、Session作成/明示revoke、storageState書出は含めない |
| P02 直接DB読取 | 通常DBのhost/port/database/schema/role・server identity、対象table/列/predicate・SQL本数・timeout・出力方法を個別承認。SELECTも未許可。アプリ経由の読取許可と直接接続許可を分け、広いDB scanをしない |
| P03 テストデータ準備 | AI送信可能なsynthetic Workspace/Researchのmanifestと権利・所有範囲を承認。新規作成が必要ならDB write、index/enqueue/embedding、保持/cleanupを別計画にして先に承認。通常DBの初期化/migration/seed/既存削除は含めない |
| P04 Conversation作成 | 許可済みsynthetic ResearchだけにNewを最大1回。Conversation1件が残る。既存Researchの閲覧許可は新規作成許可ではない。作成成否不明でも再POSTしない |
| P05 Chat/アプリDB書込 | 指定の新規ConversationへのChat POST最大1回。USER作成1、Conversation更新1、callbackが実行されればusage作成と条件付きAI作成を伴う。部分保存・callback未到達/重複・応答喪失のリスクを明示。実AI/embedding/Redisは別許可 |
| P06 Google生成 / P07 query embedding | それぞれのprovider/model/接続先・課金project、送信するcontext/history/query、呼出数・retry禁止・時間/token/費用上限と制御手段を個別承認。生成許可からembedding許可を推定しない |
| P08 Upstash/Redis | 接続先/instance/課金主体、Workspace×Userのrate-limit keyへのwrite・analytics、REST/command上限・retry/timeoutを承認。共有枠を消費し後続利用へ影響し得る。キー名のprefixだけで専用領域とは扱わない |
| P09 Sentry/他egress | 初回smokeはSentry/Inngest/他の未承認外部通信を0回とする案。既存設定/通信制御で実現できないならBlocked。送信が必要なら接続先・件数・内容・保持・timeoutを別途明示承認。trace rate 0だけで代替しない |
| P10 残置 / cleanup | 作成データの残置範囲・期限・責任者を先に選ぶ。削除はexact IDs・依存関係・usage保持・実行主体・検証読取まで別承認。Session/Redis/Cloudのcleanupも別対象 |

### AIに送ってよいデータの確保

候補Research `h8uo44a86ydzro3j7hl2c6pt` は**閲覧候補だけ**とする。内容とWorkspace全体を確認・承認するまで、そこでNew/Sendを実行しない。新しいConversationや合成の質問を使うだけでは、現Researchの情報やWorkspace retrievalのprivate dataは除外されない。

推奨は、通常SaaS/通常DB内で既に所有者が用意した**合成データ専用WorkspaceとResearch**を使用すること。所有者が全Research、Sources/URL、Findings/linked Sources、conclusion、RetrievalChunk（古い/孤立chunkを含む）をAIへ送ってよいと確認したmanifestを提示する。他Workspaceのレコードへ張られたリンク等も確認対象にし、距離閾値や「結果0件だろう」という推定へ依存しない。

準備用の内容案は、Research title `PR29 synthetic smoke`、description `架空の作業時間比較。個人・顧客情報なし。`、Finding `合成例: 作業Aは10分、作業Bは15分。`、conclusion `差は5分。実測値ではない。`。必要ならSource title `Synthetic fixture` / URL `https://example.invalid/pr29-synthetic` を紐付ける。外部Sourceは開かない。prompt案は `合成例の作業AとBの時間差を、合成例であると明記して一文で説明してください。`。run識別はmanifestに記録し、モデルの返答だけから検証データ所有を推定しない。

これは未作成の内容案であり作成指示ではない。新規Workspace/Research準備・索引作成が要る場合、Inngest/embedding/write/retryの別予算を確定するまでChat段階はBlocked。C2 fixture、通常seed、既存private Researchの内容コピーは使わない。空のsynthetic Researchでもsmokeは可能だが、現Research/retrievalのどちらにも引用用Finding/Sourceがない構成では、引用付き保存を実測できないという制限を記録する。

## 5. 通信経路・呼出上限・時間・retry

以下は**未承認の実行予算案**。現コードへtimeout/retry制御を追加したものではない。観測の打切りとserver/provider/DBの停止は区別する。制御を実現するための設定変更・proxy追加・再起動・実装が必要なら、別タスクとして承認/レビューするまで依存シナリオを実行しない。

| 経路 | proposed最大回数 / timeout / retry | 現状と開始条件 |
| --- | --- | --- |
| Research/History/detail HTTP | アプリの意味的GET最大8回: Research文書2、list2、detail4（候補の既存会話1、新規の空履歴1、送信後自動1、明示History1）。API各10秒、page30秒、retry/自動reload/pollingなし | synthetic画面と候補画面が同じでも余りを再試行へ回さない。asset/RSC/prefetch/HMR等の実通信数は別予算/allowlist。runtime modeを確認し、未承認pathへのprefetch/redirectを止められなければBlocked |
| Conversation POST | 最大1回、観測10秒、retryなし | timeout/応答喪失は作成有無不明として停止。2回目Newで補わない |
| Chat POST | 最大1回。全体観測60秒、retry/再生成/2回目Sendなし | 現panelにtimeout/Stopなし。60秒で新操作を停止してもserver処理が止まる保証はない。強制停止権限・方法が未確定なら開始しない |
| Google生成 | 論理streamText最大1回、外部生成試行も最大1回、追加retry0。Chat全体60秒以内。token/費用の数値上限は未確定 | 現SDK既定retry2と矛盾。routeにmaxOutputTokens/総context予算・deadlineもない。課金/egress側等で上限を担保する方法と予算承認が揃うまでBlocked。単に2回目が見えたら止める方法では事前制御にならない |
| Google query embedding | 論理embed最大1回、外部試行最大1回、追加retry0、観測10秒かつChat全体予算内 | contextを読む前後のDBと区別する。embed側も既定retry2・signal未指定のためBlocked。index用embedTexts/embedManyは0回 |
| Upstash/Redis | limitの論理呼出最大1回。REST/command（script fallback/analytics/pending含む）の数値上限は未確定。追加retry0、観測5秒 | SDK retry・analyticsの物理通信数とtimeout後の継続を制御/承認できるまでBlocked。rate limitのsuccessやHTTP200はRedis処理完了/生成予算の証明ではない |
| 直接DB | 同時接続1、接続待ち5秒、SELECT各5秒、追加retry0。identity確認1本＋baseline/after各3本（Conversation/Message/usage）＝最大7 SELECTの案 | exact SQL/列/制限とDB側statement timeoutを事前レビュー。synthetic corpusの追加監査は別のSQL本数・範囲を承認し、7本へ紛れ込ませない。app DB/auth DBの内部query本数・writeはこの7本に含まない |
| Sentry | 外部送信0回、probe/flushによる接続確認0回 | DSN/送信先・server/client双方・sample/queue・HMR/reload時の動作を確認。停止境界の既存証拠がなければ閲覧段階からBlocked。完全redactionは未証明 |
| Inngest/他外部通信 | enqueue、job、index、外部Source遷移、OAuth、新規外部probeは0回 | Chat/list/detailに直接enqueueはないが、Research準備や既存background jobは別問題。既存serverを停止/変更せず対象操作と干渉しないことを所有者が確認する |

接続先確認は、起動processとcheckout/port/mode、DB host/port/database/schema/role・実server identity、Google project/model/base URL/proxy、Upstash instance・URL fallback、Sentry DSNの宛先・project、Inngest dev/Cloud modeとpending job、browser側の外部通信を対象にする。確認結果はsecretを含めずalias/一致可否として記録し、credential疎通probeは行わない。DB identityのSELECT自体もP02承認後のみ。

## 6. 実測シナリオと期待結果

Stage Bの推奨順は許可/identity確認→R01/R02の必要な閲覧→synthetic manifest確定→R03→baseline DB snapshot→R04/R06→R05→承認済み残置または別承認cleanup。現在はどの段階も実行しない。下表のHTTPと画面操作は同じ観測を使い、確認目的で追加POSTを送らない。

| ID | 前提・操作案 | 期待結果と確認方法 | 必要許可・副作用・停止条件 | 現時点の判定 |
| --- | --- | --- | --- | --- |
| R01 認証済みResearch画面/History | 対象が通常SaaSと確認済みで、既存Session/private閲覧範囲を承認。候補画面を1回表示しHistoryを1回開く | 認可されたResearchとAI panelが表示され、list GETがupdatedAt順・最初のUSER previewまたは空状態を返す。画面/HTTPを別に記録。New/Send/編集は触らない | P01/P09、アプリ経由のDB readとSession副作用の許可。許可されたResearchの閲覧は対象内。未認証/redirect/401/403/404、許可範囲外のprivate情報表示、private情報のログ/スクリーンショットへの不適切な混入・外部送信、予期しない通信、時間超過で停止。ログインへ進まない | Blocked |
| R02 detail GETの保存履歴 | P01で指定された既存Conversationを1件だけ選択、または明示承認されたdetail GETを1回。同じGETを二重送信しない | `id/researchId`、Message ID/authorType/createdAt昇順、表示本文/Sourcesを照合。履歴表示は保存済みデータの証拠で、過去の特定POSTの成功証明ではない。usageは返らない | P01/P09。Source解決がWorkspaceのResearchを読む範囲も承認。直接DB照合はP02追加。認証/認可拒否なら終了、別IDを探索しない | Blocked |
| R03 テストConversation作成 | 全corpusが承認済みのsynthetic Research上でNewを1回 | POST201、返ったexact Conversation ID/Research IDをprivate manifestへ登録。UIはConversation started、保存Messageは空。空detail GET1回とbaseline snapshotを使える | P03/P04/P10、P01/P09。Conversation1件残置。201でも空MessageやDB全状態を断定しない。失敗/timeout/ID不一致で停止し再作成しない | Blocked |
| R04 Chat POST1回・stream・EOF後GET | R03、baseline、P05〜P09・予算/通信制御がすべて成立。synthetic promptを1回だけSend | 送信中は入力/Send disabled、`AI (temporary)` と保存未確認status。raw chunk/HTTP status/EOF時刻を観測。EOFで暫定USER/AIを除き確認中表示、detail GET1回。成功なら全messages/保存ID/Sourcesで置換、送信中解除。rawと保存本文が同じとは要求しない。次回送信可否は入力/disabled確認だけで、Sendしない。高速応答で一時的なUI状態を観測できない場合、それだけでFailとしない。観測できた事実と未確認の状態を分け、必要証拠が不足する項目は判定保留（Blocked）とし、Passにしない。確認のための通信遅延注入や追加リクエストは行わない | USER/updatedAt/usage/AI write、Google/embedding/Redis課金・quota、Session/telemetry副作用。失敗/上限超過/追加試行/未知通信で停止。EOFをfinishReason=stopやcallback完了と推定しない | Blocked |
| R05 USER/AI/usageの永続化照合 | P02でbaseline/afterの各3 SELECTを許可。空の新規Conversationに対する単一run、他tab/member送信なし。afterはR04終了後に1 snapshotだけ | 通常stop・非空・保存完了を観測できた場合の期待増分はUSER1/AI1/usage1、Conversation更新1。DB Message ID/contentとdetail GET/表示を照合し、usageのscalar帰属/provider/model/tokens/null/finishReasonはDBだけで確認。UIにusageは出ない | SELECTも個別許可。部分状態をrollback済み/未保存確定と扱わない。snapshotがcallbackより先か不明なら観測時点の状態として保留し、追加poll/再送しない。予期しない行数・帰属/内容不一致で停止 | Blocked |
| R06 特定POSTの成功と誤認しない表示 | R04の同じ1 POSTを使用。EOF後の自動GETと、終了後に必要ならHistory再表示1回 | stream中「暫定・保存未確認」、GET後「サーバーの保存履歴を表示中」と「今回の送信結果を個別には確認できない」が併記される。History手動選択の一般的な保存履歴statusにも当該POST成功の意味を付与しない。200/EOF/GET成功/末尾AI/同本文/件数を成功判定に使わない | R04と同じ許可＋手動list/detailの回数枠。実測で差がなければraw→validated差やAIなし分岐を検証したとはしない。成功断定表示/暫定回答の確定扱いがあればFail、続行しない | Blocked |

R05の1/1/1は、条件付きの正常保存期待値であり、HTTP200を根拠に必須結果として押し付けない。onFinish未到達、非stop、raw/validated/parse後空、usage失敗、AI失敗等で部分状態があり得る。特にusage失敗はAI保存を阻害し、AI失敗は先行usageを巻き戻さない。token不明はnullで、0や請求なしへ読み替えない。query/index embeddingのusageはこのAiUsageEventの対象外。ConversationはupdatedAtの変化を照合するが、snapshotだけでは更新writeの回数を証明できない。各SELECTの観測時刻とtransaction境界を記録し、別々に読んだ3 tableを同一時点のsnapshotとは扱わない。

新規の空Conversation・単独run・時刻・IDsは観測の照合に役立つが、schemaにないattempt対応を補うものではない。DBで存在を確認できるのは特定Message/usage行の保存事実であり、製品が特定POST成功を保証できるようになったとは記録しない。GETとDB snapshot間の後着保存も区別する。

### 今回の1 POST smokeから分離するケース

| ケース | 既存の根拠 / 将来必要な観測 | 今回の計画上の扱い |
| --- | --- | --- |
| 空/非stop/引用markerのみ、rawとvalidated差 | route mockは実validator/parserで境界を確認済み。実AIに狙った出力を指示しても再現は保証されない | 実測Not run。1回の正常生成から全分岐Passにしない。固定provider/別HTTP harnessを使うなら別許可 |
| read Error/AbortError・GET拒否/JSON/通信失敗 | 暫定表示を除く、旧履歴/Sourcesを保つ、通信alertを残す、1 GET/再POSTなし、finally解除はmock証拠あり | 故意に通信/DB/providerを壊さない。自然発生時だけ許可済み回数内の観測を残し停止。エラー誘発は別計画 |
| New失敗/同一Historyへの切替後の並行POST防止 | PR #28追加レビューはlocal pending Setを29 panel cases内で確認。streamが終わるまで同ConversationへのSendを拒否、旧finallyは新会話を上書きしない | 実browserでは未確認。New失敗注入や追加POST/別Conversation作成は初回smoke外。通常EOF後の自動GET確認とstream中History切替は同じ経路にならないため、専用の追加予算/許可を分ける |
| 別tab/member・reload/remount・responsive別panel | local pending制御はpanelインスタンス内のみ。serverの冪等性やprovider停止を保証しない | 実測Not run。tab追加・reload・mobile切替・同時送信で検証範囲を拡大しない |

## 7. 判定表

| 判定 | 使用条件 |
| --- | --- |
| Pass | 対象revision/環境/許可/予算が一致し、当該シナリオの必要な実証拠が揃い期待を満たす。HTTP・UI・DB・AIそれぞれの観測範囲を限定して記録 |
| Fail | 実観測がそのシナリオの期待と矛盾。例: 特定POST成功を断定、暫定回答が通常回答として残留、保存ID/本文の不一致、承認上限超過。継続・自動修復しない |
| Not run | 必要な許可・実行前提に阻害条件がなく、単に実行していない場合の判定。許可不足等がある場合はBlockedを優先し、実測未実行の事実は別途記録する。過去mockのPass、ユーザーの起動報告、merge、静的コードの期待を実測結果へ転記しない |
| Blocked | 必要許可・安全なsynthetic corpus・接続先identity・予算制御・必要証拠等が不足。実行途中でも保存完了時点を確定できない等は対象判定を保留し、理由と観測時刻を残す |

現時点の実行可否・判定はR01〜R06すべてBlocked。R01/R02もP01/P09が未許可のため実行できない。これとは別に、実測は全件未実行であり、実HTTP/browser/DB/AIの成功証拠は**0件**。R01/R02だけ許可されてもR03以降へ進まない。将来すべてPassでも「限定smoke」の結果であり、PR #26の全TケースやError handling全体のPassではない。

## 8. 証拠収集と秘密情報の保護

Stage Aの証拠は本書のローカルGit/静的所見だけ。Stage Bでは次の記録形式と保管先も事前承認し、本文・ID・Session等を無制限にdumpしない。

| 種類 | 収集案 / 限界 |
| --- | --- |
| Git/環境 | 実行日時JST、SHA、branch、process/checkout対応、origin、mode、browser版/viewport、承認ID。接続先は承認されたalias/照合可否を記し、DB URL/credential/DSN全体は残さない |
| Browser | status/alert/disabled/暫定label/History全置換とタイムラインを必要最小限記録。1280×720のdesktop1 tab案。synthetic panelだけ必要なら切り出し画像、private Research全画面・全DOM dump・trace/video/HAR・storageStateは保存しない |
| HTTP | method、許可済みpathのalias、status、stream開始/最初chunk/EOF/GETの時刻・回数、返却IDの対応表。Cookie/Authorization/Set-Cookie/API key/query secret、raw header、全request/response本文をログへ出さない。payloadは承認済み合成文だけ |
| DB | baseline/afterの観測時刻、exact test IDs、限定列と増分、Message/usageの帰属・content比較結果。raw SQL error/接続文字列、User email、Account OAuth token、Session tokenは取得/出力しない。DB値とGET値は時点が違えば同時snapshot扱いしない |
| AI/embedding/Redis | 論理呼出と外部試行・analyticsを分け、許可済み計測手段の件数/時間/予算だけを記録。prompt/response/embedding vectorのraw dump、追加の課金API照会・Cloud console接続は行わない。usage行数はprovider試行数/請求回数の証拠にならない |
| 過去mock | PR #28の97件/1,490件と境界を参照するだけ。実SDK callback順序、Next HTTP、実DB commit/耐久性、実React paintの証拠へ格上げしない |

manifestにはrun ID、承認されたWorkspace/Research/Conversation/作成Message/usage IDs、許可主体、作成時刻、残置期限/cleanup責任を記す。ConversationにcreatedByやattemptがないため、権限を持つmemberであることだけから「その会話のデータを全削除してよい」と判断しない。manifestの保管先・保存期限は未確定で、Stage Aでは追加artifactを作らない。将来private artifactを使う場合も既存のignore/保護状態を確認し、設定変更を無断で加えない。レビュー用差分はredactした集計/判定だけとする。

## 9. 失敗時の停止条件

1. SHA/process/通常SaaS/DB identity/modeが不明または不一致、C2/本番を示唆、schema準備を要求された場合は操作前に停止する。migration・seed・resetで合わせない。
2. Session失効・未認証・redirect・401/403/404、許可外path/host、予期しない書込/egress、private情報がAI入力/画面証拠へ混入する可能性が出たら停止する。OAuth・別ID探索・権限拡張を試みない。
3. timeout、429、5xx、stream/read/GET/DB error、予算超過、retry/追加POST、行数/ID/本文の不整合を観測したら新操作を止める。通常SaaSで意図的に障害を注入せず、2回目のSend/Newで補わない。
4. UIの200/EOF・spinner解除・History成功・local pending解除を保存成功/未保存確定/provider停止の証拠にしない。GETやDB snapshotがcallbackより先か不明なら結果未確認として停止し、自動pollしない。
5. 観測打切り・browserを閉じることはserver/provider/DBの停止ではない。実行前に対象runだけの停止手段と担当を承認する。共有server/DBをkill・再起動したりcredentialをrevokeしたりしない。停止の実効性を確保できないなら、実AI段階を開始しない。
6. 許可外通信等が既に起きた場合、秘密情報を含まない発生事実と未確定範囲を記録する。許可のないcleanup/追加SELECT/Cloud照会は行わず、影響確認の範囲を改めてレビューする。

## 10. cleanupの許可境界

R03前に、**残置案**（synthetic test rowsを指定期限まで所有者が保管）または**個別cleanup案**（exact ID一覧のレビュー後に別承認）を選ぶ。どちらも現在は未承認。成功/失敗のいずれも自動削除しない。

cleanup案はMessage等の依存関係を確認し、作成したものだけを明示predicateで削除する。Research削除のcascadeでMessage/usage/索引/Source等まで安全に処理できるとは推定しない。AiUsageEventはFKなしで、保持方針とexact IDを別に扱う。他memberが会話へ書いた場合やmanifest外の参照がある場合は所有範囲が変わるため停止する。Research/Workspace/既存User/Account/Session、既存C2 fixture、共有Redis keyをまとめて削除しない。

Sessionの期限更新・期限切れ削除、Upstash rate-limit消費/analytics、外部providerへの送信・課金、Sentry/Inngestへの配送はDB行cleanupで取り消せない。明示Session revoke、Redis key削除、Cloudデータ削除は独立した対象・許可を要する。既存Sessionを利用しただけなら自動revokeしない。cleanup後の直接SELECTもP02等の許可に含める必要があり、初回smokeの7 SELECT予算とは別に承認する。

## 11. Phase 10への影響と実行前の未解決事項

**Phase 10は4/11完了、Error handlingはPartialを維持する。** roadmapや受入チェックを変更しない。Stage Aは新しい実測を追加しておらず、将来の通常SaaS1 POST smokeも、production-mode error/HTML/RSC回復、abort/timeout/並行・再送・DB原子性/競合、完全なredaction、全AI品質の受入を満たさない。

| 未解決事項 | 依存シナリオ / 解決に必要なこと |
| --- | --- |
| 実行許可がない | 全件。P01〜P10の対象・範囲・条件を個別レビュー。Stage A終了時にStage Bへ移行しない |
| 稼働process/revision/通常DB・schema・各接続先が未確認 | 全件。ユーザーの起動報告と実identityを分け、許可された確認だけで固定 |
| 候補Researchのprivate性とsynthetic専用Workspace/corpusが未確定 | R03〜R06。新規Conversationだけで安全とはしない。準備のindex/embedding/Cloud副作用も別に解決 |
| Session副作用とSentry/他egressの許可/制御 | R01から。GETのSession write/削除とDSN有効時の通信を含めた承認が必要 |
| SDK既定retryとretry禁止・時間/費用上限の不一致 | R04〜R06。生成/embedding各1外部試行、Redisの物理上限、timeout後の継続、token/費用上限の数値と実制御を確定。現コードのまま安全に満たせなければBlockedを維持 |
| 保存完了・特定POSTの識別不足 | R05/R06。snapshotの時点・保存行の事実とPOST成功保証を分ける。解消のためChatAttempt/API v2を今回追加しない |
| 残置/cleanup・manifest保管先・期限・所有責任が未確定 | R03前に決定。削除を既定の後処理にせず、必要な追加読取/削除権限も別承認 |
| AI architectureの古い記述 | Section 3の不一致をレビューへ報告。今回の変更範囲を広げて黙って仕様を更新しない |

## 12. Stage Aの検査と停止

検査対象は本書のMarkdownリンク、空白/差分、変更ファイル一覧、最終Git status。新規未追跡ファイルは通常の `git diff` へ出ないため、リンク・空白を直接検査し、`git diff --no-index` でも全文を確認する。テスト/build・環境接続による検査は行わない。

静的検査結果: 相対Markdownリンク39件・リンク切れ0件、table列数の不一致0件、末尾空白0件・最終改行あり。`git diff --check` はexit 0。未追跡の本書に対する `git diff --no-index --check` は空白診断0件・exit 1（新規追加の差分あり）で、直接の空白検査でも異常なし。no-indexの全文diffは本書の全207行と一致する。変更一覧は本書の新規追加1件だけで、既存の追跡ファイルに差分はない。no-indexのexit 1を実測/testの失敗とは扱わない。

**本書だけを未コミットで残して停止し、ChatGPTによる差分レビューを待つ。Stage Bは実行しない。**
