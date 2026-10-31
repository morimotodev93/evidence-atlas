# Phase 10 — Chat Stream Reliability Design

## 1. Context

作成日: 2026-10-22（JST）。対象: `morimotodev93/evidence-atlas`、PR #26向けの設計・静的調査。
**提案段階であり、採用・実装・Phase 10受入完了を意味しない。** Error handlingはPartialを維持する。

開始時に以下を確認した。想定外の変更はなかった。

| 項目 | 確認結果 |
| --- | --- |
| branch | `docs/phase10-chat-stream-reliability-design` |
| HEAD / 指定Base HEAD | `1d88c6eb640d1561379bd5db273964aeb90903e2`（一致） |
| worktree | `C:/Users/owner/Desktop/sm-dev/evidence-atlas` の1個のみ |
| Git status | 同branch、追跡差分・未追跡ファイルなし |
| origin | `https://github.com/morimotodev93/evidence-atlas.git`（ローカル設定の確認のみ） |

目的はPR #25で整理された再送・Abort・部分保存・完了通知の問題について、実装前に契約と受入条件を比較すること。
[調査方針](source-memo.md)に従い、証拠を次のように区別する。

| 記号 | 証拠と限界 |
| --- | --- |
| S | 今回の静的読取。Base HEADのコード・文書・インストール済みSDKの型とソースから確定する構造。実行結果ではない |
| C25 | [PR #25のオフライン検証記録](phase10-quality-acceptance.md#pr-25--chat-stream--abort-error-handling2026-10-22-jst)と現存テスト。固定mockによる合成結果。今回の再実行ではない |
| U | 実SDK、HTTP切断、実DB、React mount / browser等で未確認。SやC25の結果から保証しない |
| P | 本書の設計提案・期待動作。現在の実装や採用済み仕様と混同しない |

主な一次資料（すべてローカル読取）:

- [Chat route](../../src/app/research/[id]/chat/route.ts)、[panel](../../src/app/research/[id]/_components/research-ai-panel.tsx)、[routeテスト](../../src/auth/chatRoutes.test.ts)、[panelテスト](../../src/app/research/[id]/_components/research-ai-panel.test.tsx)。
- [Conversation detail GET](../../src/app/research/[id]/chat/conversations/[conversationId]/route.ts)、[list / create](../../src/app/research/[id]/chat/conversations/route.ts)、[Research認可](../../src/auth/requireResearchAccess.ts)、[Workspace認可](../../src/auth/requireWorkspaceAccess.ts)。
- [contract](../../src/prisma/contract.prisma)、[data model](../architecture/data-model.md#710-conversation-and-message)、[AI architecture](../architecture/ai-architecture.md)、[引用関数](../../src/lib/ai/source-citations.ts)、[rate limit](../../src/lib/ai/chat-rate-limit.ts)。
- [Phase 10受入文書](phase10-quality-acceptance.md)、[PR #23レビュー](../archive/phase10-offline-quality-gates-review.md)。PR #25の古いエラー残留記録は履歴であり、末尾follow-upと併読する。
- インストール済み `ai@6.0.280` の `node_modules/ai/src/generate-text/stream-text.ts`、`src/text-stream/create-text-stream-response.ts`、`src/util/prepare-retries.ts`。`@ai-sdk/google@3.0.127`、`@prisma/orm-postgres@8.0.0-rc.12`。package.jsonの範囲指定だけからバージョンを推定していない。pnpm指定は `12.9.1`。外部サイト・APIは参照していない。

## 2. Current behavior

### 2.1 処理順序（S）

| 順序 | 現行処理 / ソース位置 | エラー・Abort・切断・保存失敗時の状態 |
| --- | --- | --- |
| 1 クライアント送信 | panel `handleSend`（113–175行）。有効入力でsendError解除、input消去、USERと空assistantを仮追加。`{conversationId,message}` をPOST | fetchにsignalなし、Stopなし、attempt識別なし。fetch/read失敗時は今回の2表示を除去し汎用alert。draftは戻らない。以前のturnは保持 |
| 2 認証・認可・rate limit | route 30–140行。C2拒否 / Public Demo 404 → auth → ResearchのWorkspace membership → JSON検証 → Researchに属するConversation → Workspace×Userの10回/分 → context → retrieval → history昇順 | 未認証401、アクセス不可404、不正入力400、制限429。ここまでの失敗では新USERなし。予期しない例外はthrow。retrievalは実運用でquery embeddingを含む。中断の明示検査なし |
| 3 USER保存 | route 142–146行。毎POSTで新規Message | 保存rejectは後続を止める。後段とtransactionなし。通信断でcommit結果が不明なら有無は読取確認が必要 |
| 4 Conversation更新 | route 148–153行。`updatedAt` 明示更新 | rejectならUSERだけ残り得て生成なし。更新済みでも後段失敗をrollbackしない。AI保存時の追加更新なし |
| 5 streamText開始 | route 155–202行。過去Message全件＋今回USERをprompt化 | 同期throwならUSER・Conversation更新が先に残る。request.signal未転送。`onError` / `onAbort`未登録。SDK開始が成功しても生成成功ではない |
| 6 ストリーム送信 | `toTextStreamResponse()`（204行）、panelのreaderループ | raw textを送る。finishReason・保存結果の独自通知なし。ヘッダー送信後のエラーは別HTTP statusに変更できない。error partとread rejectと切断は同一ではない |
| 7 onFinish | route 175行。routeの唯一の保存callback | 呼ばれるかはSDKの消費・終了経路次第。全error/abortでの実行保証なし。重複実行防止なし。切断後に呼ばれるかもU |
| 8 usage保存 | route 176–188行。finishReasonや本文を判定する前にAiUsageEvent作成。未提供tokensはnull | rejectでcallbackを抜け、引用検証・AI保存へ進まない。USER・Conversationは残る。callback未実行ならusageも追加されない |
| 9 引用検証 | route 190–194行。`stop`かつraw `text.trim()`非空のみ。現在Research / retrieved FINDINGのSource集合で検証 | 非stop・raw空白はusageだけ。validatorは未許可の認識可能markerを除去し正規化する。検証例外ならusageは先に残る。検証後の空本文を検査しない |
| 10 AI保存 | route 196–200行。validatedTextを新規Messageへ保存 | rejectならUSER・usageが残る。検証後空文字でも保存可能。冪等制約なし。raw streamと保存本文は一致する保証なし |
| 11 クライアント完了・History更新 | panel 177–201行。正常EOF後detail GETでSourcesのみ更新、finallyで送信中解除 | GETのmessagesは照合しない。GET失敗もconsoleのみ。部分/空本文のEOFを完了と区別できず通常表示が残る。History選択時だけ保存messages全体に置換（204–248行） |

認証・認可は独立した境界であり、Conversation ID一致やretrievalのWorkspace filterだけでは代用できない。
rate limitはアプリのリクエスト制限であり、生成成功・provider請求・usageの正確性の証明ではない。

Abort / 接続切断について表の各保存段階に共通する現行規則は、次のとおり（S / U）。
request body読取がAbort由来でrejectした場合はSyntaxError以外をthrowする。USER保存・Conversation更新・SDK開始の前後にsignalを確認する処理はなく、Abortだけを理由に既存writeを取り消さない。
stream開始後の切断はSDK消費・cancelに影響し得るが、onFinish到達と保存の継続はU。onFinishへ到達した後のusage→引用検証→AI保存には独自のAbort抑止がなく、到達したwriteはその通常の成功 / 失敗規則に従う。
clientの例外表示や送信中解除も、serverの保存rollbackを意味しない。

### 2.2 モデルとHistoryの限界（S）

ConversationはResearchに属し、MessageはConversation、authorType（USER/AI）、content、createdAtを持つ。
Messageには送信者User、attempt、状態、USERとAIの対応関係がない。AiUsageEventはWorkspace / User / Research / Conversationのscalar帰属とprovider / model / tokens / finishReasonを持つが、これらの帰属IDにFKはなくattemptもない。
現在の制約では同じ送信・callbackによる複数Message / usageを排除できない。

detail GETはResearch認可とConversation所属確認後、保存MessageをcreatedAt昇順で返し、AIの引用Sourceを現在のWorkspaceから解決する。
list GETはConversation.updatedAt降順で、先頭USERをpreviewに使う。
本文一致や「最後のAI」だけでは、同文の再質問・別タブ・同時POSTを正しく対応付けられない。

### 2.3 SDK静的所見と未確認範囲

`ai@6.0.280`の `stream-text.ts`（型178–255行、実装1202–1388行、2587行以降）から以下を確認した（S）。

- `abortSignal`、`onError({error})`、`onAbort({steps})` を受け取る。onAbortのstepsは**完了したstep**であり、進行中生成の最終usageを保証しない。
- flushでrecordedStepsがない / no-output errorがある場合はonFinish前にreturnする。通常経路ではonFinishをawaitし、例外はcontroller.errorへ進む。onFinishは全障害の共通finallyではない。
- abort処理はonAbort呼出とabort part送出の経路を持つ。表示readerのcancel、request.signal、providerへの停止伝播は別の境界。onAbort型がPromiseを許しても、この呼出箇所はawaitしていないため、永続化をcallback任せにしない設計が必要。
- `textStream`はtext-deltaだけを抽出する。error / abort / finish partを独自の保存結果として通知しない。stream自体のrejectは別途あり得る。plain text Responseの既定は200。
- 現行routeはSDKの `maxRetries` を指定せず、インストール済み実装の既定は2。アプリのPOST回数、streamText呼出回数、provider試行回数、usageイベント数を同じものと数えない。

callbackと消費・cancel・error partの実際の順序、callback例外のHTTP通知、Next.jsの切断からrequest.signalへの伝播、providerの停止・usage報告はU。
ソースの分岐があることと、その環境で分岐が実行されたことは区別する。

## 3. Failure and persistence matrix

### 3.1 現行の結果

件数は1回の新規POSTを基準にした **USER / AI / usage**。C25の「保存」はwrite doubleのresolveであり、実DB commitではない。

| 条件 / 証拠 | 件数・残る状態 | クライアント / 不明点 |
| --- | --- | --- |
| 正常stop＋非空＋全write成功（S、C25既存テスト） | 1 / 1 / 1、Conversation更新1 | liveはraw、Historyはvalidated。保存通知なし |
| 認証・入力・制限・context / retrieval失敗（S） | 0 / 0 / 0、更新なし | HTTP拒否またはhandler throw。embedding等の先行副作用までなしとは主張しない |
| USER保存失敗（S） | 確定rejectなら0 / 0 / 0、更新なし | commit応答喪失ではUSERの存在不明。独自回復なし |
| Conversation更新失敗（S） | USER 1、AI / usage 0。updatedAt更新は失敗 / 不明 | handler throw。USERだけ残り得る |
| USER保存後、生成同期開始失敗（C25） | 1 / 0 / 0、更新1 | handler reject、Responseなし。実HTTP statusは未確認 |
| partial後read error、callbackなし（C25） | 1 / 0 / 0、更新1 | 合成Response 200→read reject。panelは新turnを除去、再操作可能 |
| reader cancel、callbackなし（C25） | 1 / 0 / 0、更新1 | 合成cancelは1回。実SDK/provider停止の証拠なし |
| request abort後にstop callbackを明示実行（C25） | 1 / 1 / 1、更新1 | SDK optionにsignalなし。実切断での継続・課金はU |
| provider abort通知（U） | 一律には確定不可。USERは到達済みなら残り、AI / usageはcallback経路次第 | 現行に専用状態・通知なし。合成AbortErrorはprovider通知の検証ではない |
| 非stop（length / content-filter / tool-calls / error / other）、raw空白stop（C25） | 1 / 0 / 1、更新1 | 合成partial / 空の正常EOFでもpanelは保存未完了を識別しない |
| usage保存reject（C25） | 1 / 0 / 0、usage試行1、更新1 | 固定200本文と手動callback rejectを別assert。実wireはU |
| 引用検証で例外（S） | 1 / 0 / 1、更新1 | 後段AIなし。通常validatorは純粋な文字列変換 |
| AI保存reject（C25） | 1 / 0 / 1、AI試行1、更新1 | usageをrollbackしない。実wireはU |
| 引用検証後に空（C25、実validator使用） | 1 / 空AI 1 / 1、更新1 | 正常回答の受入には数えない |
| 失敗後同文を手動再POST（C25） | 合計2 / 1 / 1、更新2、streamText 2 | 2回目promptにもUSERが2つ。意図的な再質問と区別なし |
| callbackを手動で2回実行（C25） | 1 / 2 / 2、更新1、streamText 1 | SDKが重複配信する証拠ではなく、防御不在の証拠 |
| 同時二重POST・commit応答喪失（Sによるリスク、U） | unique key / transactionがなく重複・結果不明を防げない | 実DB競合・順序は未測定 |
| 保存成功後の切断 / 完了通知喪失（Sによる限界、U） | 保存成功でもclientが知らない場合がある | 逆に200 / 正常EOFでもAI未保存の場合がある |

PR #25初回記録はroute64＋panel7＝71件、全体67ファイル / 1,464件。
follow-upは有効な再送開始時の `setSendError(null)` とpanelテスト補完によりroute64＋panel9＝73件、全体67ファイル / 1,466件と記録されている（C25）。
**古いalertの残留は現HEADで修正済み**。未完了AIの判別・Abort・重複・部分保存まで修正済みとはしない。
panelのfixtureはuseState doubleとhandler / JSX propsの検査であり、React mount、DOM、dialog実操作、unmount、ネットワークは未検証。

### 3.2 既存仕様との関係

[AI architecture](../architecture/ai-architecture.md)の「未完了AIを完成回答として保存しない」という原則に対し、検証後空AIと正常EOFの未完了表示は受入上の不足。
同文書が記す「raw非空 / stopのみ保存」「retrieval後USER保存」「plain text」は現コードと一致する現行契約であり、本提案で変える部分は承認が必要。
本書を根拠に既存仕様・過去結果を上書きせず、実装PRで採用された差分のみ更新する。

## 4. Design alternatives

### 4.1 Retry

ここでattempt keyは**論理的な1生成要求**を識別する。HTTP再送は同じkey、意図的な同文再質問は新key。
失敗した生成のやり直しは新key＋既存USER参照とし、同じkeyの再POSTと区別する。

| 案 | USER重複 | AI重複 / usage二重計上 | 評価 |
| --- | --- | --- | --- |
| R1 client生成keyをDB制約で受理、同keyは状態 / 結果を返す | 同keyでは1件。新keyなら同文でも独立して残せる | attemptにAI・usageを一意対応させればcallback再実行も抑止。providerの重複請求保証とは別 | 推奨の中心。key、payload一致検査、期限切れ回復が必要 |
| R2 既存USER IDを指定して再生成 | USERを増やさない | USER IDだけでAI / usageをupsertすると、正当な複数生成の計測を消す。生成ごとのkeyが別途必要 | R1と組み合わせる。過去USERに対する無制限再生成はHistory分岐を招く |
| R3 毎POSTを新turnとして記録 | retryも新USER。同じ質問の重複を許容 | callback一意化がなければAI / usageも重複。callbackだけ守ってもPOST単位の多重生成は残る | DB変更を減らせるがPR #25の再送問題が残る。第一候補にしない |

本文hash単独のdedupは不採用候補。同文の意図的再質問を消すため。hashは同keyで内容が変わっていないことの検査にのみ使う。

### 4.2 Abort

| 案 | USER / AI / usage方針 | 利点と限界 |
| --- | --- | --- |
| A1 表示だけ停止し、serverは完了保存を続ける | USER保持、stop回答保存、観測usage保存 | 実装は小さいが、Stop後も生成・課金が進む。UIで「表示停止」と明示する必要 |
| A2 client AbortController → fetch.signal → server request.signal / deadline → SDK.abortSignal | USERとattemptを保持。serverが中断を確定した生成は正常AI保存なし。usageは観測分のみ保存 | 推奨。onAbort / onError / stream例外を共通終了処理に集約。provider停止や最終usageを保証しない |
| A3 Abort時にUSER削除・部分AI保存 | 履歴を消す / 部分回答を残す選択 | USER削除は既存prompt・監査・再送対応を壊す。部分AIには新たな状態とprompt除外が必要。初期段階では採らない |

A2では「Stop操作済み」「server中断確認」「provider停止確認」を同義にしない。
signalがserverへ届かず先に保存された場合はHistoryを正とし、完成済み回答が見つかったことを示す。
provider由来のabort / AbortErrorも、ユーザー操作と同じ発生元だと推定しない。

### 4.3 Persistence

| 案 | 成功・失敗の分離 / transaction | 評価 |
| --- | --- | --- |
| P1 AI＋usage＋状態を1transactionで保存 | 全成功か全rollback。USER受理は別transaction。usage障害でAIも保存不可 | 不整合は減るが生成コストの記録も失われる。usage単独保持の目的と合わない |
| P2 AI＋回答状態、usage＋計測状態を別の短いtransactionで保存 | AI失敗・usage成功、AI成功・usage失敗を別状態にする。一意制約＋同値再試行 | 推奨。AI保存をusage成功に従属させない。部分成功と結果不明をUI / statusで表現できる |
| P3 終了payloadをdurable outboxへ保存してworkerが再試行 | crash後も再保存できる | 可用性は上がるが新payload保管・worker・監視が必要。実行payloadを保存しない既存原則との合意も必要。初期案には含めない |

P2もDB全面停止・process終了で両writeと状態保存が失敗すれば、内容やusageを確実には回収できない。
bounded retryで解消しなければ「保存未確認」とし、未観測usageを0にしない。再生成とDB書込retryを混ぜない。

### 4.4 Completion notification

| 案 | 200 / EOF後の証明と回復 | 評価 |
| --- | --- | --- |
| N1 plain text維持＋attempt IDとHistory / status照合 | EOF後必ず当該attemptの保存Message IDと状態を確認。GET未反映なら上限付き再確認 | 小さなtransport変更。照合なしの「最後のAI / 同文」では不十分。生成状態が別途必要 |
| N2 version付き構造化イベント | delta、生成終了、保存結果を別イベントで通知。最終イベントはcommit結果から作る | 推奨。UIの状態を明確にできる。SDKのfinish partだけではDB保存成功を表せない |
| N3 streamをやめ、全処理後JSON応答 | 応答に保存IDを含められる | 待ち時間増加。最終JSON喪失も残るためkeyとstatus照合は必要 |

**HTTP 200も正常EOFもAI保存成功の証拠ではない。** N2でも最終イベントは通信で失われる。
受領しなかったclientは結果不明としてstatusを照会する。通知は再取得可能な永続状態の写像とする。

### 4.5 Citation / 正常回答

| 案 | 空本文・rawと保存本文の差 | 評価 |
| --- | --- | --- |
| C1 rawを完成回答として残し、Historyだけ検証 | 空AIや本文差が見えにくい。保存後の判定でもliveの誤引用は取り消せない | 現状の不足を残す |
| C2 rawは暫定表示、最終検証後の本文で置換 | validatedText.trimと、parse後の表示本文.trimの両方を検査。引用だけの回答も未完了扱い | 推奨。raw / validated差を許容し、完成表示とHistoryを一致させる |
| C3 検証可能になるまで本文をbufferし、固定fallbackを返す | 不正markerの途中表示を減らせるがstream体験を弱める。fallbackをAI回答と誤記録するリスク | 初期は固定fallbackを保存せず、UIの状態メッセージだけにする |

C2の正常回答条件は、生成stop、error / abort確定なし、検証後に表示可能な非空本文、AI保存commit確認の全成立。
usage保存の成否は独立表示し、usage失敗だけで保存済み回答を未完了に戻さない。
引用validatorはmarkerの許可判定であり、主張の真偽や意味上の根拠充足を証明しない。

## 5. Recommended proposal

**P: R1＋制限付きR2、A2、P2、N2、C2を推奨する。未採用。**
論理送信単位を耐久化し、生成・回答保存・usage保存・通知受領を分ける。durable worker / stream再開は初期範囲に含めない。

### 5.1 最小限のデータモデル変更案

以下は概念設計であり、schemaコードやmigrationは作成していない。

| 対象 | 追加案 / 不変条件 |
| --- | --- |
| 新規ChatAttempt | server ID、conversationId、actorUserId、clientAttemptKey、requestFingerprint、userMessageId、aiMessageId?、generationState、answerState、usageState、finishReason?、failureCode?、generationFence、version、expiresAt、createdAt / updatedAt |
| key制約 | `(conversationId, actorUserId, clientAttemptKey)` unique。同keyのfingerprint不一致は409。fingerprintはversion、operation、trim済みmessageまたは既存USER IDを安定した形式で計算 |
| Messageへの関連 | ChatAttemptからUSER / AIの既存Message IDへFK。aiMessageIdはnullable unique。Messageの本文・authorType形式は変更しない。USER IDは再生成attemptから共有可能 |
| AIの一意性 | 新AI IDはattempt受理時のserver IDから決定可能な固定IDとし、Message PKでも重複を拒否。AI作成とattemptのAI参照 / SAVED更新を同じtransactionで行う |
| AiUsageEvent | nullable `attemptId` FK＋uniqueを追加。既存行はnull維持。新経路は1attemptに最大1event。再試行は同じ値で挿入 / 読取照合し、tokensを加算しない |
| scope / 状態 | attempt→Conversation FK。MessageのConversation・authorType整合は同transaction内で検査。状態値・非空本文・固定IDの整合をapplicationと必要なDB制約で守る。制約表現とlockは実装前に確認 |

状態行にstream chunks、prompt、context、raw provider payload、未保存回答全文は追加しない。
必要な観測tokensは既存usage形式でのみ保持し、未知はnull / UNKNOWN。provider / model等も既存usageを利用する。
generation完了とAI / usageのcommitをまとめて「成功」1値に圧縮しない。
複数失敗が同時に起きた場合もanswerState / usageStateを残し、failureCode1つだけで片方を隠さない。
keyの保持期限内は同keyの生成を再開しない。初期案ではConversation存続中にattemptを自動purgeしない。
後から期限付き削除を採用する場合は、古いkeyを新規送信として受け直さないtombstone / 拒否契約も必要になる。

### 5.2 API request / response契約案

既存POST `/research/[id]/chat` に明示的なv2 negotiationを追加する。

```json
{"protocolVersion":2,"conversationId":"c1","attemptKey":"client-uuid","operation":"send","message":"質問"}
```

再生成は新attemptKeyと `operation: "regenerate"`、`userMessageId` を送り、messageは送らない。
初期は「当該Userが作った、未回答でConversation末尾にあるUSER」のみに限定し、既存attemptから所有を検証する。
新turnが続いた後・正常AI保存後・legacyのUSERは409で拒否する。過去turnの分岐再生成は別設計とする。

| 入出力 | 契約案 |
| --- | --- |
| validation | UUID形式key、既知version / operation、空白を除いたmessage非空、send / regenerateの排他を検査。具体的な入力長上限は実装前に既存validationと整合させる |
| 新規受理 | auth → Research / Conversation確認 → 既存key読取 → rate limit → 短い受理transaction。attempt＋USER（再生成時は再利用）＋Conversation.updatedAtをcommit。その後context / retrieval / SDKを開始 |
| 二重POST | transaction内でもkeyを再確認。既存同keyなら再生成せず、進行中202 JSONまたは終了済み200 JSONでstatusを返す。新規受理だけ200 stream。Content-TypeでJSON / streamを明確に分岐 |
| 競合 | 同keyで異payload、異keyで同Conversationのactive attemptがある場合は409。同key replayをactive競合より優先する。429は既存Retry-After契約を維持 |
| 認可・その他 | 既存401 / 404 / 400を維持。対応しないversionは400、v2無効時は明示エラー。受理前の保存障害は5xx＋結果不明として同key照合。受理後の生成開始失敗はattemptに記録し、送れる場合は構造化失敗を返す |
| 構造化stream | `text/event-stream; charset=utf-8`、version付きアプリイベント。既存SDKのUI protocolと同じだとは仮定しない。UTF-8 / SSE framingはSDK gateで検証する |
| 回復読取（新規） | GET `/research/[id]/chat/conversations/[conversationId]/attempts/[attemptKey]`。認可後、現在Userのkeyを検索。見つからなければ404、存在不明時は同key POSTで受理を試せる。別Userのkey存在は漏らさない |
| status JSON | version、attemptKey、server attemptId、単調増加revision、generation / answer / usage状態、finishReason / 公開failureCode、USER ID、保存済みAI ID / canonical content、sources、stale、操作可否。内部例外・hash・認証情報・provider payloadは返さない |
| History | detail GETの既存messages / sourcesを維持し、additiveなattempt summariesを追加。共有Conversationの履歴読取は既存Workspace認可を維持し、他Userのmutation用keyや内部metadataは公開しない |

最小イベント例（形はP、実装済みではない）:

```text
event: accepted
data: {"v":2,"attemptKey":"k1","attemptId":"a1","revision":1,"userMessageId":"u1"}

event: delta
data: {"v":2,"attemptId":"a1","seq":1,"text":"暫定本文"}

event: generation-ended
data: {"v":2,"attemptId":"a1","generation":"STOPPED","finishReason":"stop"}

event: result
data: {"v":2,"attemptId":"a1","revision":4,"generation":"STOPPED","answer":"SAVED","usage":"RECORDED","aiMessageId":"m1","content":"検証済み本文","sources":[]}
```

generation-endedは保存完了通知ではない。resultは保存処理が決着した後の状態を返し、answer FAILED、usage FAILED / UNKNOWN等もあり得る。
DB結果を確認できなければSAVEDを送らず、送れる範囲で「照合が必要」と通知する。
clientはイベントのattemptIdを照合し、古いrevisionや重複resultを無視する。EOF前でもresultで保存済みと確認できるが、result欠落は成功にしない。

### 5.3 State transition / 終了処理

| 軸 | 遷移案 | 判断 |
| --- | --- | --- |
| generation | ACCEPTED → RUNNING → STOPPED / FAILED / ABORTED。ACCEPTEDから開始失敗FAILEDも可。期限切れ・process喪失はINTERRUPTED | stop以外のfinishはFAILED＋finishReason。ABORTEDはserverが中断を観測した場合。切断だけでは即確定しない |
| answer | PENDING → SAVED / NOT_SAVED / FAILED | stop＋検証後表示非空のみSAVED候補。非stop・abort・空本文はNOT_SAVED。DB失敗はFAILED、DB結果未確認はPENDING / client側unknown |
| usage | PENDING → RECORDED / UNKNOWN / FAILED | 観測値があれば保存。完了step由来の部分値は最終totalと混同せず、初期案では最終値がない場合tokens null＋UNKNOWNとする。書込失敗はFAILED |
| client | idle → submitting → streaming → settling → saved / incomplete / reconciling | Stop / read error / EOFでresultなしはreconciling。status確定後にretry可否を提示。spinner解除と保存成功は別 |

answer / usageのFAILEDは保存retryでSAVED / RECORDEDへ回復できる。UNKNOWNのusageも後着の最終観測値でRECORDEDへ進められる。
これらの保存状態の改善ではgenerationをRUNNINGへ戻さず、revisionを進めてstatus / UIへ反映する。
同一callbackの再実行はgeneration結果を差し替えず、未解決の保存だけを同値で再試行する。

この回復は**未採用の設計提案**であり、AIとusageで条件を分ける。AI保存retryは、生成stop・検証後非空などの保存条件に加え、元の実行が保持するgenerationFenceがDBの現在値と一致する間だけ許可する。
同一Attemptの固定AI ID、一意制約、現在のfence / 状態の確認とwriteを同じtransaction内で扱い、事前確認だけで挿入しない。FAILEDからSAVEDへの回復は無条件ではなく、新Attempt受理等でfenceが失効した後の**新規AI保存は禁止する案**とする。
commit応答喪失の照合で既に保存済みのAIが確認できた場合は、その保存事実をstatusへ反映できるが、失効したfenceで未保存AIを作成することとは区別する。usageの保存retry / 後着補完は、Section 5.4の別条件に従う。

serverの共通finalizerへonFinish、onError、onAbort、fullStreamのerror / abort / throw、deadlineを集約する。
callbackの順序に依存せず、guard付き状態更新と保存の一意性で二重終了を防ぐ。onAbortからの非await処理も、所有する終了処理でawait / エラー回収する。
生成結果の観測後、AI保存とusage保存を独立した短いtransactionで試行し、それぞれcommit後の状態を更新する。
NOT_SAVEDでも観測usageは残す。usage失敗でAI保存を中止しない。

中断確定とAI保存は同じattemptのversion / lockで直列化する。
中断確定が先なら、後着stopは正常AIを保存しない。AI保存commitが先なら後着Abortで保存済み回答を削除しない。
versionは状態更新 / UIのrevision用、generationFenceは実行所有の失効用に分ける。
受理requestが保持するfence値とDB値が一致し、かつ保存可能な状態のときだけ生成状態・AIを更新する。期限回復でfenceを進めた旧実行は、再読取で新fenceを採用して保存を再開してはならない。
後着の信頼できるusageは一意eventへのnull補完のみ許可し、既知値を加算・上書きしない。値が衝突すれば要調査とする。

### 5.4 同時実行・retry・回復

- Conversation単位のDB row lock等を受理transactionで使い、1Conversationにactive attemptを1つとする。ACCEPTED / RUNNINGだけでなく、生成終了後も回答・usageの初回保存判定がPENDINGの間はactiveとし、次のpromptが未確定の履歴を読むことを防ぐ。network / retrieval / SDK待ちの間はlockを保持しない。process内Mapやボタンdisabledだけでは守らない。
- 受理とAI保存のtransactionはConversation→attemptの同じ順でlockする。新keyを受理する際は旧未保存attemptのgenerationFenceも失効させ、終了済みFAILEDへの遅延保存retryが新turnの後ろに旧AIを挿入することを防ぐ。保存済みAIと旧usageは変更しない。usageの後着補完は別の限定経路で許す。
- SDK呼出の所有者は受理したrequestだけ。同じattemptを別requestがRUNNINGへ戻して開始しない。同key再POSTは結果照会 / replayであり、失敗済みattemptでも自動再実行しない。
- 初期v2ではSDK `maxRetries: 0` を提案し、再生成は新attemptで明示する。providerが実際に処理した回数・請求をexactly-onceにはできない。1attempt / 1usageはアプリの保存単位である。
- 読取statusは副作用なし。`expiresAt`超過のactive行をstaleとして返す。次の許可されたPOSTはConversation lock下で固定AI ID / usage attemptIdを照合し、存在する保存を先に反映する。未終了generationはINTERRUPTED、既にSTOPPEDなら生成結果は保持し、未保存でpayloadを失った回答はFAILED（LOST_RESULT）、未観測usageはUNKNOWNにする。generationFenceとversionを進めて旧callbackの新規AI保存を拒否してから、新keyのattemptを受理できる。同keyPOSTはこの照合だけを行う。稼働中の期限延長や自動再開は初期案に含めない。
- server deadline / request.signal / response cancelをSDKのsignalへ接続する。停止要求後もprovider処理・請求が継続し得る。旧実行から観測できたusageは旧attemptにだけ記録する。
- 保存retryは同じAI ID / attemptIdで上限付き。commit応答喪失時は再読取で照合してからretryする。AI生成自体はやり直さない。DB停止中はclientに結果不明を示し、回復後のstatusで解決する。
- 最終通知喪失、reload、別画面復帰では同key status→Historyを取得し、保存済みIDで暫定turnを置換する。404は未受理の候補であり、元payloadが残っている場合だけ同key・同payloadの再POSTを使う。期限内RUNNINGは待機 / 再確認、staleはまず同key照合、SAVEDは再生成せず表示復元。未保存確定後だけ新keyの明示的再生成を許可する。
- 新規送信keyは送信前に生成し、結果照合が済むまで保持する。reload対応にはtab単位sessionStorageへResearch / Conversation / keyだけを保存し、本文・Session・tokensは保存しない案。reloadで元payloadがなくstatusも404の場合は再入力を求め、自動再送しない。key保存ができなければHistoryによる回復に縮退する。
- rate limitはkey先行読取で通常replayの消費を避けるが、同時初回POSTのloserがlimiter枠を使う余地はある。RedisとDBの分散transactionは導入しない。usage二重計上とは別の制約として承認する。

旧Attemptへの適用も未採用の提案として、次のように区別する。新Attempt受理と旧fence失効は同じConversation lock下のtransactionで確定し、旧AI保存が先にcommitする順序と、新Attempt受理が先にcommitする順序を直列化する。

| 対象 | 新Attempt受理後の保存・status / History案 |
| --- | --- |
| 旧Attemptの未保存AI | 旧callback・保存retryとも新規挿入を拒否する。旧実行が再読取した現在のfenceを使って権限を取り戻すことも禁止。受理前に保存済みのAIは保持し、照合で既存保存を確認することは許す |
| 旧AttemptのanswerStateがFAILED | FAILEDの履歴を維持し、statusにAI保存失敗・AI IDなし・旧AttemptへのAI保存retry不可を示す。generationStateがSTOPPEDならその生成結果自体は保持する。新Attemptの成功を旧AttemptのSAVEDへ転記しない |
| Historyと再操作 | 保存済みUSERと旧Attemptの失敗summaryを残し、正常AI回答を捏造しない。再生成で同じUSERを参照してもUSER表示を重複させず、Attemptごとの失敗・成功を識別する。旧Attemptの保存retry操作は無効にし、新keyによる再生成は末尾未回答USER等の既存条件を満たす場合だけ許す |
| 旧Attemptのusage | AI保存のfence失効とは別に、旧Attemptへ帰属する信頼できる最終観測値の保存retry / 後着補完を許す。未作成なら同じattemptIdで最大1件を作り、既存eventはnull補完だけとする。scope・一意制約・現在のversionによる状態更新を守り、既知値の加算・上書きや新Attemptへの付替えはしない |

usageがFAILED / UNKNOWNからRECORDEDへ進んでも、旧answerStateのFAILEDやAI保存不可は変えない。status / Historyは計測状態の改善だけをrevision付きで反映する。
これらはT07 / T12 / T14で、同一Attemptの有効な保存retry、新Attempt受理との両commit順序、旧FAILED表示、usageだけの後着成功を分けて受け入れる案である。

provider停止の不確実性は、期限切れ後の新生成でも残る。deadline経過は外部停止確認ではない。
DBが全面停止し終了payloadを失った場合、P2だけで回答本文・最終usageのdurable回復は保証しない。
期限・retry回数・status polling上限は受入前に確定する。

### 5.5 認可・Workspace境界 / UI

すべてのPOST・status・HistoryでC2 / Demo境界→auth→ResearchのWorkspace membership→Conversation所属を検証する。
Workspace IDやuserIdをrequestから採用しない。replayでも認可を省略せず、keyを認証の代替にしない。
mutationはactorUserId一致を追加し、他memberによる同USER再生成を初期は許可しない。
長時間生成では保存前にもResearch / Conversation所属と実行Userのmembershipを再確認し、取消後はAIを保存せず、観測usageの帰属記録だけを内部に残す案。
厳密な権限取消との競合は現guardの逐次確認だけでは保証できず、DB gateで検証する。

promptはserverの履歴から構成し、失敗USERを複数回連結しない。
新v2では保存済み正常turn＋今回の対象USERを1回だけ用い、未回答の旧attempt USERは履歴表示に残してpromptから除外する。
再生成は末尾未回答USER限定なので、回答を昔の位置に挿入するHistory分岐は生じない。

UIは暫定本文・保存確認中・保存済み・中断 / 未完了・保存失敗・保存未確認を識別する。
usage失敗は保存済み回答と別の警告にする。実金額や課金停止を表示で断定しない。
Stopでローカルstreamを止めてstatus照合へ移り、入力やHistory操作を永久disabledにしない。
New / History選択 / unmount時に所有するcontrollerを中断し、遅延deltaが別Conversationへ混入しないようattempt単位で更新する。
再送開始時の旧alert解除はPR #25 follow-upの挙動を維持する。
失敗した新規USERはHistoryと照合して残し、「再生成」と「同文を新たに送信」を別操作にする。

### 5.6 後方互換性・migration・rollback

既存Conversation / Messageは書換えない。legacy Messageやusageにattemptを推定backfillしない。
旧Historyのmessages / sources / previewを維持し、legacy履歴には状態未記録と表示する。既存空AIを新仕様で正常と認定し直さない。
新promptでlegacyの対応関係は推定せず、既存の昇順履歴を尊重し、表示本文が空のAIのみ除外する案。

新テーブル・nullable usage FK / uniqueの追加にはmigrationが必要。既存usageのnullが複数存在できる一意制約、FK、index作成lock、History読取性能、削除時の保持方針を隔離DBで検証する。
本文全件の再検証・修復や既存行の破壊的変更は初期範囲にしない。
Prisma contract / artifacts / migrationの実際の表現と適用は別実装PRでレビューする。本書では生成も実行もしない。

ローカル設定によるserver feature flagを推奨し、Cloud flagサービスは不要。
読取対応→schema拡張→v2 server→対応client→限定Conversationへの有効化の順とする。
Conversationにv2 attemptがあれば旧v1 POSTを409で拒否し、未対応clientには更新を求める。旧clientから信頼性保証を迂回させない。
既存のv1-only Conversationは段階移行中に限り旧契約を継続できるが、本提案の受入対象外。

切替前から処理中だったv1 POSTは、事前flag確認を通過した後にUSER保存やonFinishのAI / usage保存へ到達し得る。**単純な事前flag確認や「v2 Attemptがあれば新しいv1を拒否する」処理だけでは、この競合を防げない。** v1にはv2のgenerationFenceがないため、v2側だけのlock / fence追加も十分ではない。
未採用の移行不変条件案は、**同じConversationにv1 / v2の書込所有期間を重ねないこと**。v1のUSER・Conversation更新・AI・usageの全writeが完了または共通gateで失効し、新規v1の受理も止まったことを確認してから、v2 Attemptを受理する。AI保存transactionの瞬間だけを直列化しても、処理中v1の遅延writeが後から混入するため不十分とする。

| 対策候補（未採用） | 必要な境界 / 限界 |
| --- | --- |
| 共通transaction / lockと書込所有の管理 | v1 / v2両方へ共通gateを先行導入する。Conversation単位で受理・切替と各writeのmode / 所有確認をtransaction・同じlock順で直列化し、生成待ちの間もv1が処理中であることを識別できる耐久的な予約等でv2受理を拒否する。network待ちの間の長いDB lockやprocess内カウンタだけには依存しない |
| 受理停止＋drain | 対象ConversationまたはChat全体の新規v1受理を止め、既存v1のfinalizer・保存retryまで完了させてからv2を有効化する。HTTP接続が閉じたことだけを完了の証拠にしない。処理中writeの不存在を確認できなければ切替を保留する |
| 両者の組合せ | 共通gate対応版を全writerへ配備した後にdrainし、同じgateの保護下で切り替える。共通gateを無視する旧binary / callbackが残る場合はv2を有効化せず、旧writerの終了・隔離を先に確認する |

後段writeを拒否する候補では、v1の既存保存を巻き戻したことにせず、未保存usageを0やv2の計測として扱わない。v1を最後までdrainする案との計測欠落・可用性の差も実装前の判断対象とする。
具体的な予約・modeの保持方法、drain完了の証明と確認不能時の停止条件は実装前に決定する。T17に切替前のv1を意図的に保留する受入を含め、通常POSTの逐次成功だけで移行安全性を認定しない。

rollbackでは新規v2受理をflagで停止し、既存attemptのstatus / History読取を維持する。
保存データをdropせず、v2 Conversationのv1書込を再開しない。全面的に旧binaryへ戻す場合はChat POSTを停止する必要がある。
flag判定後のin-flight finalizerは完了させ、protocolを途中でplain textへ切り替えない。

## 6. Open decisions

以下は**実装前にユーザーの仕様承認が必要**。本タスク中に実装・実行許可を求めるものではない。

| 判断 | 推奨 / 承認する影響 |
| --- | --- |
| keyの意味・retry UI | 同keyは照合のみ、再生成は新key＋末尾未回答USER。意図的同文送信は別USER。共有memberや正常回答への再生成は初期対象外 |
| context / retrieval失敗 | attempt受理・USER保存をretrievalより前へ移し、失敗USERを状態付きで残す。現行「retrieval失敗時USERなし」からの変更 |
| Abortの意味 | 停止はbest effort、未完了AIは保存しない。Stop前に保存済みなら保持。provider停止・課金停止保証なしを許容するか |
| AIとusageの独立性 | AI保存成功＋usage失敗を許容し別表示。最終usageなしはUNKNOWN / null。課金台帳としての完全性を要求するなら別durable設計が必要 |
| 空本文・引用品質 | 検証後 / parse後とも非空を正常条件にする。部分本文・固定fallbackはAI Messageに保存しない。raw暫定表示を許すか、stream前検証を追加するか |
| 同時実行・期限 | Conversationごと1生成、SDK自動retryなし。generation deadline、保存retry上限、polling上限、key / attempt保持期間の具体値 |
| durable回復の範囲 | process喪失時に未保存本文と最終usageを失う限界を許容するか。保証するならP3、payload保持・削除ポリシー・workerが必要 |
| 権限・保持 | 保存前再認可、取消後AI保存拒否・観測usage保持、User / Research削除時のattempt / usage保持・匿名化方針 |
| 移行 / rollback | v2 protocol、feature flag、v2 Conversationで旧client POST拒否、追加migration、legacy状態未記録、sessionStorageのkey保持 |
| 採用サイズ | 推奨案を分割して実装するか、下記の小さな第一段階を先行するか |

## 7. Acceptance tests

### 7.1 実行ゲート

全ケースは**設計のみ / Not run**。C25の既存結果は現行挙動の証拠であり、新仕様の合格実績に流用しない。

| gate | 実行境界と証明範囲 | 許可 |
| --- | --- | --- |
| O: offline | 純粋state / parser、route直呼出、固定DB / auth / SDK double、合成ReadableStream。順序・UI handler契約を検証 | 今回は静的調査のみ。実装PRで許可されたoffline範囲に限定 |
| S: SDK | インストール済み実SDK＋固定in-memory provider。error part / throw / abort、callback順序、消費・cancelを検証。外部fetch禁止 | 別タスクで実行範囲の承認が必要。実AI / Session / DBは含めない |
| H: HTTP | 隔離HTTP serverでPOST / GET / SSE / 切断・再接続。固定provider / retrieval / auth adapterでも可 | server起動・target・egress境界を個別承認。production-modeが必要ならbuildも別途承認 |
| D: DB | 隔離実DBでunique、transaction、FK、lock、同時POST、commit応答喪失・復元、migration | **実DBは個別事前許可必須**。接続先identity、fixture、書込 / cleanup範囲を先に確定 |
| B: browser | 実React / DOM、Stop、spinner、再操作、History、reload、複数tab、New切替 | browserとserverを個別承認。実Session利用はさらに個別許可。mock browserだけでDB / provider保証にしない |

実AI / embedding / provider障害・課金観測はO / S / Hの固定providerでは証明できない。
**実AI・embedding・Session・OAuthもそれぞれ個別事前許可が必要**で、DBやbrowserの許可から推定しない。
実provider gateでは対象モデル、実行回数・費用上限、保存・削除範囲も承認する。今は実行しない。

### 7.2 ケースと判定条件（P）

| ID / ケース | 操作・注入 | 期待状態 / assertion | gates |
| --- | --- | --- | --- |
| T01 正常生成・AI保存完了 | accepted→delta→stop→validator→両保存成功 | USER1、AI1、usage1。result / statusが同じAI IDとcanonical content。generation-endedだけでsavedにしない | O / S / H / D / B |
| T02 stream途中error | text後にerror part、stream throwを別々に注入 | USER保持、正常AI0、FAILED / NOT_SAVED、既知usageのみ。result欠落はreconciling。spinner解除・再操作 | O / S / H / B |
| T03 ユーザーAbort | Stop、fetch AbortController、中断signalをserverで観測。stop保存との競合も両順で実行 | 中断が先ならABORTED・AI0。保存が先ならSAVED維持。usage UNKNOWNまたは観測値、0推定なし。遅延chunk無視 | O / S / H / D / B |
| T04 provider abort通知 | client signal非abortedでprovider abort / AbortError、SDK onAbortを分けて注入 | 発生元を誤認しない。正常AI0、ABORTEDまたはFAILED＋原因、USER保持、usage不足はUNKNOWN。callback形態を記録 | O / S / H、実AIは別許可 |
| T05 USER後の開始失敗 | 受理後のcontext / retrieval reject、streamText同期throw、SDK内非同期開始error | USER1・attempt残存、AI0、FAILED。未呼出生成usageはUNKNOWN。再POST同keyで追加生成なし | O / S / H / D |
| T06 usage保存失敗 | usageだけreject、AI側成功。commit済み応答喪失も別注入 | AI1 / SAVED、usage FAILEDまたは照合後RECORDED。usage retryで1eventのみ。回答を消さない | O / H / D / B |
| T07 AI保存失敗 | AI transaction reject、usage成功。commit前後の応答喪失を分離 | usage1維持、AI0 / FAILEDまたは読取確認後AI1 / SAVED。「未保存」を確証なしに断定しない。生成retryなし | O / H / D / B |
| T08 完了通知喪失 | commit後resultを遮断。保存前遮断、GET一時失敗も分離 | 同key status / Historyで復元。200 / EOFだけでsavedにしない。bounded確認後は未確認表示、生成の自動再開なし | O / H / D / B |
| T09 同一attempt再送 | 同key同payloadをRUNNING / FAILED / SAVED各時点でPOST | USER1、streamText最大1呼出、AI / usage最大各1。同key異payload409。失敗済みでも再実行なし | O / H / D |
| T10 同時二重POST | barrierで同key2POST、異key同Conversation2POSTを別実行 | 同keyは1所有者＋replay、異keyは1受理＋409。DB件数・lock・active1を検証。process内mockだけで合格にしない | O / H / D |
| T11 異なるattemptで同文 | 先行attempt終了後、同文sendを新keyで送る。別Conversationも確認 | USER2、生成2、usageは各attempt最大1。本文hashで消さない。並行active時はT10の409 | O / H / D / B |
| T12 callback重複 | 同値onFinish2回、onError→onFinish、onAbort→stopを重複 / 並行で実行。次の新key受理後にも旧callbackを実行 | 同一AI ID・usage1、状態後退なし。中断後・fence失効後の正常AI保存なし。usage衝突検出。SDKの実重複発生を前提にしない | O / S / D |
| T13 引用後空本文 | 未許可markerのみ、空白、許可markerのみ、正規化とparse後空を実関数で検証 | AI0、NOT_SAVED、公開理由EMPTY_VALIDATED、観測usage保持。rawを正常回答として残さない | O / S / H / B |
| T14 History復元・再操作 | 各terminal状態 / result欠落でHistory・reload・New・別tab。USER再生成と新sendを区別 | server IDsで置換、旧turn保持、draft / retry操作の整合、旧alert解除、入力・Stop・focus回復。別Conversationへの遅延更新なし | O / H / D / B |
| T15 再生成契約 | 新key＋自分の末尾未回答USER、保存済み / 非末尾 / 他User / foreign ResearchのUSER | 許可時USER件数不変・新attempt / 新usage。その他409または404。promptの対象USERは1回 | O / H / D / B |
| T16 crash・期限・両保存停止 | RUNNINGでprocess喪失、全DB停止、期限後POST、旧callback後着 | statusはstale / 結果不明。POSTが旧行をfence後に新attempt受理。旧AI保存なし、旧usageは旧attemptのみ。未保存payload回復を捏造しない | O / H / D |
| T17 境界・移行・機密 | 未認証、membership取消、foreign key / key再利用、Demo / C2、legacy GET、flag切替、未知version | 401 / 404 / 400 / 409の契約。入口拒否でChat書込 / SDK副作用なし。受理後の取消はAI保存拒否、観測usageは内部保持。既存History互換、v1迂回拒否。stream / logに秘密なし | O / H / D / B |

T17の移行競合には以下の下位条件を追加する案とし、T01–T17の17ケース体系は維持する。いずれも設計のみ / Not run。

- 切替前のv1を事前flag確認後・初回USER保存前、およびUSER保存後・onFinish保存前でそれぞれ保留し、v2受理と競合させる。v1が書込所有中ならv2を待機 / 拒否し、v1の全write完了またはgateでの失効後だけ受理する。
- 共通gateの下でv1が先に所有する順序とv2切替が先にcommitする順序を確認する。後者では保留v1のUSER / AI / usage等の新規writeを拒否し、既存保存は保持する。v2のkey / usageへ旧結果を混入させない。
- 共通gate未対応の旧writer、完了不明のfinalizer、切断後の遅延callbackが残る場合は、drain完了と判定せずv2有効化を保留する。flagの再確認だけでPassにしない。
- rollback / flag無効化でもv1書込を自動再開せず、処理中v2の保存と競合しない。Oでgate順序、H / Dで別request・transactionの競合、Bで切替中の拒否 / 復帰表示を確認する。各実行にはSection 7.1の事前許可が必要。

全gateで、finishReason、server state、保存ID / 件数、client表示を別々に記録する。
件数だけのPass、固定200だけのPass、providerが停止したとの推定を禁止する。
browserで確認するのは実spinner / disabled / alert / focus / History操作であり、useState doubleの結果とは分ける。

## 8. Implementation phases

| 段階 | 変更と出口条件 | 先に必要なもの |
| --- | --- | --- |
| I0 仕様合意 | Section 6の判断、enum / response schema / 期限・retry値を確定。本書はここまでの準備 | ユーザー承認。今は採用未確定 |
| I1 SDK adapter調査 | 固定providerでS gate。fullStream / callback / cancelの順序を確定し、共通finalizerの契約をOで検証 | 別タスクのoffline / SDK実行範囲の許可 |
| I2 durable attempt | contract / artifacts / additive migration、key / 固定AI ID / usage unique、受理transaction、状態読取、fencingを実装。Dの競合・rollback確認 | DB設計合意、migrationレビュー、隔離DB個別許可 |
| I3 v2 route | signal / deadline、独立保存、構造化イベント、status、再認可、legacy境界。O / S / Hを通す | server起動等の個別許可、flagは既定off |
| I4 client / History | Stop、attempt付き暫定表示、canonical置換、照合 / retry、reload、New / History競合。Bで実操作 | browser / Sessionを含む実行境界の個別許可 |
| I5 段階移行・運用 | 限定有効化、unknown / FAILEDの検出、rollback rehearsal。採用した仕様にarchitecture / route / model文書を更新 | 別途リリース判断。実AI検証は独立承認 |

I1でSDKの非await callback等の扱いが確定できなければ、I3で未検証の順序を前提に実装しない。
各段階の合格をPhase 10全体完了へ読み替えず、roadmapは承認された受入完了時に別途更新する。

### より小さな第一段階案

推奨案のDB / API変更が大きい場合は、**N1＋C2の限定改善**を先行する案を提示する。
既存plain textを維持し、送信中・EOF後を保存未確認として表示、History messagesを再取得し、検証後空AIを防止する。
安全な照合には小さくてもrequest識別と保存USER / AI IDの返却が必要。本文一致による照合や自動retryは導入しない。
識別を追加できない段階ではHistory全体を再読込し、特定turnの保存成功を断定しない。

これだけでは冪等性、callback再実行、usage部分成功、provider停止、切断後の特定attempt回復を満たさない。
Stopを追加するならA2のsignal伝播とSDK gateを別途含める。完全な信頼性設計として採用せず、対象T01 / T08 / T13 / T14の限定範囲を明示して受け入れる。

## 9. Safety and verification boundaries

今回実行したのはGit開始条件確認、指定コード・テスト・仕様・SDKソースの静的読取、設計文書作成、文書の整合・空白検査のみ。
本番コード、テスト、DB schema / migration、依存、lockfile、roadmapチェックは変更していない。
実DB、OAuth / Session、AI / embedding、HTTP server、browser、production build、外部Cloud操作、外部API、commit / push / PR作成 / mergeは実行していない。
Prisma CLIやSDK runtimeも起動していない。スキルの一般的な更新・インストール手順より、今回の静的調査限定の指示を優先した。

最終確認は `git status --short --branch`、`git diff --check`、未追跡の新規文書を含む独立空白検査、相対リンク先・内部anchor確認を使う。
既存受入文書は末尾への本書参照だけを追加し、元のbytesをprefixとして保持する。
本書のテスト計画は実行許可ではない。未実行gateとOpen decisionsを残し、未コミットで停止する。
