# Public Demo Chat — Free Plan Live Verification Preflight

記録日: **2026-10-29 JST**。Documentation-only。対象は非商用の個人ポートフォリオ。
**Public activation remains No-Go. Keep `DEMO_CHAT_ENABLED=false`.**
本書は次の隔離環境準備PRへの引き継ぎであり、接続・配備・公開の承認ではない。

## 1. 開始状態・証拠の範囲

| 項目 | 今回の確認 |
| --- | --- |
| Repository | `origin`: `https://github.com/morimotodev93/evidence-atlas.git` |
| Branch | `main`（作成・切り替えなし） |
| HEAD | `0020aa025cc78066ea5eaeb795913be8de5ddf1b`、指定値と一致 |
| Working tree | 開始時 `git status --short` は空、clean |
| Worktree | `C:/Users/owner/Desktop/sm-dev/evidence-atlas` の1件、同HEAD / main |
| 指示 | ルート `AGENTS.md` と [source-memo](source-memo.md) を確認。docsを仕様の一次資料とし、外部情報は公式本文を確認 |

今回の証拠はソース・既存文書の**静的読取**と公開公式資料の読取のみ。
アカウントConsole、配備設定、実データ、`.env*` の内容は確認していない。
既存文書を修正せず、本書1件だけを追加する。Git add / commit / push / mergeはしない。

調査した仕様は [roadmap](roadmap.md)、[requirements review](roadmap-requirements-review.md)、
[Lease recovery design](demo-chat-lease-recovery-design.md)、[AI Architecture](../architecture/ai-architecture.md)、
[Phase 10 acceptance](phase10-quality-acceptance.md)。
補助資料として [Redis verification](demo-chat-redis-verification.md) も参照した。

## 2. 現在の実装・未検証範囲

| 境界 | HEADで静的に確認した実装 | 証拠の限界 |
| --- | --- | --- |
| 設定・モデル | [chat-config.ts](../../src/lib/demo/chat-config.ts)、[chat-model.ts](../../src/lib/demo/chat-model.ts): 完全設定＋Demoモードだけ許可。固定Groqモデル、専用key、他providerへのfallbackなし | 設定の存在判定は接続確認ではない |
| API | [route.ts](../../src/app/api/demo/chat/route.ts)、[handler](../../src/lib/demo/chat-handler.ts)、[security](../../src/lib/demo/chat-security.ts): Node.js POST、session/questionの厳格JSON、Origin・Turnstile・cookie・所有権・公開範囲を検証 | 実配備でのOrigin / cookie / CSPは未検証 |
| 公開データ | [read.ts](../../src/lib/demo/read.ts)でDemo Workspace IDと名前guard、Research所属を再確認。[context](../../src/lib/demo/chat-context.ts)は公開データから限定投影 | 名前だけで公開認可しない。実DBの内容は未確認 |
| 生成 | [generation](../../src/lib/demo/chat-generation.ts): 独立した1質問、非stream JSON、Source allowlist、出力検証、local abort、Lease保持 | Source所属一致は事実・主張の裏付けを証明しない |
| 共有制限 | [store](../../src/lib/demo/chat-store.ts): Redis EVALで予算・Lease・Operation ID相関を扱う | 相関は送信済み/終了証明、独立HTTP再送のdedup、完全なlifecycleではない |
| UI | [Research detail](../../src/app/demo/research/[researchId]/page.tsx)、[panel](../../src/components/demo/demo-research-chat-panel.tsx)、[client panel](../../src/components/demo/demo-chat-client-panel.tsx)、[Turnstile](../../src/components/demo/demo-chat-turnstile.tsx)、[controller](../../src/lib/demo/chat-client.ts) | 有効設定用のclient経路は実装済み。既定はComing soon / disabled |

Session開始はOrigin→入力→Siteverify→公開Research→Redis作成の順。
質問はcookie→Redis所有権/Research binding→公開Research再確認→予約→生成の順。
cookieは `__Host-ea-demo-chat`、`Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`、Domainなし。
APIは汎用エラーとno-storeで返す。質問ごとの会話履歴・回答をDBやbrowser storageへ保存せず、
clientは最新の往復だけを保持する。Research変更で旧fetchをabortし遅延応答の表示権を失効させる。
通常SaaSのGemini / Auth.js / Conversation永続化やC2をこの経路へ統合しない。

**過去のoffline検証:** roadmapのPR #49 client foundation記録は関連Vitest **18 files / 496 tests**、
TypeScript、ESLint、diff check成功と記載する。controller、synthetic widget callbacks、handler wiring、
static markup、Lua/Fengari・mocked transportの境界を扱う。これは**過去の記録の参照**であり、
今回の再実行・生ログ再監査・新しい合格ではない。該当テストソースのassertionも静的に参照した。

**実ブラウザ未検証:** 有効UIのhydration、実React scheduling、Turnstile lifecycle、loading/error/limited、
cookie・Origin・CSP、重複防止、Research切り替え、keyboard/focus、375px / 768px / desktop。
既存read-only Demoのブラウザ成功を有効Chatの成功に転用しない。

**実サービス未検証:** Groq回答・JSON/finishReason・token計上・切断挙動、実Siteverify、Upstash実Lua・
競合・renew/release・不明Lease保持、配備Functionのtimeout、全入口の受付停止。
対象Redisのack保持・admission順序・障害時整合性・no evictionも未確認。

**No-Go理由:** 上記の基本経路、アカウントの無料枠/課金条件、インフラ消費・Redis安全前提、
旧deploymentを含む停止手順の実証が不足する。自動復旧未実装だけを唯一の理由としない。
Phase 9/10/11の完了状態は進めない。Phase 10は既存の4/11完了、Error handling Partialを維持する。

## 3. Groq Free Plan: 公式情報とUnknown

公式ページの確認日はいずれも **2026-10-29 JST**。本文の更新日は取得できていない。
数値は公開表の現時点の要約であり、対象アカウントの保証値ではない。

| 項目 | 公式資料で確認できたこと | 対象アカウント/実装に残る確認 |
| --- | --- | --- |
| モデル・無料枠 | [Groq Rate Limits](https://console.groq.com/docs/rate-limits) のFree Plan表に `openai/gpt-oss-120b`: **RPM 30 / RPD 1,000 / TPM 8,000 / TPD 200,000** | 実アカウントの適用値・モデル許可・現在の残量は **Unknown**。ConsoleのLimitsで確認が必要 |
| 範囲 | 同資料では組織単位。公開表は例外あり。一部組織はinput/output別の毎分制限を持つ | 専用keyでも同じ組織の他利用からquotaは隔離できない。ITPM / OTPM設定は **Unknown** |
| 枠到達 | 同資料はHTTP **429**、該当時の `retry-after` を説明 | 自動再送しない。上流429の後に本APIが429を返すとは限らない（第4節） |
| 無料と課金 | [Billing FAQs](https://console.groq.com/docs/billing-faqs) はFreeからDeveloperへの明示upgradeと支払方法、Developerの従量課金を説明 | Freeの対象資格・支払設定・契約例外は未閲覧。無料quota超過を有料処理へ自動移行する根拠は今回確認できない。実アカウントがFreeであることを接続前に確認する |
| Spend Limits | [Spend Limits](https://console.groq.com/docs/spend-limits) はpaid tier / organization ownerを要求 | Free検証の必須条件にしない。有料移行は提案しない |
| Input / Output | [API Reference](https://console.groq.com/docs/api-reference) は生成token上限とcontext長の関係を説明。[SDK境界テスト](../../src/lib/demo/chat-generation-sdk.test.ts)は実装の `maxOutputTokens:700` が `max_tokens:700` へ写ることをassert | Inputはsystem＋公開context＋質問＋JSON等。文字数から正確なtoken数を換算しない。使用量は現adapterが返すtext / finishReasonだけでは記録できない |
| Reasoning | [Reasoning](https://console.groq.com/docs/reasoning) はGPT-OSSのreasoningとeffortを説明。API Referenceの既定effortはmedium | 実装はeffortを指定しない。reasoningのusage内訳・無料TPM/TPDへの算入式・700に含まれる正確な範囲・予約tokenと実消費の調整は **Unknown**。他providerの仕様で補完しない |
| 実行中・取消 | 読取した公式資料から、この同期Chat APIのrequest単位の取消完了証明・強制remote寿命は確認できない | timeout / abort / Function終了後の消費、quota返却、最終計上時刻は **Unknown**。終了とみなさずLease保持 |

公式確認と推論を区別する: 「低頻度なら無料枠内に収まりそう」は運用見通しであり、保証ではない。
実アカウント設定は一切確認していない。公開料金表の金額をFree契約の請求額として適用しない。
検索で見つかった旧Groq Communityの無料課金FAQと `groq.com/pricing` は本文を開くとhomeへredirectしたため、
検索snippetだけを無料契約の保証に採用しない。必要なアカウント情報が取れなければ接続はBlockedのまま。

GroqのProject別Rate Limitは組織上限の範囲内で設定される。専用API KeyやProjectの分離は、組織全体の無料枠を増加させない。対象FreeアカウントでのProject機能・適用制限は接続前に確認する。

## 4. コード由来のリソース・安全制限

| 制限 | 現行値・判定 | 無料枠に対する作用 / 限界 |
| --- | --- | --- |
| Global | **50 accepted質問 / UTC日**。Redis TIMEから日付判定 | 同じDB/prefixの全送信元で共有。GroqのRPD/TPDの窓と一致する保証なし。UTC境界で再利用可能でも未終了Leaseは残る |
| Session | **20質問 / 24時間固定** | 匿名session単位。新SessionでGroq組織quotaが増えるわけではない |
| Thread | **10質問**、所有者とResearchをbinding | 内部createThreadは残存session TTLを引き継ぎ、予算をresetしない。現行公開APIは独立createThread操作を持たない |
| Source | **3質問 / rolling 60秒** | 全接続・session・threadが `source:shared` を共有。引用Source文献別でもIP別でもない |
| Session開始 | 別bucketで **3 starts / 60秒**、token replay marker 600秒 | 質問数制限とは別。拒否処理もTurnstile・DB・Redis・Functionを消費し得る |
| 同時生成 | **occupied Lease最大2件**、ZCARDで判定 | 複数instanceを共有制御。期限切れも数える。remote並列上限の主張にはRedis安全前提が必要 |
| 入力 | **500 Unicode code points**、trim前。lone surrogate拒否、空白のみ拒否 | token上限ではない。JSON bodyは8,192 bytes、読取5秒 |
| Context | serialized context **12,000 code points**、Findings/Source各最大10、各field clipping | system/質問等は別。日本語・JSON escaping・reasoning等でtoken負荷は変わる |
| 出力 | SDK **700 tokens**、一回の非stream生成、tool/historyなし | 全入力tokenは別。reasoningの詳細は第3節Unknown。金銭的Hard Capではない |
| 時間 | **local生成30秒 / renew間隔15秒 / Lease deadline60秒** | renewは期限前だけ成功。timeout・renew失敗はabort＋503＋保持。deadlineはremote終了時刻ではない |
| Redis | HTTPS REST、request timeout **3秒**、`retry:{retries:0}`、auto pipeline無効、memory fallbackなし | 不明reserveでGroq送信なし。renew/release不明も拒否。Luaの途中errorにrollbackを仮定しない |
| 再試行・予算 | AI SDK `maxRetries:0`、clientの失敗自動再送なし、accepted counterの返金なし | 失敗・未送信・出力拒否でも予約した予算を戻さない。利用者の明示的な再質問は別受付 |
| Operation履歴 | **10,000 records**、no TTL/GC、満杯は503 | normal releaseでも履歴は残る。削除で受付を復旧させない |

根拠は第2節のconfig / security / store / generation / context。
非streamの `stop` / `length` を取消前に受領した場合だけ完了扱いでexact owned Leaseを解放する。
`length` は回答を503で拒否しつつ解放する。`stop` でもJSON/Source等が不正なら回答拒否。
未送信のローカル準備失敗・根拠不足は解放可能。SDK呼出後の例外・上流429/503・network不明は
原則503としてLease保持。**アプリ予算/容量による429と上流Groqの429を区別する。**

50件×700 = 35,000 は設定値を掛けただけで総token保証ではない。
50件/日の質問数が公開RPD以下でも、入力とreasoning・組織の他利用によりTPM/TPDへ達し得る。
Sourceの3件/分と2枠もtoken上限・費用上限を保証しない。
Groq無料枠、Upstashのcommand/storage/通信、Vercelのinvocation/compute/転送、Turnstileは別々に評価する。
今回それらの対象plan/quota/残量・超過動作は **Unknown**。無料という前提だけで安全性を認定しない。
Upstashについてはquotaだけでなくack保持・巻戻り/eviction等の前提を、対象構成と公式契約に照らして確認する。

## 5. 隔離検証環境の契約（次PRで具体化）

| 対象 | 最小要件 |
| --- | --- |
| Vercel | ProductionはChat無効を維持。専用検証projectを第一候補とし、特定PreviewのURL・deployment ID・commit・ownerを固定する。共有Preview設定が他branchへ漏れる構成を避ける |
| Deployment Protection | 許可したoperatorだけがUIとAPIへ到達できることを確認。自動browserは承認された認証方法を使い、bypass値をURL/ログ/ZIPへ残さない。保護はOriginやTurnstileの代替ではない |
| Flags | 準備時 `DEMO_CHAT_ENABLED=false`。接続承認後、固定した検証deploymentだけを一時有効化。`PUBLIC_DEMO_MODE=true`、`C2_RUNTIME_MODE` は未設定または空。非空なら不正値でもChat不可 |
| Demoデータ | 専用の非Production DB/curated Demo Workspaceを用意。`DEMO_WORKSPACE_ID` と名称guard、公開Research/Source一覧を確認。本番DBへseedや変更をしない。準備だけのPRはDB接続も行わない |
| Groq | server-only `DEMO_GROQ_API_KEY` は検証専用、評価/SaaS/C2から分離。Free plan・モデル許可・実quota・他の組織利用をoperatorが確認。同じ組織ならkey分離だけでは資源分離にならない |
| Turnstile | 検証用Site Key / Secretを用意し、許可hostnameを固定Previewへ限定。site keyだけをclientに渡し、serverでsuccess / hostname / action=`demo-chat`を確認。test keyによる合格と実Siteverifyの合格を分ける |
| Origin | `DEMO_CHAT_ALLOWED_ORIGINS` に固定HTTPS originを完全一致で列挙。path/trailing slash/wildcard/Host由来の自動許可なし。欠落時はAPI503となり、eligibility判定だけでは不備を検出できない |
| Upstash | **専用DB** と専用REST credential。Productionと同じLease台帳を共有しない。`UPSTASH_REDIS_REST_URL/TOKEN` の優先に加え `KV_REST_API_URL/TOKEN` fallbackも意図せず本番を指さないよう確認。URL/token値は記録しない |
| Namespace | 現factoryは固定 `evidence-atlas:demo-chat:v1`。任意環境変数でprefixを変更する機構はない。専用DBなら既存prefixのまま隔離できる。constructorのtest prefix許可はruntime選択機構ではない |
| 既存Lease | 不明Leaseの削除・再利用・初期化は禁止。検証用DB/新namespaceを既存環境の復旧や枠迂回に使わない。未知の未終了workがあれば旧環境停止を維持し、共有組織での追加実行も再審査する |
| 旧配備・他実行元 | URL/aliasだけでなく旧deployment、別region/worker、local runner、評価scriptの送信元とcredential/DB共有範囲を棚卸し。固定した1 sender以外の新規受付を閉じる |

上表は要求事項であり、現在のVercel/Upstash/Cloudflare/Groq設定を確認した結果ではない。
Previewの環境変数は旧deploymentの実行環境を即時書き換える停止装置と仮定しない。
Deployment Protectionの実適用範囲・利用可能な認証方法・Function制約は対象planで次PR時に確認する。
有料plan、課金機構、商用運用基盤は必要性が判明するまで追加しない。

## 6. 最小の実ブラウザ・実サービス検証計画

**現在は全ケース Not run。** 次PRは準備まで。次段階の実行には第8節の別承認が必要。
結果は各行について対象commit/deployment・実施者・JST時刻・期待/実際・pass/fail/not run・
匿名化したrequest回数を記録する。失敗は再送せず停止して調べる。

| ケース | テストダブルで先に確認する内容 | 承認後に専用環境で確認する内容 |
| --- | --- | --- |
| 正常経路 | widget callback→session201→question200とSource照合、状態遷移 | 有効UI→明示Start→実Turnstile成功→session201→host cookie属性→質問1件→実Groq stop→検証済み回答/Source表示。外部Sourceリンクは開かない |
| Feature Flag off | disabled、script/API/DB/AI呼出なし、API404 | 専用配備で新Session/質問が404、read-only閲覧が継続。既存clientからの次のPOSTも拒否 |
| Origin不一致 | allowlist不一致403、Host偽装で許可されない | 専用endpointへ許可外Originで403、Siteverify/AI未到達。CORSエラー画面だけをserver拒否の証拠にしない |
| Turnstile失敗 | error/expire/timeout callback・二重callback、403、手動再開始 | 実widget読込・CSP・hostname/action整合と失効挙動。大量失敗やquota消耗を起こさない |
| Session/入力不正 | cookie欠落/重複401、別owner/Research403、空白/501文字/不正schema400、413/415等、AI未呼出 | 必要最小限の拒否確認。session期限境界等の反復はdoubleで行う |
| 429 / 503 | 予算/容量429→limited、上流429/503→不明503、回答破棄、no retry/refund | quota枯渇を意図的に起こさない。偶発エラーが出たら停止・Lease保持。残量/状態をoperator確認 |
| Redis障害 | reserve不明は送信0、renew失敗はabort＋保持、release不明は回答拒否 | 実正常EVAL/renew/releaseを先に確認。強制障害は専用環境＋別の明示承認後のみ |
| Lease更新/隔離 | 仮想時計で期限前renew、期限後拒否、不明2枠で429、日替わりでも保持、遅延応答で解放しない | 実Upstashで同じ原理を確認する試験は保持対象を事前に限定して別承認。2枠占有はAIを呼ばない専用試験で扱い、未知の既存Leaseへ触れない |
| 受付停止 | off時にsession/questionとも拒否、cached clientも再送なし | 第7節に従い旧deploymentも含め入口停止を確認。未終了生成を終了済みにしない |
| Loading/重複 | pendingの同期guard、二重submitを1回、error/limited文言 | browserで送信中disabled・aria-busy/status、連打/Enterで重複なし。遅延はdoubleで再現して実Groq反復を避ける |
| Research切替 | reset / abort、旧answer/threadと遅延応答を新Researchに表示しない | 実React/navigationでも入力・表示・focusが正しい。別Researchでの追加AI呼出は初回batchに含めない |
| Keyboard / 幅 | semantic form/label/status/alert、Sourceをtextで表示 | Tab / Shift+Tab / Enter、実widgetのfocus、focus可視・遮蔽、横overflow/操作不能なしを **375px / 768px / desktop** で確認。loading/error/limitedはbrowser doubleも使う |

ブラウザ＋doubleはlayout/Reactと拒否UIの証拠になるが、実Turnstile、Secure cookieの配備、
Groq応答・token/account、Upstash障害保証の代わりにはならない。有限の障害試験も一般的なremote終了保証にはならない。
既存 `e2e/public-demo.spec.ts` はread-only向けであり、POST/Turnstile/Groqを許可する目的でその通信制限を緩めない。
専用Chat用browser spec/runnerを分け、対象originと外部Turnstile等の許可範囲を明示する。
既存Redis verification runnerのholdを本書で解除せず、その実行も別途審査する。

### 初回batchの保守的な呼出予算（提案）

1. 接続前にtarget accountのFree資格、quota/残量、他の組織利用、対象contextのtoken負荷を確認。
   不明なら送信しない。API wrapperはusageを保存しないため、operatorのConsole情報等の収集方法を先に決める。
2. 初回は **実Groq呼出最大2回、逐次1回ずつ**。最初の正常質問1回で必要な縦経路を確認し、
   全条件を満たした場合だけ任意の2回目を使う。各回の間は少なくとも60秒と、適用窓/残量の回復を確認する。
   待つだけで安全とはみなさず、3件/分や50件/日まで使い切らない。
3. UIの各幅・loading/error/limited・重複防止は先にdoubleで確認し、viewportごとに実生成を繰り返さない。
   Sessionは最小限、初回計2回までを目安とし、challenge callback失敗を自動反復しない。
4. 初回429/503、出力拒否、network不明、renew/release不明、予想外の使用量、1件でも不明Lease、
   対象/設定不一致、秘密露出、Redis状態喪失でbatch全体を停止する。上限2回は許容回数であって消費保証ではない。
5. 故障注入・実2件同時生成・未知のremote workの解放は初回batch外。
   必要なら成功経路の評価後、専用対象・残量・新たな呼出上限を決めて別承認を得る。

## 7. 停止・再開できない場合

1. operatorは新規Sessionと質問の両方を閉じる。まず検証入口へのアクセスを遮断し、
   検証設定の `DEMO_CHAT_ENABLED=false` を確定する。環境変数を読むコードであり、
   全workerへ即時反映するremote kill switchは実装されていない。
2. 設定変更後の配備が必要な場合は別途承認された操作で行い、旧URL/alias/旧deployment/runnerも止める。
   新配備だけoffでも旧配備は停止したとみなさない。停止反映までの時間と全入口の拒否結果を記録する。
3. 未終了Groq処理は未終了/不明のまま扱う。flag off、client abort、30秒、60秒、Function終了、
   key失効、ログ不在、使用量横ばいは終了証明ではない。client cleanupによる表示破棄とも区別する。
4. 不明Leaseは期限後も**無期限隔離**、budgetは非返金。2件で全枠停止を受け入れる。
   ZREM/reset/DB再作成/namespace・credential切替/上限増加で未知の仕事を忘れない。
5. Redis障害はfail-closed、memory fallbackなし。状態喪失/ack巻戻り/eviction疑いでは
   空台帳を「生成なし」と解釈しない。全sender停止・証拠保全を優先し、相関不能なら再開しない。
6. Chatが停止・永久利用不可でもread-only Demoは独立して継続する。復旧日を約束せず、
   不可用のユーザー影響と受容理由を記録する。read-only自身のDB障害まで継続を保証しない。
7. 再開には、対象identity、全sender停止範囲、実quota/契約、Redis安全前提・保持台帳、
   admission/拒否の基本確認を再評価する。未知Leaseは保持したまま数え、枠を復活させない。
   取り除くならexact attemptの未送信/終了証拠、将来送信の防止、owner/version付き監査操作の別設計が必要。
   現行にはその復旧ツールはなく、本書も手動削除を許可しない。根拠が得られなければChat停止を続ける。

## 8. 文書間の相違・接続前のBlocked事項

| 相違 | 本書での扱い |
| --- | --- |
| 2026-10-29 roadmapの停止受容型方針と、AI Architecture §4.1 / Lease Design §12の一律終了保証・復旧gate | roadmapは一般的な完全自動復旧をShould-haveへ変更。復旧しないまま停止を受け入れる候補を認める。旧文書は未整合として明示し、今回変更しない。Go判断前の必要な整合作業は別PR |
| roadmapの古い「UI未接続」と最新client foundation | client経路はHEADに存在する。既定無効・有効Chatの実ブラウザ未検証という現在状態を採用し、古い実績は当時の履歴として保持 |
| Phase 10の初期1/11と冒頭の現状補足4/11、過去Build記録 | 後続記録と併読する。本書でphase完了を追加せず、過去Build不完了を成功にしない |
| Free運用と費用gate | 有料upgrade/paid Spend Limitsを必須にしない。Free資格・超過拒否・不明消費の最大リスクと他インフラ消費を確認する義務は維持 |

**実接続前にBlocked:** 専用project/固定Preview identityと保護、curated非本番データ、専用DB/credentials、
全sender棚卸し、アカウントFree資格/モデル許可/実quota・残量・費用条件、Redis障害時安全前提、
停止手順と匿名化証拠採取方法、接続の明示承認。準備コードのレビューはこれらと独立して進められる。
認可・秘密情報・不正利用・費用制御・Redis安全性のMust-haveは緩和しない。

## 9. 今回のoffline確認

本書のlocal Markdownリンク、実装値、変更範囲、空白エラー、秘密情報混入を静的確認する。
レビューZIPには本書、未追跡新規ファイルを含む差分、Git開始/終了状態、静的検証結果と
未検証事項・引き継ぎを収録する。`.env*`、秘密、dependencies、cacheを含めない。

**Not run:** Vitest、Build / Production Build、実ブラウザ、dev server、実Groq / Redis / Turnstile、
本番/検証DB操作、Vercel設定変更・配備。過去PR #49のテスト数を今回の結果に記載しない。
実行した静的チェックの結果はZIP内 `static-verification.md` に記録する。
変更は未ステージ・未コミットで残す。

## 10. 次の最小PR: Public Demo Chat — Isolated Live Test Setup

**目的:** 固定された非公開検証環境へ安全に接続できる準備を、小さなレビュー可能な差分にする。
次PRもProductionで一般公開しない。初期状態は `DEMO_CHAT_ENABLED=false`。

- **最小変更:** 専用project/DBの対応表とsetup手順、secret値を出さない明示opt-in/target判定、
  Chat専用のbrowser-double試験を用意する。target不明時は接続拒否。通常factoryは専用DBに固定prefixで
  隔離できるため、任意namespace切替やLease recovery機構は追加しない。
- **事前条件:** 第5/8節のidentity・Free資格・資源範囲と停止計画をownerが確定。
  利用可能な保護/設定機能を対象planで確認する。未確定事項はBlockedとして残し、推測のdefaultで接続しない。
- **変更候補:** 本書、既存 `scripts/demo-chat-redis-safety.ts` とRedis検証文書のhold説明との照合、
  新規 `scripts/demo-chat-live-preflight.ts`（仮称、networkなしのtargetチェック）、
  新規 `e2e/demo-chat-isolated.spec.ts` と専用fixture/config（仮称）。
  既存read-only E2Eは維持。必要が実証された場合だけ `src/lib/demo/chat-config.ts` と対応テストを最小修正する。
  `.env*` の実値や新dependencyを成果物へ含めない。設定契約を変えるならarchitectureも同じPRで更新する。
- **追加テスト:** opt-inなし/Production・未知host/DB識別不一致/C2/non-Demo/不足設定の拒否、
  secret非出力、doubleでsession→質問→Source、拒否とno retry、二重送信/Research切替/各幅・focus。
  既存config/Origin/cookie/lease保持テストを必要な変更範囲で回帰確認する。
- **別承認:** deploymentと設定投入、固定URLのbrowserアクセス、実Siteverify/Upstash/DB/Groqの各接続、
  最大2回の実生成と停止条件を明示して承認を得る。故障注入・2枠隔離試験にはさらに専用対象と明示承認が必要。
  今回の公開資料読取許可をその承認として使わない。
- **成功条件:** 準備PRではoffline target拒否・double経路が成功、設定対応表と手順がレビュー可能、
  全flagsが既定無効、秘密/本番影響なし。後続の承認済みlive batchで正常縦経路、停止、
  read-only継続を証拠付きで確認する。live成功でもProduction Goにはしない。
- **停止条件:** target/plan/残量/Redis保証が不明、未知の旧work、許可範囲逸脱、secret混入、
  最初の不明応答・Lease・429/503、出力拒否、停止不能。該当時は接続しない/続行しない。
- **対象外:** Production一般公開、有料upgrade、billing基盤、完全自動復旧、force-release/GC、
  namespaceによる枠復活、網羅的障害/負荷試験、24時間soak、SaaS/C2/DB schema変更、
  Phase 10全体合格、文書全体の履歴整理。必要になった整合作業は別PRへ分ける。

