# Roadmap Requirements Review — Non-commercial Incremental Development

レビュー日: **2026-10-29 (Asia/Tokyo)**。対象: AI SaaS Evidence Atlas。
開始状態を確認済み: **`main` / `6f1fc9b` / Working Tree Clean**。

本書は仕様の再評価と提案であり、仕様変更・公開承認・検証実行の記録ではない。既存roadmap、関連仕様、コード、完了チェックは変更しない。現行のDemo Chat **No-Go** と無効状態を維持する。行番号はレビュー基準HEADの `docs/planning/roadmap.md` に対応する。

調査方法: `AGENTS.md` と [source-memo.md](source-memo.md) に従い、[roadmap](roadmap.md) 全1,464行を冒頭から末尾まで確認した。主な照合先は [AI Architecture](../architecture/ai-architecture.md) §4.1/6/12/13、[Phase 10 acceptance](phase10-quality-acceptance.md) の現状補足・判定方針・11項目matrix・後続記録、[Lease recovery design](demo-chat-lease-recovery-design.md)、[Redis verification](demo-chat-redis-verification.md)、[PR #42 record](../archive/demo-chat-api-security-pr42.md)、[Product Definition](product-definition.md)、[Data Model](../architecture/data-model.md)、[Directory Structure](../architecture/directory-structure.md)、[Design System](../design/design-system.md)、[Design Direction](../design/design-direction.md)。C2やAI評価の過去実績はroadmapと受入文書の記録として参照し、全実行ログを独立監査したものではない。

**証拠の区別:** 本書の「現状」は文書上確認できる記述。「提案」「評価」は本レビューの判断。外部サービスの現在仕様・価格・保証を新たに調査しておらず、既存調査の未確認事項を保証に格上げしない。実装と文書の完全な一致、配備状態、実DB内容は今回未検証。テスト、Build、実Groq/Redis/Turnstile通信、DB操作は行っていない。

## 1. Executive Summary

現行roadmapは、研究ワークフロー、認可境界、curated read-only Demoを実現した記録として有用である。非商用方針もPhase 8で明文化済みで、Subscription、Stripe、Billing、用途のないメール基盤を新たに削除する必要はない。問題は、限定された完了実績、継続改善課題、公開条件、長いPR履歴が同じ文書に積み重なり、「全部終わるまで次へ進めない」と読み取りやすい点にある。

**提案:** Incrementalismを明示し、機能単位の公開判定と横断的な品質進捗を分離する。安全なread-only Demo、通常の認証付きアプリ、匿名公開AIを別の露出範囲として扱う。高リスク境界には義務目標を置き、網羅的な品質改善・完全復旧・文書全域の完成を一律の開発停止条件にしない。

優先する緩和候補は、①Demo Chatの一般的な完全復旧保証、②Phase 10全11項目をまとめた完了待ち、③同じリリースのローカル隔離Buildと配備Buildの重複必須化、④Phase 11の範囲不明な運用・セキュリティレビュー、⑤Phase 12の全ディレクトリ「Complete」である。ただし①は、未終了Leaseを保持して停止を受容し、費用・同時生成・実サービス検証の条件を満たす場合だけ緩和できる。

**現在の公開判定は変えない。** Operation IDの予約相関基盤はGroqの送信・終了証明ではない。実サービス未検証、費用上限の根拠不足、公開UI未接続、Redis障害下の前提未確認が残る。今回の提案書だけではChatを有効化できない。

## 2. Project Goals and Development Philosophy

目標は、個人で開発・保守でき、実ブラウザで研究体験とAI支援を見せられる非商用ポートフォリオである。「SaaS-oriented architecture」は複数ユーザー・Workspace・認可を示す設計上の特徴であり、販売・課金・企業向け運用体制の義務を意味しない。

| 現行箇所 | 評価・変更理由 | 提案する変更内容（未適用） |
| --- | --- | --- |
| Development Principles、L17–29 | 最小構成・必要時の依存導入・過剰最適化回避は漸進主義と整合するが、公開判断の原則がない | 小さな利用者価値→変更リスクに応じた検証→限定公開→制約と改善の記録、という循環を追加する |
| 同上、safe and controlled public deployment | 安全性の対象が曖昧だと品質全項目がゲート化する | データ/秘密/認可/濫用/費用の義務目標と、受容可能な可用性・品質制約を区別する |
| MVP Definition、L1288–1308 | 基本体験を中心とし全SaaS機能を要求しない点は適切。認証/RAG等の「後で導入」は初期順序の説明 | 初期方針として保存し、現在の実装済みbaselineと次の価値ある小機能を別に示す。実装済み基盤を撤去しない |
| Long-Term Direction、L1456–1464 | 検索・接続・議論の方向性は適切だが「再設計不要」を絶対条件にすると抽象化が先行する | 将来拡張は任意の仮説、必要なら小さなモデル変更を許容する方針とする |

義務目標の対象は「その機能を公開する前」であり、未公開機能の義務目標が未達でも、独立した画面改善・ローカル機能・文書整理を進められる。安全性の根拠がない項目を単にKnown limitationへ移すことはしない。

## 3. Current Roadmap Structure

構造はProject Overview、Development Principles、Phase 0–12、MVP Definition、Public Demo Strategy、Long-Term Direction。Phase 0–7はfoundation/baselineとして完了、Phase 8は5項目の定義済みbaseline完了。Phase 9の既存チェックはread-only Demoの実装・限定検証を表し、追加の公開Chat完成を意味しない。Phase 10は **Unit / bounded E2E / Validation / Authorizationの4/11**。Phase 11は配備実績がある一方、AI provider・logs/errors・security reviewは未完了。Phase 12はAI/RAG文書化以外が未完了である。

Phase 10はL536–1236に及び、PR #5–#9の環境・失敗・追加テスト対応表などが占める。Public Demo StrategyもAPIの現在契約とPR #42/#44/#45、Lease hardening、Operation IDの履歴を併記している。履歴は有用だが、現在の次の行動を探す負担が大きい。

関連文書との不整合・時点差は次のとおり。自動修正しない。

| 箇所 | 確認した差異 | 扱い・必要な判断 |
| --- | --- | --- |
| roadmap冒頭 Last Updated=10/27、後半10/29追記 | 更新日と内容の最新日が一致しない | 次回の承認された編集時に更新規則を統一する |
| Phase 10 PR #7/#8のunchecked、PR #10「他10項目未完了」 | 冒頭の現状補足と現在チェックは4/11。明示的な履歴なので新たな退行ではない | 最新状態を1か所に置き、旧判定はdated evidenceとして残す |
| roadmap Phase 10 PR #9、L1232の表示URL防御未実装 | acceptanceのPR #13に表示guard実装・offline検証が記録されている | 旧記述を現在の脆弱性と断定しない。実DB値・実ブラウザ全般の安全証明とも区別する |
| roadmapの375px overlap未解決履歴 | acceptance冒頭はPR #39 Preview E2E 20/20の範囲で解消を記録 | 過去Failを消さず後続証拠に接続。Production alias再検証済みとはしない |
| AI Architecture §6のprompt追加「未コミット」 | roadmap L610は `e707e23` にcommittedと記録。acceptance「関連仕様・実行記録と整合性」も差異を指摘 | 現在仕様と当時のprompt identity未確認を分ける。今回Git履歴を再監査していない |
| AI Architecture §12の「AI panel/chat endpointなし」 | §4.1とroadmapのPR #44/#45は無効なUI・専用生成API基盤あり | Phase 9.2当時の範囲と現在の基盤を明示する必要。公開稼働済みという意味にはしない |
| Lease design §2.5/11の「未コミット」 | 現在のclean HEADで参照できる文書に当時の作業状態が残る | 履歴の状態表現。全復旧設計の実装済み宣言にしない |
| Product Definition §7.2「MVP境界を今後確定」 | roadmap冒頭はportfolio MVP実装済み | 候補リストと現在baselineの役割を整理する必要がある |
| roadmap L1438–1440のPreviewによるBuild確認、acceptance PBのローカル隔離Build条件 | 検証経路・完了定義が異なる。Phase 11 build checkedとPhase 10 PB uncheckedも対象時点/目的が違う | 同じ検証だと統合せず、公開artifact検証とローカル再現性を分ける仕様判断が必要 |
| 今回のLease提案とAI Architecture §4.1 / Lease design §12 | 現行は終了保証・fencing・監査付き復旧を公開前提としている | 本書の限定公開案は意図的な要件変更案。承認と将来の整合化なしには適用できない |

acceptanceが過去に指摘したDirectory StructureのE2E未配置記述なども、現行を照合せず未解決事項として再掲してはならない。文書調査だけで実装との新たな不一致を確定したとは主張しない。

## 4. Phase-by-Phase Review (0–12)

分類: **A=Must-have / B=Should-have / C=Known limitations / D=Optional・Out of scope**。完了済み項目は再分類によって未完了に戻さず、残課題と将来の変更時に適用する。

| Phase / 現行見出し・該当箇所 | 評価・理由 | 残要件の分類と変更案 |
| --- | --- | --- |
| 0 Foundation、L33–48 | Next/TS/lint/UI/文書の土台は完了。環境整備を際限なく拡張する必要はない | 新たなbootstrapは不要。依存・開発環境の健全性維持はB、秘密管理はA |
| 1 Product Definition、L50–66 | 概念・対象・MVP・対象外の完了実績を尊重。古いLLM仕様も再評価可能 | 非商用・Incrementalismを次回の判断基準にする。新規要件の全事前確定はD |
| 2 Data Architecture、L68–116 | 完了。概念一覧のConclusion/Embeddingを追加テーブル必須と誤読しない（Data ModelではResearch/ RetrievalChunkに格納） | データ境界・変更時の移行安全性A。未使用モデル追加D、広範なDB試験B/変更依存A |
| 3 Design System & UI Foundation、L118–135 | baselineとPR #34/#36の実ブラウザ報告を保持。包括WCAG未達と基本利用不能は別 | Demo sidebar/Global Search/icon wrappersはD、全状態theme/a11yはB、公開対象で読めない・主要操作不能はA。未確認条件はC |
| 4 Research Workspace MVP、L137–190 | コアCRUD・Evidence・Discussion・Tag・Discovery完了。表示順も更新済み | Tag rename/Workspace-level Tag削除はD。既存Research機能を改善する小PRは進行可。別Workspace読書き防止A、索引待ち/限定検索はC |
| 5 AI Integration、L192–290 | Research会話baseline完了。raw citation保存と人間による知識化は妥当。後続Phase 6/PR #28の契約を優先して時点差を読む | 意味的引用/完全retry・失敗永続化・全画面共有stateはB/C。provider秘密・認可A。取消による停止/課金停止を保証しない。独立したWorkspace chatはD |
| 6 Retrieval / RAG、L292–317 | baseline完了。0.35 cutoffの限定manual評価は一般精度保証ではない | corpus拡大時評価・chunk選択・reconciliation・vector index最適化B。索引遅延C、別Workspace混入はAで拒否。外部ページ取得/高度rerankingはD |
| 7 Authentication & Multi-User、L319–364 | Auth.js/Google、独立membership scope、server認可baseline完了 | 招待/メンバー除去/高度権限はD。実OAuth全自動化はB。越権防止はA。last-ADMIN競合はC/Bだが、不正昇格や私有データ漏洩につながる競合はAへ格上げ |
| 8 Application Infrastructure、L368–401 | 5項目baseline完了。商用課金・メール不要は既存の決定であり、今回の新規削除提案ではない | 濫用制限・秘密保護はA。embedding計測/詳細コスト分析/dashboard/tracing拡充はB/D。outbox/strong consistencyはB/C。公開AIの費用制御はBillingと別のA |
| 9 Public Demo、L405–532 | curated/read-only実績は維持。専用DBと公開Workspace固定、visitor SaaS lockは中心的安全境界 | 書込み・認証・通常Chat/Inngestの閉鎖A。DB role最小権限B（実際に不要権限を露出する構成ならA）。公開Chatは別ゲート。未使用Inngest Cloud live検証はDemoにはD |
| 10 Testing & Quality、L536–1236 | 4項目完了と後続証拠を尊重。11項目は品質分類で、全機能の一律通過順ではない | 危険な変更の境界検証A、全域品質B、未検証範囲C。項目単位の未完了を隠さず、公開判定と別管理（§10） |
| 11 Deployment、L1238–1263 | 配備・Demo・buildの過去チェックは事実。Tokyo移動はユーザー報告であり計測値ではない | 公開対象設定・主要ブラウザ導線・機密/濫用/停止の限定reviewはA。全ログ分析や常時運用はB/D。AI provider設定はChat有効化時A、read-only公開には不要 |
| 12 Documentation & Portfolio Presentation、L1267–1284 | 文書全域「Complete」は終端が曖昧。AI/RAG完了チェックも他文書の最新性を保証しない | 公開範囲・安全設定・秘密の扱い・停止/制約はA。clone手順/主要構成/代表screenshotsはB。全reference/usage充実や全画面画像はD |

Phase 5等の広い未実装リストは、その章のbaseline時点の記録である。後続の部分改善を無視して「全部未実装」と評価しない。一方、後続offline成功を実サービス成功に読み替えない。

## 5. Must-have Requirements

以下は対象機能の公開前の条件。今回合格を認定する表ではない。read-only Demoですでに記録された合格は保持し、変更した境界に応じて再検証する。

| ID / 対象・現行根拠 | 必須理由・想定被害 | 必要な検証・受入内容 |
| --- | --- | --- |
| A1 データ/認可境界、Phase 7/9、Public Demo Strategy | 他Workspace、User/Auth情報、私有会話の漏洩・改変 | server guardと公開parent scope、関連Source/Tag/Comment投影、他tenant/存在しないID、direct Action/API拒否。公開対象で代表HTTPとブラウザ確認。UIを隠すだけでは不可 |
| A2 秘密と送信データ、Development Principles/Phase 8/9 | provider/DB/Redis/Turnstile secret漏洩、不正費用、私有Researchの外部送信 | client配信・レスポンス・ログ・エラー・build設定を差分review。Demoには選別した公開Researchだけを渡し、質問/回答/生cookie/secretを証跡へ残さない。実際の漏洩経路があれば修正または機能停止 |
| A3 Public Demo deployment lock、Phase 9.3 | 設定漏れで通常SaaS/Auth/Chatを公開、意図しない書込み | `PUBLIC_DEMO_MODE=true` のbuild/runtime一致、既存cookieでも閉鎖、直接API/Action、無効WorkspaceでもSaaS再開なし。新機能は専用入口に限定 |
| A4 匿名Chat入口、AI Architecture §4.1 | cookie偽造/他thread利用、無制限セッション、公開撤回後の生成 | HTTPS Origin・Turnstile success/hostname/action/replay、Secure/HttpOnly/SameSite cookie、Redis所有権/Research再検証、入力byte/文字/timeoutの拒否。実Siteverifyと配備cookie/Originの基本動作を検証 |
| A5 AI濫用・費用、Phase 8/§4.1 atomic limits | bot・並行呼出し・retryによる費用と資源消費 | 10/thread、20/session、3/shared source/min、50/UTC日、2 outstandingを全senderで共有。実RedisでLua/同時予約/更新/拒否/通信不明時fail-closed、SDK再試行なし、固定model・出力/入力境界を確認。別途、受容可能な費用の根拠を確定（§9） |
| A6 Lease安全保持、Public Demo Strategy hardening | 未終了上流と置換生成が重なり同時制限破綻 | 不明Leaseは期限後も数える。reserve不明なら送信なし、renew失敗ならlocal abort、未送信または正常terminal応答だけexact owned release。2枠保持で新規生成を拒否。予算非返金・memory fallbackなし |
| A7 安全な公開停止、Phase 11/§4.1 | 障害中に新規費用を追加し続ける | 運用者と停止手順を定め、全公開入口・旧deploymentを含む新規受付を閉じられることを配備環境で確認。flag変更は既存生成の停止を意味しない。遠隔終了が不明なら停止状態/Lease保持を継続 |
| A8 出力と主要利用導線、Phase 9/10 | 不正markup/URLの実行、危険なリンク、主要情報や停止状態が伝わらない | plain text/strict JSON/Source allowlist・HTTP(S)表示境界、秘密を出さないerror、主要導線のkeyboard/狭幅/可読性、Chatの送信中/失敗/429/503/利用不可表示。根拠ID一致を真実性保証と表示しない |
| A9 配備可能な対象artifact、Phase 11 build | 未完成artifactの公開、違う設定/commitの検証結果の流用 | 公開するcommit/configの正常な配備Build完了と代表runtime/browser smoke。local build再現性は別B。移行や永続データ変更を伴う将来差分では退避/復旧/整合性検証を追加 |

database-role hardening、Preview separation、telemetry redactionは名前だけで一括Bにはしない。例えばPreviewで同じ公開AIキー/ledgerを共有して上限を迂回する場合や、実際のsecret付きURLをSentryへ送る場合はAである。通常SaaSを閉じ、該当送信をしないcurated Demoに、未使用経路の全運用検証は要求しない。

## 6. Should-have Requirements

| 現行箇所・残課題 | 変更理由 | 変更案・再優先化条件 |
| --- | --- | --- |
| Public Demo Strategy L1377–1403、完全復旧・全lifecycle監査 | 安全な永久停止を許容するなら一般的復旧は可用性改善 | §9の条件付き限定公開ではB。復旧操作を提供するなら、その操作の証明/fencing/監査はA |
| Phase 10全域・acceptance I/DB/AI/E | 既存の有限gateにも、公開対象と無関係な通常SaaS検証が含まれる | 継続品質backlogとして維持。変更が触る実DB制約・認可・費用境界の部分だけA |
| Phase 10 A/R、Phase 3/Design System §17 | 全画面/全状態/全環境の完了待ちは小変更を止める | 変更画面の主要操作を優先、全域contrast・screen reader・物理端末・OS追従を段階実施。利用不能が分かればA |
| Phase 10 PB / PR #5 | 公開artifact成功とローカル完全再現は別問題 | Preview/配備pipelineの根拠を公開判定に使い、credential-free local再現性は独立B。既存PBチェックをPassにしない |
| Phase 8.3/6、outbox/reconciliation/index tuning | curated Demoにはruntime索引更新不要、通常アプリはbest-effortで動作する | 索引不整合の説明・手動reindexを先行し、永続再照合/高速化は実害やcorpus増大後 |
| Phase 8.4/8.5、Phase 11 logs/errors | 詳細tracing・analyticsは安全停止の必須条件ではない | 最小限の失敗/容量確認を先行。常時poller・dashboard・定量性能最適化は後続 |
| Phase 12 README/architecture/usage/screenshots | 主要情報の不足は改善したいが、全領域完成は不要 | clone/runと公開範囲、重要設計、代表画面を小分けで改善 |

Should-haveには次回見直す契機を置く。運用負担が増えた、同じ障害が反復した、公開範囲を広げる、データが増えた、主要画面を変更した、を優先化の契機とし、無期限に忘れない。

## 7. Known Limitations

これは**受容候補**の一覧であり、未検証の安全条件を承認済みにするものではない。

| 制約・根拠 | 影響範囲 / 発生時の動作 | 利用者への影響・必要な説明 | 再評価条件 |
| --- | --- | --- | --- |
| 不明Lease無期限保持、§4.1/Lease design | 1枠で能力低下、2枠で全生成拒否。日替わりでも復旧しない | Chatが長期または恒久に利用不可。read-only研究閲覧は独立して継続。復旧予定を約束しない | 反復枯渇、ライブ体験が主目的になった時、停止証明を持つ実行方式が得られた時 |
| Operation HASH 10,000件・no GC、roadmap L1408–1424 | 上限で新規予約503。正常Lease解放でも履歴は減らない | Chat停止。50件/日で空から概ね200日は既存設計の目安で、部分失敗なら早い | 記録増加/容量接近。完了証跡の保持/replay方針を別設計。無条件削除しない |
| shared source bucket、Phase 9/§4.1 | 全訪問者が3/minを共有。セッション作成にも共有制限 | 他人の利用で429、匿名session rotationで公平性は保証しない | 実利用で過剰拒否。trusted IP導入は別review、偽造forwarding headerは使わない |
| AIの誤り・意味的引用未保証、Phase 5/6/10 | Source所属が正しくても推論や因果表現が誤る | 保存済みmetadataに基づく補助回答。原文を読んだ/事実検証済みと表示しない | 評価Fail反復、誤解を誘うUI、対象用途の高リスク化。重大な害が見込まれれば公開縮小 |
| Demo context打切り・historyなし、Public Demo Strategy | 12,000 code points/10 Findings/10 Sources等で省略、回答を保存しない | 継続会話・網羅回答ではない。contextTruncated/不足通知、再訪時に回答復元なし | 研究規模拡大・履歴を求める具体的用途 |
| 出力domain heuristic、PR #45 follow-up | 正当な技術語を拒否し503になる可能性。例外4語は限定 | 質問が有効でも回答不能。エラー文は一般化したまま案内 | 実際の誤拒否例。markup/URL・allowlist境界を保って別修正 |
| SaaS Chat部分保存/手動retry重複、acceptance PR #28 | USERだけ残る、usage失敗でAI未保存、POSTとGETを厳密相関できない | 表示成功と保存成功の違い、再送による重複に注意。Demoには永続会話なし | 保存の信頼性を改善する時、課金/大量利用を導入する時。費用被害が大きければA |
| best-effort indexing、Phase 6/8.3/Data Model §7.11 | enqueue失敗/更新待ちで古い知識が検索に残る | 最新編集が直ちにAIに反映されない。手動reindex、元Researchで確認 | stale頻発、削除情報の再表示が問題化。認可を越える結果は許容不可 |
| ADMIN降格等の競合、Phase 10 PR #7 | 逐次検証のみ。最後のADMIN喪失等の実DB競合未検証 | 個人/管理用途では手動保守の負担。通常SaaS公開条件は露出に応じ別判断 | 同時管理を提供、メンバー操作拡大。権限突破を示す証拠があればA |
| a11y/responsive/themeの未確認範囲、Phase 3/10 | 全browser/viewport/screen readerを検証していない | 対応実績と未確認環境を明記。主要導線の既知の操作不能は受容しない | 新画面/共通CSS変更/利用者報告 |
| 実サービス・配備identity未確認、各検証履歴 | offline成功から本番動作を結論できない | 今回のレビューに検証済み表示を付けない | 対象機能公開前の必要検証。Aの不足であれば制約受容だけでは公開不可 |

Redisのack済み予約喪失によるoversubscriptionや、無制限の費用リスクは「単なる可用性低下」として受容しない。具体的構成の安全前提と残存リスクを別途判断する。

## 8. Optional / Out-of-Scope Requirements

| 対象 / 現行根拠 | 評価・提案 |
| --- | --- |
| Subscription/Stripe/Billing sync、Phase 8 L380、MVP L1308 | すでに対象外。復活させない。公開AIの費用保護を課金機能に置き換えない |
| Email login/Magic Link/通知、Phase 8 | 具体的用途まで対象外。Google OAuth実装済みで追加メール基盤は不要 |
| Enterprise管理、高度role、招待/除去、Product Definition §8/Phase 7 | 具体的なポートフォリオ価値が生じるまで任意。既存認可は維持 |
| Demo sidebar/Global Search/Related Research、Phase 3/Design System | UX候補。公開前提やbaseline未完了の理由にしない |
| 外部Source fetch、hybrid/reranking、独立Workspace chat、高度model管理、AI Architecture §12 | 現在の研究体験で必要性を確認してから。導入時は別の認可/SSRF/費用reviewが必要 |
| 商用SLA、24時間対応、複数担当者の承認体制、常駐自動復旧 | 個人Demoの一律要件にはしない。安全な停止と本人が理解できる手順は必要 |
| 課金分析dashboard、全量tracing/replay、汎用job platform | 今あるSentry/Inngestを撤去する提案ではない。拡充を目的化しない |
| 全文書ディレクトリ完成、全画面screenshots | 開発・公開に必要な情報がある限り任意。主要READMEと代表画像はB |

## 9. Demo Chat Public Release Criteria Reassessment

### 現行条件と変更の境界

対象はPublic Demo StrategyのPR #45 follow-up（L1377–1380）、Still required before activation（L1394–1403）、Operation ID（L1408–1424）、およびAI Architecture §4.1 / Lease design §12。現行は終了ackまたは強制remote lifetime、全worker fencing、監査付き復旧を公開前提としている。これらは**復旧して再開する安全性**を求める条件として合理的だが、**復旧不能なら生成を止め続ける公開方式**まで一律に排除する必要は再検討できる。

現行文は「すべての障害の完全自動復旧」を実装済みとも必須とも明言していない。問題は、一般的なremote終了証明が得られない限り公開不可となる組合せである。提案はこの適用範囲の変更であり、存在しない保証が得られたと書き換えるものではない。

| リスク | 判断 | 公開前に維持する条件 |
| --- | --- | --- |
| データ漏洩・認可突破 | A。復旧とは独立して防止する | public Research投影、通常SaaS閉鎖、Origin/session/所有権/secret保護 |
| 不正利用・費用暴走 | A。quarantineだけでは費用保証にならない | 実効的予算制限、固定model/入力/出力/retry制限、未終了分を含む費用判断、新規受付停止 |
| 同時生成制限の破綻 | A。不明枠再利用は禁止 | 全sender共通ledger、保持・非返金・fail-closed。Redis喪失/旧deploymentによる迂回前提を確認 |
| 生成不能・可用性低下 | B/Cへ移せる | 2枠停止を受容し、read-only閲覧継続と利用不可表示。時間で空けない |
| 復旧手順・運用の不足 | 停止手順はA、復旧機能は提供時A、一般的復旧の完成はB | 証拠がなければ停止継続。手動で消す以外の運用選択を認める |

### 限定公開へ進む場合の必要条件（提案・未達を含む）

1. **公開方式を承認する。** 「停止することがある実験的・非永続Chat。復旧時期は保証しない」を仕様とする。枯渇で永久停止する可能性を開発者が受容する。read-only Demoは独立して公開継続できる。
2. **安全不変条件を維持する。** 不明Leaseは無期限保持、2件で新規送信を拒否、予算非返金、memory fallback/不明予約の自動再送なし。未終了/legacy Leaseを新namespace、key reset、上限増加、credential切替で忘れない。全公開deployment/workerと資源共有範囲を把握する。
3. **費用を公開前に具体化する。** 50 accepted/UTC日・700 output tokens・30秒local timeoutは金額のhard capでもremote停止保証でもない。通常時の入力/出力、モデル/アカウントの課金条件、UTC境界をまたぐ利用、未終了request、session/拒否requestのRedis・Turnstile・Function消費を含む許容額と前提を定める。必要なら独立したprovider/account側の強制支出/利用上限が当該経路に実在し有効か確認する。通知だけをhard capと呼ばない。未終了処理の費用を受容できる根拠が得られなければ**ライブ公開はNo-Go**。本書では額もprovider機能も仮定しない。
4. **実サービスの基本検証を省略しない。** 別途承認した専用環境で、Groq正常終了/出力拒否、SDK retryなし、Redis実Lua・競合・renew/release・timeout時fail-closed、Turnstile・cookie・Origin、配備Functionの切断/時間切れ、2枠停止、新規受付停止を有限ケースで確認する。観測したabort動作を一般的終了保証にしない。故障全組合せの網羅試験はBとできるが、現実の基本経路までmockだけで代用しない。
5. **Redisの安全前提を確認する。** 対象構成のno eviction、共通namespace、承認済み予約の保持・順序付け・障害時挙動を根拠付きで評価する。正常Lua試験だけでfailover/partition時の厳密上限保証とはしない。重大な予約喪失リスクが未解決なら、構成/実行基盤の見直しまたは非ライブ方式に留める。
6. **停止を実行可能にする。** 本人が全公開入口を停止し、旧配備を含む新規送信を抑止できることを確認する。環境変数変更/再配備にかかる時間も記録する。flag offやkey無効化は既存Groq生成の終了証明ではない。既存分の費用・枠は不明のまま扱う。枯渇時はChat unavailableとし、復旧なしで運用を終える選択を認める。
7. **UIを別途統合し実ブラウザで確認する。** 現UIはflagに関係なくdisabled。将来の統合でopt-in、送信中、error/429/503、重複送信、keyboard、狭幅、公開停止後の表示を検証する。既存Public Demo GET-only E2EでPOST/生成を検証済みにしない。

**Operation IDの意味:** serverが予約前に発行し、同じEVALでLeaseとscope hashを相関する基盤はある。同一server Operation IDの再予約を拒否するが、独立HTTP再送のdedupではない。`attempted/reserved`は送信権状態機械ではなく、provider submission/terminal receipt、invocation/deployment identity、完全な監査もない。記録あり/なしからGroq終了や未送信を証明できない。相関基盤の追加で公開条件を満たしたとはしない。

**Bへ移せるもの:** 有限時間内の一般的復旧、復旧管理UI/CLI、late receiptによる回収、全lifecycle可視化、完全自動復旧。これらを実装しない限定公開では「復旧を一切せず停止継続」が基本手順になる。復旧を実装・実行する場合には、exact attemptの未送信/終了証拠、今後の送信権閉鎖、owner/version照合、監査付きexact-member操作がAへ戻る。

**禁止を維持:** Lease期限、30秒/60秒、Function終了、AbortError、token上限、ログ不在、使用量横ばい、key失効だけを根拠に解放しない。不明Leaseを期限だけで消す方式は提案しない。

### 現実的な検証制約と代替案

[Redis verificationの運用判断](demo-chat-redis-verification.md#user-operational-decision-and-next-verification-work) は、追加の専用Upstash検証DBが当人の条件では有料になるため作らず、既存runner実行を保留している。これは現在の制約として尊重する。既存Demo Redisをrunnerへ流用せず、local Redisの成功をUpstash REST/配備成功に置き換えない。

無料の範囲で得られる証拠と必要な公開条件が両立しない場合は、Chat無効のまま他機能を進める。事前生成/固定回答を明示したデモも選択肢だが、現UIはsample answerを表示しない契約なので別の製品判断が必要。強制終了/費用保護を確認できるprovider等への変更も別設計であり、今回採用済みとはしない。

## 10. Testing and Quality Policy Reassessment

変更対象: Phase 10 L536–558 とacceptanceのCompletion decision policy/matrix。**現行acceptanceはすでに有限scope・既存証拠再利用・変更境界のみ再検証を採用しており、11項目全部を各変更の必須ゲートと明記しているわけではない。** 提案はこの長所を前面化し、「品質項目の完了」と「機能公開の可否」を明示的に分けることである。

| 11項目 / 現状 | 提案する役割・必要な時 |
| --- | --- |
| Unit / checked | 既存有限受入を維持。非自明なロジック変更の対象境界を検証。低影響の文言/CSSを写すだけのテストは追加しない |
| Integration / unchecked | 実モジュール鎖・HTTP/Action transportに変更がある時、その許可/拒否/失敗状態を確認。全アプリ統合完了待ちは不要 |
| Database / unchecked | schema/移行/FK/cascade/lock/原子性を変更する時は実DBの該当検証をAにする。無関係なUI変更の前提にしない |
| AI-related / unchecked | 引用/allowlist/context/入力出力制御は変更時のA。意味的品質はboundedな評価B。旧Gemini/Groq評価を新Demoの品質合格にしない |
| E2E / bounded checked | Public Demo＋C2 Smoke4/4＋Chat mock6/6の限定合格を保持。変更画面の実ブラウザ確認を選び、実OAuth/実AI合格を追加しない |
| Validation / checked | 有限入力契約受入を維持。新入口・payload・URL・byte限界変更時に対象の拒否/副作用を確認 |
| Authorization / checked | 有限逐次scope受入を維持。入口/tenant/role変更時はserver境界と代表transportをAで再確認 |
| Error handling / unchecked・Partial | 情報漏洩/false success/濫用継続を防ぐ失敗経路はA。全例外/完全retry/全browser回復はB/C |
| Accessibility / unchecked | 主要導線の名前・keyboard・focus・可読性は対象公開時A。全状態/全補助技術はB、未確認範囲C |
| Responsive UI / unchecked | 変更画面の代表狭幅/desktopと主要breakpointを実ブラウザ確認。全画面×全端末の完了はB |
| Production build / unchecked | deployするartifactの成功はA、独立local再現性はB。今のPB未実施/未完了をPassへ変更しない |

変更リスク別の選択案:

| 変更例 | 必要な確認の選び方 |
| --- | --- |
| 文書だけ | 参照・事実/提案・既存実績との整合・差分を確認。本タスクではtest/Build不要 |
| 文言/小さな表示 | 変更箇所と狭幅/keyboard等の関係する実ブラウザ確認。新規自動testは回帰価値がある時だけ |
| 共通CSS/theme/navigation | 代表一覧/詳細、Light/Dark、狭幅/desktop、focus/zoom。影響する既存E2Eを選ぶ |
| CRUD/data契約 | schema/Action/guard/副作用の関連検証。永続制約を変えるなら隔離実DB、主要ブラウザ導線 |
| 公開AI/認可/秘密/予約制御 | offline境界＋代表HTTP/browser＋関係する実Redis/providerの有限検証。費用・停止条件と旧deploymentも確認 |
| 配備/設定/build変更 | 対象artifact・環境のidentity、設定/secret分離、build完了、代表runtime smoke。無関係なAI品質評価は不要 |

各PRに「差分の危険/影響範囲、選んだ検証と理由、結果、未検証/制約、停止条件」を短く記録する。Pass / Fail / Not run / Blockedを維持し、実行者、対象commit/deployment、mock境界を省略して成功範囲を拡大しない。既存証拠がそのまま使える部分は再実行しない。AIの18回答等の固定件数は既存品質gateの契約として保存するが、すべての画面改修の公開条件にはしない。件数/サンプリング変更は別の明示的scope判断とする。

## 11. Roadmap Simplification Proposal

| 現行見出し・該当箇所 | 変更理由 | 将来の変更案 |
| --- | --- | --- |
| 冒頭Current stage | 現状と詳細履歴が離れている | 公開範囲、baseline完了、進行中機能、公開blocker、次の小PR、証拠リンクだけを短く示す |
| Development Principles | 安全・品質・価値開発の進め方が暗黙 | §2のIncrementalismとA/B/C/D、機能単位公開判定を追加 |
| Phase 0–8 Status | 完了後も追補で本文が拡大 | 各PhaseはGoal、bounded scope、状態、残る重要制約、architecture/evidenceリンクに揃える |
| Phase 9とPublic Demo Strategy | 公開設計とPR仕様が重複 | read-only公開baselineと未公開Chatの条件を別小節にし、現在契約はArchitectureへリンク |
| Phase 10 PR #5–#9詳細、L648–1236 | tool version、環境事故、assertion一覧、schema field仕様は実行証跡/契約 | roadmapには4/11の意味、次の優先事項、検証選択方針を残し、詳細は既存acceptance/証跡文書へ分離 |
| Phase 11 logs/errors/security review | 範囲が無制限に読める | 「この公開対象の設定/秘密/境界/濫用/停止レビュー」と「継続運用改善」に分ける。read-onlyでAI provider未設定はblockerにしない |
| Phase 12 Complete docsディレクトリ | 完了定義がない | 「公開・保守の最低情報」「cloneして試す情報」「portfolio表現」「随時拡充」に分け、具体的情報単位の完了とする |
| MVP Definition / Long-Term Direction | 初期順序と将来展望が現在の義務に見える | 初期MVP達成範囲と将来候補を明示し、拡張は具体的用途で選ぶ |

ロードマップに残すのは「何を、なぜ、どの順で、どの範囲まで、何が公開を止めているか」。API field、Lua state、詳細数値、全PR時系列をロードマップに重複記載しない。簡素化は検証根拠の削除や完了条件の無断縮小を意味しない。

## 12. Documentation and Evidence Preservation Plan

将来の承認された整理での役割分担案:

| 置き場所 | 内容・優先度 |
| --- | --- |
| roadmap | 現在状態、Phaseの有限目標、次の価値開発/保守、公開ゲート、制約と証跡への索引 |
| Architecture | 現在有効なデータ/認可/API/provider/Lease契約と前提。歴史的仕様から区別する |
| Planning | 未採用案・調査・判断理由・risk acceptance、実行別検証記録。採否/日付/基準HEADを明示 |
| README / Usage | 目的、公開範囲/制約、clone/runの入口、必要環境変数の用途。秘密値を載せない |
| Deploymentの最小手順 | 対象環境・公開mode・secret用途・停止方法・未終了分の扱い・安全に再開できない条件。匿名AI公開前に必要 |
| Portfolio presentation | 代表screenshots、主要設計と学び、ローカル利用案内。全画面文書完成を待たない |

証跡移行の具体的手順案（今回は未実行）:

1. roadmap各履歴の見出し、元行範囲、PR/commit、移行先anchorを索引化する。既存acceptanceやC2/PR #42/Redis文書と重複を照合する。
2. 既存文書にない原文は日付付き証跡へ保持する。単に短縮して失敗・中断・Not run・実行者・mock境界・環境条件・後続訂正を落とさない。ローカルignored artifactを存在確認せず公開証拠のようにリンクしない。
3. 後続記録で解消した問題は、元Failと修正後Passの両方を相互参照する。PR #39 Preview成功をProductionへ、C2 mockを実AIへ、工程完了報告をcredential-free buildへ読み替えない。
4. 元見出しへ短い移行案内と新索引を残して既存リンクを保つ。旧文書の全文はGit履歴でも追えるが、履歴だけに追いやらず現行索引から辿れるようにする。
5. 内容照合・リンク確認後に、roadmapの重複詳細を置換する別PRをレビューする。既存チェックは根拠/限定scopeを伴って保持し、再分類と過去のPass/Failを別の軸にする。

文書を完成させるためだけの大量更新は行わない。重大な仕様判断・公開範囲・モデル/route変更時に関連する現在契約だけを同時更新し、通常の実装詳細変更は文書化を目的化しない。

## 13. Proposed Incremental Implementation Order

以下は提案順序で、実装・実サービス操作の今回の許可ではない。公開Chatの調査待ちでも他の項目を進められる。

1. **方針を決める。** 本書の分類、停止受容型Chatか非ライブ方式か、受容費用と検証環境を開発者が選ぶ。採用後に限り現行roadmap/Architecture/Lease design/acceptanceの該当条件を別の文書PRで整合化する。
2. **小さな価値開発と実ブラウザ確認を続ける。** 既存研究画面の読みやすさ・navigation・必要な小機能等から一つ選び、対象画面の確認を完了する。新機能を本書で勝手に必須化しない。Phase 10全完了を待たない。
3. **最小文書とroadmap索引を整える。** 現在公開範囲・制約・停止手順を優先し、履歴を保存して長い重複を分離する。必要な保守を機能PR間に挟む。
4. **Chatを進めるならofflineで残る境界/UIを具体化する。** opt-in/Turnstile/回答/失敗/制限のUI、公開/通常SaaS/C2分離、重複送信の扱いを限定scopeで実装・検証。disabledのままreviewできる状態にする。完全復旧基盤は並行必須にしない。
5. **実環境の基本検証と費用/停止演習を行う。** 別承認・専用環境・合成公開データ・費用/回数上限・停止条件を定める。local RedisとUpstashの証拠を区別。専用Upstashを作らない現判断と両立しなければ、この工程と公開Chatは保留する。
6. **対象Previewを実ブラウザで受け入れる。** build/artifact identity、正常回答・429/503・狭幅/keyboard・停止後表示・read-only境界の回帰を確認。全通常SaaS品質の完了は条件にしない。
7. **公開可否を別途判定する。** Aが満たされ、Cの影響と費用が受容された場合だけ段階的に公開する。条件不足ならChat無効を維持してread-only/他機能を進める。本書は有効化を承認しない。
8. **実害に応じて改善する。** 枯渇/誤拒否/品質/容量の観測に基づき、receipt記録、証跡限定復旧、reconciliation、a11y等を小PRで選ぶ。危険な緩和で復旧を急がない。

## 14. Risks of Relaxing Requirements

| 緩和案 | 安全性を損なう経路 | 必要な歯止め / 判断 |
| --- | --- | --- |
| 完全復旧を公開条件から外す | 運用者が停止に耐えられず不明Leaseを消し上限を破る | 停止継続を正式な仕様にし、reset/namespace切替/枠増加を復旧扱いしない。復旧不可なら閉じる |
| 実サービス試験を全面Bへ移す | SDK retry、cookie/Origin、Redis実挙動がmockと違い濫用防止が働かない | 基本経路と重大な失敗拒否はAのまま。全故障組合せの網羅だけをBへ |
| 50問/日を費用上限扱い | 日替わりで予算回復、未終了上流、拒否trafficやinfra費が別に増える | 独立した費用根拠と許容額を確認。不明なら公開不可。停止flagだけを支出停止保証にしない |
| Redis耐久性を単なる可用性制約扱い | 予約が失われて空枠に見え、稼働中Groqと重複 | ack保持等の前提を明示し構成を評価。実Lua成功だけで厳密上限を主張しない |
| Phase 10を選択制にする | 面倒なauth/DB/費用検証を低リスクと呼んで除外 | 変更理由・露出・失敗時被害と選択検証を短くreviewし、Aを免除しない |
| a11yをすべて努力目標にする | 主要操作や警告・停止状態が利用者に伝わらない | 基本操作/可読性はA。未確認の全環境適合と区別 |
| Phase 11 security reviewを縮小 | secret/log/Preview共有や別入口を見落とす | 対象deployment・入口・共有credential・データを有限inventoryにし、重大境界は残す |
| 文書/証跡を短縮する | Fail/Not runが消える、古いPassの対象が広がる | §12の原文保存・索引・scope/実行者保持。安全設定と停止手順の不足は放置しない |
| 高度監視を後回しにする | 枠/費用/記録容量の接近に気付かない | 本人が確認できる最小限の容量・失敗・利用量確認と停止判断を残す。商用監視基盤は不要 |

最も危険なのは「非商用だから費用・認可・Leaseを緩める」という読み替えである。緩和するのは主に網羅性・可用性・運用品質の達成時期であり、重大な被害を防ぐ実効的な境界は維持する。

## 15. Decisions Requiring Developer Approval

以下は今後の仕様判断であり、今回の作業を止めるための許可要求ではない。承認なしに既存仕様を変更しない。

| 決定事項 | 推奨案 | 未決時の扱い |
| --- | --- | --- |
| 非商用Incrementalismの明文化 | 機能開発と保守を並行し、A/B/C/Dと機能単位公開gateを採用 | 現行仕様を維持 |
| Chatの公開方式 | 費用/実環境条件が揃う場合だけ、無期限停止を受容する限定ライブ方式を候補にする | Chat無効、read-only Demoを継続 |
| 許容費用・上限制御・停止対応 | 具体的金額と期間、未終了分/infra分を含む前提、本人の確認頻度と停止方法を決める | 費用安全性を未確認としてライブ公開不可 |
| Redis/Provider検証の環境と費用 | 追加有料Upstashを作らない既存判断を尊重。安全に条件を満たせる代案だけ別検討 | 既存Redis runner保留。既存Demo DBへの流用なし |
| 完全復旧とlifecycle基盤の優先度 | 停止受容なら一般的復旧はB。復旧する際の証拠・fencing・監査はA | 不明Lease保持、復旧/再開なし |
| Phase 10の判定方式 | 11項目は進捗として維持し、公開可否は差分リスクとA条件で判断 | 4/11、Error Partial、既存Not runを保持 |
| Build証拠の経路 | 配備artifact成功を公開A、local credential-free再現性をBに分離 | Phase 10 PB uncheckedとPhase 11の過去checkedを維持 |
| Phase 11/12の有限scope | 個人Demoの安全設定/停止/主要手順を先行、商用運用・文書全域完成を要求しない | 現行未完了を完了にしない |
| roadmap/証跡の構造整理 | §11–12に沿う別文書PR。原文・リンク・限定実績を保つ | 今回は一切移動・編集しない |
| 非ライブ代替/モデル・基盤変更 | 基本検証や費用根拠を満たせない場合に検討。既存未終了処理は引き継いで扱う | Coming soon/disabledの現状維持 |

本レビューの成果物は **`docs/planning/roadmap-requirements-review.md` の新規作成1件だけ**。既存仕様と実装はそのまま、未追跡・未ステージ・未コミットで終了する。

---

### 方針採用・改訂反映状況 — 2026-10-29 JST

後続タスク「Roadmap Policy Revision — Phase 1」で、roadmapのDevelopment Principles、Phase 9〜12、Public Demo Strategyへ本書に基づく方針を反映した。非商用Incrementalism、完了状態と独立したA/B/C/D分類、変更リスク別の検証、個人Demo向け運用・文書優先順位を採用。Phase 8の既存対象外方針は重複追記せず維持した。

完全自動復旧・全不明Leaseの回復保証を一律の公開前義務から外し、停止受容型の限定公開を条件付き候補とした。期限だけの解放は禁止、実サービス・ブラウザ基本検証、Redis障害時の安全前提、実Groq料金/利用枠/最大消費リスクと実効的費用制御、受付停止は引き続き必須。Operation ID相関は終了証明ではなく、現行のChat無効・UI disabled・公開No-Goを維持する。

本書の上記15章は初回レビューの原文・評価として保持。履歴の移動・削除、チェック/過去実績の変更はしていない。AI Architecture §4.1とLease recovery design §12の従来の一律公開gateは未整合、Phase 10 acceptanceのローカル隔離PB完了条件も未変更であり、Previewを用いた限定公開判定で完了したとは扱わない。他文書の整合修正は別作業とし、公開Go判断前に必要な整合と安全条件の確認を残す。今回の反映は公開承認・実装・新たな実サービス検証ではない。
