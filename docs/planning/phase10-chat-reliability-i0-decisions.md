# Phase 10 — Chat Reliability I0 Decision Review

## 1. Purpose and evidence

作成日: 2026-10-22 (JST)。対象: `morimotodev93/evidence-atlas`、PR #27向けの仕様判断資料。
本書は [PR #26設計](phase10-chat-stream-reliability-design.md) Section 6を判断可能な候補へ展開するもので、**採用決定・実装指示・実行許可ではない**。
本書作成時点でApprovedは0件。Error handlingは**Partial**、Phase 10は**4/11完了**を維持する。

開始条件は次のとおり一致した。Git確認はローカルのみで、リモートPR・配備状態の照会はしていない。

| 項目 | 確認結果 |
| --- | --- |
| branch | `docs/phase10-chat-reliability-i0-decisions` |
| HEAD / 指定Base HEAD | `f1c1bb2adf34eaa61db4f1aab97fc8617c6614aa`（一致） |
| worktree | `C:/Users/owner/Desktop/sm-dev/evidence-atlas` の1個のみ |
| 開始時status | 追跡差分・未追跡ファイルなし |

[調査方針](source-memo.md)に従い、ローカル一次資料と対象バージョンを使う。以下の区別を全節に適用する。

| 証拠 | 内容と限界 |
| --- | --- |
| S27 | このBase HEADの文書・ソース・既存テストと、必要箇所のインストール済みSDK型・ソースの静的読取。runtimeの成功証拠ではない |
| C25 | [PR #25とfollow-upの既存記録](phase10-quality-acceptance.md#pr-25--chat-stream--abort-error-handling2026-10-22-jst)。固定mockの既存実績であり、今回再実行していない |
| P27 | 本書の推奨、仮値、期待状態。実装済み・承認済みとは扱わない |
| U | 実SDKのcallback順序、HTTP切断、実DB競合、実React/DOM等の未取得証拠。静的読取やC25で代替しない |

主な参照経路（S27）:

- [Chat POST](../../src/app/research/[id]/chat/route.ts)、[panel](../../src/app/research/[id]/_components/research-ai-panel.tsx)、[History dialog](../../src/app/research/[id]/_components/research-ai-conversations-dialog.tsx)。
- [Conversation list/create](../../src/app/research/[id]/chat/conversations/route.ts)、[detail GET](../../src/app/research/[id]/chat/conversations/[conversationId]/route.ts)、[Research認可](../../src/auth/requireResearchAccess.ts)、[Workspace認可](../../src/auth/requireWorkspaceAccess.ts)。
- [contract](../../src/prisma/contract.prisma)、[DB構成](../../src/prisma/db.ts)、[Prisma設定](../../prisma.config.ts)、[データモデル](../architecture/data-model.md#710-conversation-and-message)、[AI architecture](../architecture/ai-architecture.md)、[引用関数](../../src/lib/ai/source-citations.ts)。
- [route offlineテスト](../../src/auth/chatRoutes.test.ts)、[panel offlineテスト](../../src/app/research/[id]/_components/research-ai-panel.test.tsx)、[品質受入記録](phase10-quality-acceptance.md)、[roadmapの現在チェック](roadmap.md#phase-10--testing--quality)。
- SDKはローカル `ai@6.0.280` の `src/generate-text/stream-text.ts`（flush / abort処理）、`src/text-stream/create-text-stream-response.ts`、`src/util/prepare-retries.ts` を静的確認。`onAbort`呼出箇所はawaitせず、stepなし等ではonFinish前にreturnする経路がある。plain text Responseの既定200は保存証明ではなく、未指定maxRetriesの既定は2。実際の順序・停止・通知はU。
- Prismaは `@prisma/orm-postgres@8.0.0-rc.12`、CLIの宣言は `prisma@8.0.0-rc.17`、pnpm指定は12.9.1。[同梱skill](../../.agents/skills/prisma-8/SKILL.md)とruntime packageのrc.12一致、contract artifactsの存在・sourceより新しい更新時刻を確認。artifact再生成・CLI実行はしていない。

現行の確定範囲と仕様上の不足:

- POSTはcontext/retrievalと履歴読取の後にUSERを保存し、Conversation.updatedAtを別writeで更新する。onFinishではusage→stop/raw非空検査→引用検証→AI保存の順。usageのrejectはAI保存も止め、引用検証後の空文字を防がない。
- Messageには個人の送信者・attempt・USER/AI対応関係がない。AiUsageEventは帰属IDがscalarでFK・attempt対応なし。通常アプリのusage照会API/UIは確認できず、detail/list GETもusageを返さない。既存usage失敗をUI表示するには新たな状態読取が要る。
- detail GETは保存MessageをcreatedAt昇順に返し、引用Sourceを現在Workspaceから解決する。listはupdatedAt降順と最初のUSERによるpreview。panelのEOF後GETはSourcesだけを更新し、History選択時に初めてmessages全体を置換する。
- C25は合成streamのread reject/cancel、手動callback、再POSTや保存失敗を再現する。実SDKのcallback再配信を証明しない。panelはuseState doubleによるhandler/JSX検査で、mount・focus・描画の証拠ではない。sendError残留はfollow-upの有効送信開始時解除で修正済みであり、未修正とは記さない。
- PR #26 Section 3.2同様、未完了AIを完成回答にしない原則に対し、空AI保存・未完了EOF表示は受入上の不足。retrieval後USER保存・plain text・raw非空/stop判定は現行文書とコードで一致する。これらを変えるP27を現在仕様へ黙って繰り込まない。受入文書冒頭の「E2Eのみ」等は当時の記録で、現在の4/11を上書きしない。

## 2. Decision register

状態の意味: **Proposed**＝推奨候補あり、ユーザー未承認。**Pending**＝推奨方向はあるが採用に必要な下位判断/証拠が不足。**Approved**＝対象・条件を明記したユーザー承認あり。**Rejected**＝明示的に不採用。代替案は比較対象であり、推奨外であるだけでRejectedにしない。
以下D01〜D10はPR #26 Section 6の全10項目に対応する。変更対象は将来採用した場合の対象で、今回の変更範囲ではない。

### D01 — keyの意味・retry UI（Proposed）

| 観点 | 判断資料 |
| --- | --- |
| 現行仕様 | 毎POSTで新USER・新生成。同文再送と再質問を区別せず、callbackにも重複防止なし |
| 推奨案 | 同keyは照合/replayだけ。新規再生成は新key＋自分の末尾未回答USERを再利用。同文の新sendは別USER。共有member・正常回答済み・legacy USERへの再生成は初期対象外 |
| 代替案 | 毎回新turn、USER IDだけでupsert、本文hashで重複抑止 |
| 利点・失敗リスク | 送信結果不明からの重複を抑え、意図的同文を保持できる。key紛失や誤再利用、promptへのUSER二重投入、provider処理回数とusage件数の混同がリスク |
| 既存機能への影響 | 「再生成」と「新たに送信」を分け、失敗USERをHistoryに残す。既存USERはactor不明のため所有を推定しない |
| 変更対象 | client key保持・操作、v2入力/fingerprint、ChatAttempt/固定AI ID/usage unique、status・History・prompt構築 |
| 採用前に必要な証拠 | Oでpayload一致・再生成範囲、D/Hで同key/異key競合とcommit結果不明、Bでreload・別tab。T09〜T12/T14/T15 |

### D02 — context / retrieval失敗（Proposed）

| 観点 | 判断資料 |
| --- | --- |
| 現行仕様 | context/retrieval失敗は新USER保存より前。生成開始同期throwはUSER保存後 |
| 推奨案 | 認証・認可・入力・rate limitの後、attempt＋USER＋updatedAtを短い受理transactionでcommitしてからcontext/retrievalへ。失敗も状態付きUSERとして保持 |
| 代替案 | 現行順序を維持、失敗USER削除、retrieval成功後だけattempt受理 |
| 利点・失敗リスク | 受付と失敗を追跡できる。失敗履歴が増え、従来は残らなかったUSERが残る。retrievalのembedding副作用と生成usageを混同しない |
| 既存機能への影響 | preview/updatedAtとHistoryに開始失敗が現れる。新promptは正常保存turn＋今回対象USERを1回、未回答旧USERは表示に残してpromptから除外する候補 |
| 変更対象 | 受理順序・transaction、履歴選択、失敗summary、再生成UI |
| 採用前に必要な証拠 | USER保持という仕様変更への同意、Oで開始失敗各段階とprompt、Dで受理原子性。T05/T09/T14/T15 |

### D03 — Abortの意味（Proposed）

| 観点 | 判断資料 |
| --- | --- |
| 現行仕様 | Stopなし。fetch.signal/SDK.abortSignal転送なし。Abort後の正常callback保存を防がない |
| 推奨案 | request.signal・response cancel・deadlineをSDK停止要求へ接続するbest effort。DBで中断確定がAI保存より先なら未完了AIを保存しない。保存が先なら回答保持。USER保持、観測usageのみ記録 |
| 代替案 | 表示だけ停止して保存継続、USER削除、部分AIを別状態で保存 |
| 利点・失敗リスク | Stopと未完了表示を整合できる。切断がserverへ届かない可能性、後着stop、provider継続/課金継続、usage欠落は残る |
| 既存機能への影響 | spinner解除とABORTED確定を分ける。Stop直後は「停止要求済み・結果確認中」。部分本文を正常AIとしてpromptへ入れない |
| 変更対象 | controller/adapter/finalizer、状態更新とAI保存の共通lock、client遅延chunk防止 |
| 採用前に必要な証拠 | Sで実SDKの観測可能な信号と終了順序、Hで切断伝播、DでAbort/AI保存両順序、Bで再操作。T02〜T04/T12/T14 |

### D04 — AIとusageの独立性（Proposed）

| 観点 | 判断資料 |
| --- | --- |
| 現行仕様 | usage先行・別write。usage失敗はAI保存を阻害、AI失敗時はusageが残る |
| 推奨案 | P2。AI＋answer状態とusage＋usage状態を独立した短いtransactionで保存。一方の失敗が他方を中止しない。最終usage不明はUNKNOWN/nullで、0推定なし |
| 代替案 | AI/usageを1transaction、現行順序、P3 durable outbox/worker |
| 利点・失敗リスク | 回答可用性と観測コストを独立に保持。部分成功の表示・監視が必要で、完全な課金台帳にはならない |
| 既存機能への影響 | 回答保存済み＋usage失敗を別表示。1attempt最大1usageはアプリ保存単位で、provider exactly-once請求保証ではない |
| 変更対象 | 保存coordinator、固定AI ID、一意usage、三軸状態・status・UI、同値retry |
| 採用前に必要な証拠 | Oで片側失敗を分離、Dで両commit応答喪失・一意制約・null補完、H/Bで表示。T01/T06/T07/T12/T16 |

### D05 — 空本文・引用品質（Proposed）

| 観点 | 判断資料 |
| --- | --- |
| 現行仕様 | stop/raw trim非空だけを判定。検証後空AIや引用markerだけの表示が可能。liveはraw、Historyはvalidated |
| 推奨案 | stopかつvalidatedText.trimとparse後text.trimがともに非空だけAI保存。rawは暫定表示、保存確認でcanonical本文へ置換。空/部分/fallbackを正常AIとして保存しない |
| 代替案 | 現行維持、全buffer後表示、引用をstream前に逐次検証 |
| 利点・失敗リスク | 空回答の成功扱いを防ぎlive/Historyを揃える。raw暫定表示中の誤引用は残り、最終置換で表示が変わる。完全な引用品質の証明ではない |
| 既存機能への影響 | 未許可markerのみ・許可markerのみでもNOT_SAVED。既存空AIは修復/削除せず、legacyの正常性を新基準で認定し直さない |
| 変更対象 | route検証、canonical/result、panel・History。既存行の一括再検証は対象外 |
| 採用前に必要な証拠 | raw暫定表示の明示承認、Oで実validator/parser、H/BでEOF/空表示とcanonical差。T01/T08/T13/T14 |

### D06 — 同時実行・期限（Proposed）

| 観点 | 判断資料 |
| --- | --- |
| 現行仕様 | Conversation単位のDB制御・独自deadline・保存retry・status polling・key期限なし。SDK maxRetries未指定 |
| 推奨案 | Conversationごとactive 1、SDK maxRetries 0、期限と保存/照会上限はSection 4。新受理で旧AI fence失効。usage後着だけ別条件で許可 |
| 代替案 | 複数生成、process内lock、SDK retry継続、無期限待機 |
| 利点・失敗リスク | 同じ履歴からの多重生成と旧AI混入を抑制。長い生成/DB障害が他memberも待たせ、期限後も外部providerは動き得る |
| 既存機能への影響 | 他tab/memberの異key送信は409。同keyreplayを競合判定より優先。既存10回/分のrate limitは維持し、同時初回loserが枠を消費する余地は許容候補 |
| 変更対象 | Conversation所有/lock、deadline/fence/version、retry予算、status・client |
| 採用前に必要な証拠 | 仮値の予算レビュー、Sでretry/abort、Dでlock・CAS・期限回復と旧callback、H/Bで待機回復。T03/T09〜T12/T16 |

### D07 — durable回復の範囲（Pending）

| 観点 | 判断資料 |
| --- | --- |
| 現行仕様 | durable worker/終了payload保管なし。callback未到達やprocess喪失でAI/usage欠落があり得る |
| 推奨案 | 初期AもP2まで。commit済み事実は照合するが、未保存本文・最終usageの喪失を許容候補とする。許容できなければP3を先に再設計し、Aの有効化を止める |
| 代替案 | P3 outbox/worker、全buffer保存、Cとして既知リスク追跡のみ |
| 利点・失敗リスク | payloadを追加保持せず導入範囲を抑える。1件でも未保存回答/計測を失い得て、時間上限では損失件数を保証できない |
| 既存機能への影響 | stale/LOST_RESULTは新keyで明示再生成。元回答や最終tokensを復元したことにしない |
| 変更対象 | stale照合・失敗表示・運用判断。P3採用時はpayload保管/削除、worker、監視まで拡大 |
| 採用前に必要な証拠 | ユーザーによる損失許容の明示判断、D/Hでcrash注入と既存commit照合。損失率の測定は別運用gate。T07/T08/T16 |

### D08 — 権限・保持（Pending）

| 観点 | 判断資料 |
| --- | --- |
| 現行仕様 | 入口のWorkspace membership確認。保存前の再認可なし。usage帰属はFKなし。Research→ConversationはCascade、Message→Conversationはcascade未宣言で、完全な削除フローではない |
| 推奨案 | 保存前再認可をAI保存と取消処理の共通直列化境界で確定。取消が先ならAI保存拒否、保存が先なら既存AI保持。取消後も観測usageは内部帰属として保持。削除は別途保持/匿名化方針確定まで自動cascade/purgeを導入しない |
| 代替案 | 入口認可のみ、usageも削除、削除時匿名化、usage保存まで現在membership必須 |
| 利点・失敗リスク | 取消後の新AI保存と無断読取を抑えつつ観測コストを失わない。再確認だけではTOCTOUが残り、usageと識別情報の保持方針が未解決 |
| 既存機能への影響 | replay/status/Historyも毎回認可。取消後は本文・key・存在を漏らさない。User/Research/Conversation削除とattempt FKの整合がmigrationの前提になる |
| 変更対象 | AI保存/取消の共通gate、認可・usage内部保存、FK/onDelete、保持方針文書 |
| 採用前に必要な証拠 | 取消write全経路の静的棚卸し、保持責任者の方針承認、Dで取消/保存・削除/後着usage競合。T03/T12/T17。再認可の逐次mockだけでは不可 |

### D09 — 移行 / rollback（Pending）

| 観点 | 判断資料 |
| --- | --- |
| 現行仕様 | v1 plain textのみ。attempt/mode/共通writer gateなし |
| 推奨案 | 明示v2 negotiation＋version付きSSE、status/History additive読取、追加migration、server flag既定off。全writer共通gate対応→新v1停止→drain証明→同gate下でv2有効化。rollbackは新規v2停止＋読取維持、v2 Conversationのv1再開なし |
| 代替案 | plain text＋識別付き照合、非stream JSON、全Chat受付停止でdrain後切替、現行維持 |
| 利点・失敗リスク | 生成終了と保存結果を分離し、旧client迂回を防ぐ。in-flight v1の遅延USER/AI/usage write、旧binary、flag後確認だけでの誤drainが最大リスク |
| 既存機能への影響 | legacy messages/sources/previewは維持、対応関係の推定backfillなし。v2 Conversationの旧POSTは409。全旧binaryへ戻す場合はChat POST停止が必要 |
| 変更対象 | protocol schema・adapter・client・読取・追加migration、v1/v2全writer所有管理、flag・配備/drain手順 |
| 採用前に必要な証拠 | 共通予約/mode方式と全writer範囲のレビュー、H/Dの保留v1との両順競合、Bの互換/拒否/復帰、rollback rehearsal。T08/T14/T17。drain確認不能なら有効化しない |

### D10 — 採用サイズ（Proposed）

| 観点 | 判断資料 |
| --- | --- |
| 現行仕様 | C相当の実装とC25の限定offline証拠。I0未承認 |
| 推奨案 | Aを段階的な到達候補とし、Bの安全な限定範囲を先行検討。Section 6の順序を推奨するが、A/B/Cの採用は未決定 |
| 代替案 | Aを一括導入、Bだけで継続、Cで追跡のみ |
| 利点・失敗リスク | 空回答等を小さく改善し、SDK/DBブロッカーを早期に検証できる。Bを完全な冪等性/保存保証と誤認するリスク、Aの移行費用は残る |
| 既存機能への影響 | BだけではStop・重複・provider停止・特定attempt回復の保証を追加しない。Cでも既知問題を解決済みにしない |
| 変更対象 | 承認する実装PRの範囲・gate・受入条件。今回の変更は本書のみ |
| 採用前に必要な証拠 | Section 3比較とD01〜D09への判断、B/Aごとの出口条件と実行範囲の別承認 |

## 3. Scope alternatives

すべてP27。AはPR #26のR1＋制限付きR2/A2/P2/N2/C2、Bはplain textを維持した限定改善、Cは現行維持。

| 比較軸 | A — ChatAttempt＋API v2＋構造化通知を段階実装 | B — plain textの限定改善を先行 | C — 現行維持・既知リスク追跡 |
| --- | --- | --- | --- |
| 安全性 | DB冪等性・fence・三軸状態で多重保存/旧AI混入を制御する候補。durable payloadなしの喪失とprovider継続は残る | 検証/parse後空AIを防ぎ、EOFを保存済みと誤認しにくくする。識別なしでは特定turnの保存有無を保証できない | 新たな移行リスクは増えない。再POST/手動callbackの重複、空AI、部分保存、結果不明が残る |
| ユーザー体験 | Stop、状態別再操作、同key回復、canonical回答。usage警告を回答成功と分離 | 生成中/EOF後は保存未確認、History全体の再読込、必要なら「保存を確認できません」。未保存確定とは言わない | 現行の汎用alert、draft消失、正常EOFの部分/空表示、Historyとのずれを継続 |
| migration | ChatAttempt・usage nullable FK/unique・mode/所有管理等の追加。削除方針と既存nullの確認が必要 | B最小範囲はschema/migrationなし。確実なrequest→USER/AI ID対応や生成状態まで要求するなら別の識別/永続化設計が要り、B最小範囲を超える | なし |
| SDK依存 | 実SDKのabort/error/fullStream/callbackをadapterへ集約。S gateが必要 | 空回答防止・保守的History再読込だけなら新SDK runtime知識への依存を抑えられる。Stopを追加する場合は別途S/H gate | 現行SDK/onFinish依存を維持。未確認挙動もそのまま |
| 移行負担 | client/server/schemaの互換、全v1 writer drain、限定有効化、status継続が必要 | 既存wireを維持。古いclientも残るため、未保存表示の普及を一斉保証しない | 導入なし。将来移行の負担・リスクは先送り |
| テスト・検証ゲート | T01〜T17のO/S/H/D/B、移行・rollback rehearsal。実AI/Sessionはさらに独立許可 | T01/T08/T13/T14の限定O、H、B。route/UI結合の保存結果差を確認。Dなしなら実DBの保存/競合保証は主張しない | C25の既知リスク記録を維持。今回の静的確認で新たなruntime合格は作らない |
| rollback | 新v2受付停止、in-flightを現契約で終了/照合、status/History維持。追加schema保持。v2へのv1書込再開は禁止候補 | UI/route差分のrevert候補。戻すと空AI/誤認リスクが復活する。既に保存した履歴は自動改変しない | 新規変更のrollbackなし。停止/障害への新回復策もなし |

Bの境界を先に固定する。識別子なしの段階では、EOF/例外後にHistory全体を取得し、返った保存済みIDの履歴を表示するだけとする候補。rawの暫定枠は正常回答として残さず、当該送信の結果は未確認表示のままにできる。GETに同文や最後のAIがあっても、その送信の成功とは断定しない。GET失敗や反映待ちを「未保存確定」にせず、自動POST/再生成もしない。
安全に特定turnへ「保存済み/未保存」を付けるにはrequest識別と保存USER/AI IDの対応が必要であり、単なるheader追加や本文比較では解決しない。

採用推奨は**Bの限定改善候補→Aの証拠取得・段階実装**。Bで十分とする判断やAの有効化は別承認とする。必要gateを許可/実施できない場合はCを継続追跡する候補だが、Error handling完了やリスク受容の承認とは扱わない。

## 4. Proposed parameter values

以下はすべて**未承認の仮値/契約候補**。計測に基づくSLOやprovider/platformの公称制限ではない。生成時間分布・DB遅延・実行基盤のrequest上限を今回は測っていない。採用前に予算を確認し、変更する場合は対応gateとclient/server/schema互換を再レビューする。

| 項目 | 推奨値・候補契約 | 根拠と変更時の影響 |
| --- | --- | --- |
| 同一attempt再送 | client生成UUIDを送信前に保持。uniqueはConversation×actor×key、fingerprintはprotocol/operation/trim済みmessageまたはUSER ID。同key同payloadは照合だけ、RUNNING等は202 JSON、終了済みは200 JSON。同key異payloadは409 | 本文一致で意図的再質問を消さず、commit応答喪失から戻れる。同keyで生成再開する変更はat-most-one SDK呼出候補を壊し、T09/T10を変更する |
| 新規再生成 | 新key＋regenerate＋自分の末尾未回答v2 USER ID。USER件数は増やさない。保存済み/非末尾/legacy/他Userは409または認可上404。同文の新sendは新key＋新USER | USER所有はattemptから検査し、対象USERはpromptに1回。対象拡大は履歴分岐/共有所有設計を要する。T11/T14/T15 |
| Abort確定 | Stop/切断は要求。server観測後、同じConversation→attempt lockとversion/fence検査でABORTED/NOT_SAVEDをcommitして確定。provider由来Abortはclient Stopと分け原因記録。deadlineはINTERRUPTED候補。既存SAVEDは保持 | client AbortControllerだけではDB結果を証明しない。DB不通はunknown/staleであり確定ABORTEDにしない。stop観測だけで先勝ちにせず、AI commitと中断commitの両順をDで検証する。T03/T04/T12 |
| AIとusage | 独立2保存枝。AIはstop・validated/parse後非空・有効fence・再認可が条件。usageは信頼できる最終観測値、欠けたtokenはnull。最終値なしはUNKNOWN、書込確定失敗はFAILED | usage障害で回答を失わない。UNKNOWNを0に変えたり完了step値を最終totalへ転用すると計測の意味が変わる。T06/T07 |
| generation deadline | **受理commit時刻から120秒**。context/retrieval/SDK開始待ちと生成を含み、heartbeat/延長なし。SDK maxRetriesは**0**。候補範囲は60〜180秒、推奨120秒 | 長い停止を有限にし、retrieval待ちも所有時間へ算入する運用仮値。短縮は正常な長い回答の中断増、延長はConversation占有・外部コスト増。基盤の実行上限が保存余裕を含め不足する場合は値を短縮するか基盤を別検討。S/H/Dで期限境界を要検証 |
| 保存retry上限 | AI/usage各枝で**初回＋追加2回＝最大3 write試行**。再読取照合後だけ同ID・同値をretry。待機は250ms、750ms。初回保存処理の予算は終了観測から**15秒**と受理＋135秒の早い方。DB操作1回の候補timeoutは**5秒**で残予算に短縮。後着usageの時間枠だけは下記の例外 | 短い一時障害を吸収し、無期限保存を防ぐ仮値。timeoutが実SQLを止めるかは未確認であり、応答喪失はunknownとして扱う。callback重複/同keyPOSTでwrite試行数を増やさない。後着usage/null補完も初回分を含む計3試行以内、枯渇後は不足状態を残す。増加は負荷/占有/後着競合を増やす。Dでtimeout・lock・同値衝突を検証 |
| active期限 / expiresAt | **acceptedAt＋135秒**を固定expiresAt候補（120＋保存15）。生成が早く終われば保存枝初回判定の終了で早期解放。DB不明/処理喪失でPENDINGのままなら期限までactive。GETは期限後staleを返すだけ | deadlineとkey TTLを分離する。期限後の許可POSTが既存AI/usageを照合し、旧fence失効・状態確定と新受理を同transactionで行う。期限後AI新規保存不可。期限短縮は生存処理を失効させ得るため、既存行を黙って再計算しない。T10/T12/T16 |
| 状態照会 | result欠落/Stop/例外/reload復帰から**最大6 GET**。開始基準0/1/3/7/15/30秒に1回、同時1本、各5秒上限、全体**35秒**で終了。遅延時は過ぎたslotを飛ばし連続追付きしない。History再取得は各照合サイクル最大1回 | 早い保存を回復しつつ無期限pollを防ぐ。120秒生成より先に照会上限が来ても「未確認/生成中」で停止し、明示再確認へ。回数増は負荷、減は未確認増。401/404/未知protocolは自動確認停止、429はRetry-Afterを尊重し35秒を超えるなら終了。回数枯渇は未保存確定ではない。T08/T14 |
| 照会終了条件 | generationがterminal、answer/usageの初回保存判定がともにPENDING以外なら自動照会終了。SAVEDはusage FAILED/UNKNOWNでも回答保存済みとして表示。後着usage改善は次の明示照会/Historyで反映。認可喪失・画面切替・上限でも終了 | unknownの計測を待ってspinnerを永久継続しない。stale/404だけで新key再生成を許さず、同keyの明示POSTによる照合/回復が先。404時に元payloadがメモリにある場合だけ同key同payloadで再受理を試せる候補。自動POSTはしない |
| attempt key保持 | serverは**Conversation存続中は自動purge/TTLなし**。expiresAtは実行所有の期限でkey失効ではない。terminal/staleでも同keyを新生成へ再利用しない。clientはtab単位sessionStorageにResearch/Conversation/keyのみ、未解決中はtab寿命まで保持、照合完了時に除去 | 有限TTL後の同key再受付による二重生成を防ぐ。本文/Session/tokenをstorageへ追加しない。storage不能・tab終了でkeyを失ったらHistoryへ縮退し、特定attempt成功の推定なし。purge導入にはtombstone/旧key拒否契約・保持削除方針が必須。Conversation削除後は404で再作成しない |
| Conversation同時制限 | actor/tabをまたいで**active 1**。ACCEPTED/RUNNINGに加え、終了後も初回AI/usage判定PENDINGを含む。lockは短いtransactionのみでConversation→attemptの順。異keyactiveは409、同keyreplay優先 | prompt履歴の未確定読みを抑える。正常terminalでも新受理時に旧未保存AIのfenceを失効。別Conversationは独立。緩和は並行回答の順序/分岐設計を必要とする。T10/T11/T16 |
| 旧Attemptのfencing | 新受理と旧fence加算を同transaction。旧実行は元fenceのみ使用し、新fenceを再取得して復権不可。未保存旧AIの新規挿入/retry禁止、既存固定AI IDのcommit照合は可 | 遅延旧AIが新turnへ混入するのを防ぐ。旧STOPPED/answer FAILEDは旧失敗として残し、次attemptのSAVEDを転記しない。T07/T12/T14/T16 |
| 後着usage | 旧attemptIdだけに帰属、最大1event。元実行が保持する帰属・最終観測の信頼性を検査し、fence失効後も未作成event挿入/既存null補完を残write試行数内で許す。信頼できる最終値を初めて後着観測した時点から**1回だけ15秒**の保存枠を許し、135秒の所有期限後でもusageだけ適用可能。既知値の加算/上書き不可、衝突は要調査 | AI可否とusageを分離し、active/fence/生成期限は延長しない。version付き更新でusage状態だけ改善し、旧FAILED AIはそのまま。親削除後にFK/帰属を捏造して復活させない。null補完後も必要値不足ならUNKNOWNを維持する。元process喪失後の補完を保証せず、新requestが生成/観測をやり直すこともない。T06/T12/T16/T17 |
| v1/v2切替 | `protocolVersion:2`、send/regenerate排他、version付きSSE accepted/delta/generation-ended/result。重複POST JSONと新規streamはContent-Typeで区別。未知versionは400、v2未提供/旧client非互換は明示拒否（409候補）。flagはserverローカル設定、既定off | generation-ended/200/EOFはSAVED証明ではない。result/statusのcommit済みAI IDとcanonical本文を根拠にする。読取対応→追加schema→共通writer gate→v2 server/client→drain→限定有効化。wire途中のplain text切替不可。T01/T08/T17 |
| drain / rollback | 共通gate対応writerだけになったこと、新v1受付停止、既存v1のUSER/updatedAt/AI/usage・finalizer/retryが完了または同gateで失効したことを確認。同じgate下でv2 modeへ移す。**経過秒数だけのdrain成功判定は設けない** | 現行v1にはdeadline/fenceがないので135秒待っても安全とは言えない。所有予約/modeのdurable表現、全writer監査、確認不能時の受付停止をD09の残ブロッカーとする。rollbackは新v2停止、in-flight終了/照合・読取維持、schema保持、v2 Conversationのv1再開なし |
| 権限取消時の保存 | 入口だけでなくAI保存transactionと取消writeを共通gateで直列化。取消先行ならAI NOT_SAVED、保存先行なら既存AI保持。観測usageは内部保持、外部読取は401/404で拒否 | 認可読取→別writeだけでは取消競合を防げない。usageに本文/認証情報を追加せず、保持対象/削除/匿名化の最終方針はPending。共通gateへ取消経路を含められないなら「取消後保存なし」の保証を採用しない。T17 |
| durable workerなしの損失許容 | **未commit本文と未記録の最終usageの全量喪失が1attemptでも起こり得る**ことを許容する候補。durableに受理済みのUSER/attemptとcommit済みAI/usageは照合対象。損失率や件数の上限保証なし | request/process終了、基盤の強制終了、全DB停止では15秒retryでも復元できない。未保存payloadを保持しない以上、元回答のdurable回復は約束不可。0損失が必要ならP3へ戻り、I2以降の設計範囲を見直す。T16 |

予算の例: t0＝受理commit。t0＋120秒で停止を要求し、AIと初回usage保存の試行は遅くともt0＋135秒まで。statusはその後staleを返せるがGETは書き換えない。次の認可済みPOSTが固定IDを照合して旧fenceを失効させる。元実行がt0＋140秒に初めて最終usageを観測できた場合、usage枝の残試行数でt0＋155秒まで補完を試せる候補だが、旧AI保存・生成再開・active延長は許さない。deadline後にproviderが止まった、DB timeoutでcommitがなかった、とは推定しない。
DBのread/transaction timeoutとretry予算の表現は未実証であり、値の承認だけでこの時間内の動作保証は成立しない。

## 5. Blocking dependencies

### 5.1 仕様判断と実証の分離

PR #26 [T01〜T17](phase10-chat-stream-reliability-design.md#7-acceptance-tests)は全て新仕様について**Not run**。C25を新仕様Passへ移し替えない。O/S/H/D/Bは同設計Section 7.1のgateを指す。

| ケース | 仕様だけで決められる事項 | 採用/実装を成立させるために別途必要な実行証拠 |
| --- | --- | --- |
| T01 正常 | 保存成功の根拠はcommit済みID/canonical、三軸状態 | Oで契約、SでSDK終了、HでSSE/result、Dで原子性、Bで表示一致 |
| T02 stream error | partialを正常AIにせずresult欠落はreconciling | Sでerror partとthrow、Hでwireの差、Bで解除/再操作。Oだけでは実順序不可 |
| T03 Stop | 中断commitとAI commitの先勝ち、USER保持 | S/Hでsignal/cancel伝播、Dで両順競合、BでStopと遅延delta無視 |
| T04 provider abort | 原因をclient Stopと区別、usage欠落を0にしない | SでAbortError/onAbort/error形態。実provider挙動/課金は別AI許可でのみ検証可能 |
| T05 開始失敗 | 受理後USER保持・同key再実行なし | Oで各開始段階、Sで非同期開始error、H/Dで受付commitと結果回復 |
| T06 usage失敗 | AI保存と独立、同値usage最大1件 | Dでusage commit前後の応答喪失/unique、H/Bで回答維持と計測警告 |
| T07 AI失敗 | usage保持、未確認を未保存確定にしない | DでAI transaction/応答喪失と照合、H/Bでunknown→SAVED/FAILED |
| T08 通知喪失 | bounded status、EOF非成功、自動再生成なし | Hでcommit前後切断・GET障害、Dで保存事実、Bで復帰/上限表示 |
| T09 同key | 同payloadは照合のみ、異payload409 | Oでfingerprint、H/Dで実並行replayと最大1SDK所有者 |
| T10 二重POST | active1・同key優先・異key409 | Dでbarrier同期/unique/lock/件数、Hで別request。process内doubleは代替不可 |
| T11 同文別key | 意図的な新sendを消さない | H/Dで別attempt/usage、Bで同文操作区別 |
| T12 callback重複 | generation後退なし、旧AI不可、旧usage限定補完 | Oで重複順序、Sで実SDK観測、Dで新受理と旧AI両順/usage衝突。SDK実重複発生は前提にしない |
| T13 引用後空 | validated/parseとも非空、fallback非保存 | Oで実validator/parser、S/Hで空終了経路、Bでrawが正常表示に残らないこと |
| T14 History | ID置換、再生成/新send区別、旧turn保持 | H/Dでstatus/History整合、Bでmount/reload/New/別tab/focus/旧alert解除 |
| T15 再生成 | actor所有・末尾未回答限定、USER追加なし | Oで条件、Dで並行末尾変化、H/Bで拒否・prompt対象1回 |
| T16 crash/期限 | 135秒候補・stale・fence・payload喪失許容 | H/Dでprocess喪失、全DB停止、期限回復、旧callback/usage後着。仮時計mockだけでDB保証不可 |
| T17 境界/移行 | 401/404/400/409、取消後AI拒否、legacy互換、rollback受付停止 | Oで入口拒否、H/Dで取消・削除・v1保留/切替両順、Bで旧client拒否・回復。通常逐次POST成功だけではdrain証明不可 |

### 5.2 特に実装前に解消するブロッカー

| 依存 | 静的に確認できたこと / 安全な追加調査 | 未取得の証拠と停止条件 |
| --- | --- | --- |
| SDK終了coordinator | onFinishは全経路共通finallyではなく、onAbort呼出に非await経路あり。型上Promise可能でも永続化完了を意味しない。fullStream/textStreamの消費・cancel・error変換をソースで追跡できる | Sでstop/error/abort/cancel、callback throw、消費停止を順序ログ付きで実行し、所有finalizerのawaitとエラー回収を確定。Hでrequest.signal/response cancelとの接続を確認できるまでA2の保証を実装前提にしない |
| Prisma表現 | rc.12 [contractガイド](../../.agents/skills/prisma-8/references/contract.md)にはunique/FK/partial index/@@check、[runtimeガイド](../../.agents/skills/prisma-8/references/runtime.md)にはdb.transaction(async tx)とtx.orm/sql/query/executeの説明あり。CHECKのSQL自体は構文検証されない。Prisma 7の$transaction等を推定しない | 複合key、nullable unique/FK、固定AI PK、enum/check、active制約、Conversation→attempt lock、CASのaffected判定、取消との直列化をrc.12でどう表現するか未確定。transactionがあるだけでrow lockや分離レベルの保証にしない |
| contract/migration | 既存contractに新attemptなし。型/source・artifacts・migration形式の静的レビューは可能 | 後続で許可されたemit/typecheck/planのartifact証拠、さらにDで実unique/null複数/FK/lock/timeout/rollback/index lockを確認。ここではCLI未実行。保持/onDelete未決定のままmigrationを確定しない |
| 実DB競合 | mockは呼出順/期待件数を再現するが、DBのcommit・隔離・deadlock・応答喪失後の状態を証明しない | Dで同/異key並行、Abort対AI、旧AI対新受理、null補完衝突、membership取消/削除対保存を両commit順で記録。lock順とfence検査writeの原子性が不明なら有効化不可 |
| v1 drain | v1のUSER/updatedAt/usage/AI writeは別々で、事前flag後も遅延write可能。v2だけのfenceではv1を失効できない | durableなwriter予約/modeと全writer対応の設計が必要。H/Dでv1を「初回USER前」「USER後/onFinish前」に保留し切替と競合させる。旧binary/切断後finalizer/保存retryが不明ならdrain未完了としてv2停止 |
| 実行基盤と喪失 | 120/15/135秒は設計予算。request終了後callback継続やprovider停止をローカルソースだけで保証しない | 基盤上限・強制終了・crash時の回復を別許可gateで確認。D07の喪失許容が得られない場合はP3設計へ戻す |

全てを実行前にコードだけで決め切る必要はないが、**仕様選択への承認**と**その保証を支える実行証拠**を別々に満たす必要がある。特にI1のSDK観測、I2のPrisma表現/実DB競合、I5のv1 drainは、後段の有効化から省略できない。

### 5.3 調査・実行の許可境界

| gate | 今回できること | 後続で必要な別許可と証明範囲 |
| --- | --- | --- |
| 静的offline調査 | Git、文書/ソース/型/既存テストの読取、Markdown/空白/差分検査。本書作成 | 外部資料が必要になった場合はsource-memoに従い対象版の一次資料を調べ、静的所見と実行結果を分離 |
| O: offline実行 | 今回は**未実行**。既存テストは読むだけ | 後続タスクで純粋state/parser・固定auth/DB/SDK double・合成streamの実行範囲を許可。実SDKをimportして動かす試験をOへ紛れ込ませない |
| S: SDK | 型/ソース読取のみ | 実SDK＋固定in-memory providerのruntimeを別承認。外部fetch禁止、実AI/DB/Sessionなし。順序とcallback形態を証明し、provider実停止/請求は証明しない |
| D: DB | contract/既存artifactの読取のみ | 接続先identity、隔離、fixture/write/cleanup/migration範囲を個別事前承認。SDK/HTTP許可から実DB許可を推定しない |
| H: HTTP | route/clientソース読取のみ | server起動、target、port、egress、固定adapterを別承認。production buildが要る場合はbuildも別承認 |
| B: Browser | handler doubleの既存記録参照のみ | browser/serverを別承認し、実Session利用はさらに個別許可。DOM/focus/spinner/History操作を確認するが、mock browserだけで実DB/providerを保証しない |
| 実AI/embedding/Session/Cloud | 今回すべて禁止 | 各対象・費用/回数・データ/保持・削除範囲を含む独立した実行許可が必要。S/D/H/Bの許可とは別 |

## 6. Recommended implementation sequence

次は順序の推奨のみ。どの段階も今回着手しておらず、実装開始/リリースの承認を意味しない。

1. **I0判断レビュー**: Section 7でA/B/C、D01〜D10、仮値・損失範囲を個別に選ぶ。Pendingを解消し、承認対象と証拠条件を記録する。enum/response schemaはPR #26 Section 5.2/5.3を出発点に、public failureCodeと再操作可否までレビューする。
2. **Bの限定改善候補**: 承認された場合に検証/parse後空AI防止、raw暫定表示と保守的History全体再読込を小さく実装。Oの対象はT01/T08/T13/T14の限定範囲。H/Bは別許可。特定attempt照合やStopを追加するなら範囲を再定義し、Bだけで信頼性受入完了にしない。
3. **I1 SDK観測**: 実行範囲を別承認後、Sでerror part/throw/abort/cancel/flush/callback例外の順序を固定providerで記録し、共通finalizer契約をOで検証。未確認順序に依存するI3実装を先に進めない。
4. **I2 durable attempt/共通gate設計・実装候補**: 保持/onDelete、Prisma制約・transaction/lock表現、固定ID・一意usage・fence・三軸状態をレビュー。許可後にartifact/migrationを作成し、隔離DでT06/T07/T09〜T12/T15〜T17を検証。v1の全writerへ共通所有gateを先行導入する設計もここで固める。
5. **I3/I4 v2とclient候補**: flag offのまま独立保存、signal/deadline、SSE/result/status、再認可、旧client拒否、canonical/History復元を実装。O/S/H/D/Bの対応ケースを満たし、120/15/135秒と照会予算を実測で再評価。仕様差が必要ならI0判断へ戻す。
6. **I5移行判断**: 対応reader/schema/server/clientと全writer gateを揃え、v1受付停止・drain・切替競合とrollbackをrehearsal。drain証明がないConversationはv2を受理しない。別リリース判断後に限定有効化し、unknown/FAILEDを観測する。P3なしの損失をゼロと宣言しない。

採用後の実装PRでのみarchitecture/routes/data model等の該当仕様を更新する。B/Aの一部完了はError handling全体完了やPhase 10チェック追加を意味しない。roadmap更新は承認された受入完了時の別判断とする。

## 7. Explicit approval checklist

全て未チェック。ユーザーの明示承認がないものをApprovedへ変更しない。仕様承認はSDK/DB/HTTP/Browser等の実行許可、migration適用、リリース許可を兼ねない。
承認記録は「ID、選択肢/値、条件、残gate、承認者・日付」を残し、条件付き承認でも未取得証拠をPassにしない。

- [ ] D10: A/B/Cの採用範囲、B先行の有無、実装PRの分割と出口条件。
- [ ] D01: 同keyは照合のみ、新key再生成の対象、意図的同文send、所有不明legacyの除外。
- [ ] D02: retrieval前受理、失敗USERの保持、promptからの未回答旧USER除外とpreview/updatedAtへの影響。
- [ ] D03: best effort Stop、server側中断commitの確定条件、先行保存保持、provider停止/課金停止保証なし。
- [ ] D04: AI/usage独立保存、UNKNOWN/nullと片側失敗表示、課金台帳完全性を要求しない範囲。
- [ ] D05: validated/parse後非空、raw暫定表示、canonical置換、部分本文/fallback非保存、既存履歴非修復。
- [ ] D06: active 1、SDK retry 0、生成120秒（候補60〜180秒）、保存15秒/各3試行/250・750ms/操作5秒、expiresAt 135秒。基盤予算・timeout表現の証拠条件。
- [ ] D06: status最大6回（0/1/3/7/15/30秒）、操作5秒/全体35秒、History最大1回、上限後未確認・明示再確認、自動POSTなし。
- [ ] D01/D06: server keyはConversation存続中purgeなし、clientはtab寿命まで未解決keyのみ保持、期限後も同key新生成なし、key紛失時の縮退。
- [ ] D06: 旧AI fence失効と旧FAILED表示の維持、後着usageだけnull補完・計3試行の残枠内、初の後着最終値観測から1回だけ15秒（135秒期限の例外）、既知値衝突の扱い。
- [ ] D07: durable workerなしで未commit本文/未記録最終usageを全量失い得ること、0損失/損失率上限を保証しない範囲。許容不可ならP3へ戻す。
- [ ] D08: 取消とAI保存の共通直列化、取消後AI拒否/観測usage内部保持、User/Research/Conversation削除時の保持/匿名化/onDelete方針（Pending解消が必要）。
- [ ] D09: v2 schema/status/event/public failureCode、feature flag off、legacy状態未記録、旧client409とsessionStorage key保持。
- [ ] D09: durable writer予約/mode、全旧writer対応/隔離、v1全write/finalizer/retryのdrain証明、確認不能時の停止、rollback時v1再開禁止とschema/読取維持（Pending解消が必要）。
- [ ] Section 5: T01〜T17の証拠条件と未取得gateを維持し、後続実行許可を個別に扱う。

## 8. Safety boundaries

今回の成果物は本書1ファイルの新規作成のみ。PR #26設計からの追記参照は必須ではないため追加せず、設計・品質受入の過去記録を保持する。
本番コード・テスト・contract/schema・artifacts・migration・依存・lockfile・roadmapは変更しない。
SDK runtime、Prisma CLI、実DB/Session/OAuth/AI/embedding、HTTP server、browser、build、Cloud操作、commit/push/PR作成/mergeは実行しない。

実施する検査はGit差分（新規未追跡ファイルも対象）・空白・Markdown相対リンク先/内部anchor・最終statusのローカル静的確認に限る。これらは新仕様の受入テストではない。
**本書を未コミットで停止し、採用推奨とApprovedを区別する。Error handlingはPartial、Phase 10は4/11完了のまま。**
