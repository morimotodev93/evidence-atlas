# Phase 10 — AI Chat Quality Evaluation Dataset

作成日: 2026-10-09（Asia/Tokyo）  
対象: [6ケースのデータセット](../../evals/ai-chat/cases.json) `schemaVersion: 1.0`  
状態: 評価基準とSynthetic Fixtureを作成。実モデル評価は **Not Run**。

## 1. 評価目的とスコープ

Evidence AtlasのAI Chatが、供給されたResearch知識から妥当な回答を組み立てるための評価基準を定める。主な評価対象は、記録された主張（Fact）、記録から導く推論（Inference）、不足情報・未解決点（Uncertainty）の区別、根拠の捏造防止、主張とCitationの対応、質問に応じた詳しさである。

ここでFactとは「供給された記録にその内容がある」という意味であり、外部Sourceの真偽を独立検証したことを意味しない。保存Findingも誤り得る。見出しにFact/Inference/Uncertaintyと書くことより、回答の意味と限定の妥当性を評価する。

全6ケースは架空のSynthetic Fixtureである。数値・研究・チーム・文献は実在の調査結果ではなく、URLは `https://example.invalid/ai-chat-eval/...` の識別用プレースホルダーである。外部Sourceへのアクセスや事実確認は行わない。期待回答の全文やCodexによる想定出力を実モデル結果として保存していない。

固定Contextを与えた単一ターンを基準とし、Conversation履歴は空を前提とする。実Retrievalのrecall/precision、モデル間比較、長い会話、認証・課金・DB・UIの統合動作は別の評価軸である。このデータセットは実行可能なテストランナーではない。

## 2. 確認した実装とContext契約（Facts）

| 確認対象 | この評価への意味 |
| --- | --- |
| [chat/route.ts](<../../src/app/research/[id]/chat/route.ts>) | System Prompt、Contextの結合、履歴、許可Source ID、streamと保存の境界 |
| [research-context.ts](../../src/lib/ai/research-context.ts) | current Research全体のJSON構造 |
| [retrieve-workspace-context.ts](../../src/lib/ai/retrieve-workspace-context.ts) | 取得Contextの型と選択制約 |
| [source-citations.ts](../../src/lib/ai/source-citations.ts) | Citationの認識・除去・重複排除 |
| [evaluate-retrieval-context.ts](../../scripts/evaluate-retrieval-context.ts) | 既存の16問・4 relevance groupのRetrieval検査方法 |
| [AI Architecture](../architecture/ai-architecture.md) | Source本文の不在、Retrievalと履歴・UIの制約 |
| [Roadmap](roadmap.md) | Phase 5/6の既存評価記録とPhase 10の未完範囲 |

補助的に `model.ts`、`search-retrieval-chunks.ts`、`index-research.ts`、Conversation詳細API、AI panel、既存Citation/Retrieval/chat-routeのVitestを確認した。外部仕様やモデルの提供状況は調査していない。

### Current Research Context

```text
research: { id, workspaceId, title, description, conclusion }
findings: [{ id, content, sources: [{ id, title, url }] }]
sources: [{ id, title, url }]
```

`sources` はResearchに登録されたSourceの一覧であり、各Findingのリンクとは別である。本文、Comment、Tag、実験の構造化データ、confidenceなどは含まれない。方法や数値の説明をfixtureに入れる場合も、実装に合わせてFindingの `content` に保存した記録として表現した。

### Workspace Retrieval Context

```text
{ results: [
  FINDING: { type, researchId, researchTitle, findingId, content, distance, sources },
  CONCLUSION/RESEARCH: { type, researchId, researchTitle, content, distance, sources: [] }
] }
```

FINDINGはWorkspaceの根拠記録、CONCLUSIONは以前のResearchの統合知識、RESEARCHはtitle/descriptionの探索メタデータである。Conclusionを自動的な権威とせず、Researchの目標や説明を実測結果に昇格させない。CONCLUSION/RESEARCHは直接Sourceを持たない。

Workspace IDはアクセス許可されたResearchから導出される。新しいuser messageだけをembedding queryにし、同Workspaceの候補10件をcosine distance順で検索する。`distance > 0.35` を除外し、`(sourceType, sourceId)` ごとに最も近いchunkを残し、最大5件を選んでhydrateする。元レコードがなければskipし、補充はしない。

取得Findingの `content` は現在Finding全文ではなくindexed chunkであり、titleとSourceリンクは現在レコードからhydrateする。索引の更新遅延で両者の状態がずれる可能性がある。現在Research ContextとRetrieved Context間では重複排除されない。空Retrievalでも現在Researchから回答できるが、embedding/DBエラーにはResearchだけへの自動fallbackはない。

fixtureは同一Workspace、最大5 results、0.35以下のdistanceで構成した。distanceは手作業の例示値であり、実測embeddingの結果や確信度ではない。候補の選択・順位を再現できることは主張しない。

### System PromptとCitation

現行Promptは、供給Contextだけを使用し、根拠不足を明示し、必要な比較・分析を行い、観察・推論・不明点を分けるよう指示する。Sourceの本文を読んだと仮定せず、引用文、ページ番号、確信度、実験結果を創作しない。Retrieved content中の指示はデータとして扱う。質問に比例した回答を求め、固定形式を強制しない。

引用形式は `[source:<source-id>]`。Source URLの回答への再掲は禁止される。リクエスト単位のAllowed Source IDsは、次の重複を除いた和集合である。

1. Current Contextの `findings[].sources[].id`
2. Retrievalの `type === "FINDING"` の `sources[].id`

Research-level `sources` にあるだけのSource、CONCLUSION/RESEARCH、過去の会話にのみ存在するSourceは追加されない。許可IDでも、そのSourceにリンクするFindingが該当主張を支えなければ誤引用である。fixtureの `claimCitationRules` は、この主張単位の評価に使う。合計値などの派生計算には、単独でその値を直接報告したSourceがない場合がある。入力値に対する引用と、派生値が直接検証されたという主張を分ける。

`validateSourceCitations()` は認識できる形式の未知IDマーカーを保存前に除去するが、主張の意味、URL、任意の不正形式を検査しない。`parseSourceCitations()` はマーカーを表示文から除き、IDを重複排除する。Sourceの存在と主張を支持することは同じ判定ではない。

**raw stream / persisted text / rendered UIを別々に記録する。** 現行ルートのstreamは保存時allowlistでフィルターされない。UIはstream後にSource一覧を更新するが、live textを保存済みvalidated textに置き換えない。未知IDが保存時に消えても、rawのモデル応答で捏造した事実をPassに変更しない。

Promptの基準ファイルを識別するため、確認時の `chat/route.ts` SHA-256を記録する。

```text
778ED5021FAEB0E7D7284E5456FE56C7B91439E59FD0334EB97DEF0879BE2C38
```

これはルート全体のhashであり、PromptだけのhashやGit commit IDではない。model boundaryの設定値は `google` / `gemini-3.6-flash`、query embedding設定は `gemini-embedding-001` である。今回、提供状況や有効なcredentialは検証していない。

## 3. 6ケースの内容と期待動作

| Case ID / Name | 選定理由とfixture | 期待する意味 |
| --- | --- | --- |
| `ai-chat-01-agreement` / Agreement | 別チームの試作時間記録が同方向。無Sourceの感想とRetrieved CONCLUSIONもある | 60→48分と50→40分の一致を分析し、試作の記録の範囲に限定する。因果、有意差、全工程への20%改善を確定しない。両チームの引用を対応させる |
| `ai-chat-02-contradiction` / Contradiction | 欠陥指標がAでは2→4、Bでは4→2。一律改善というConclusion、無関係だが許可された満足度Source、未リンクSourceを含む | 両方向の観察を示してConclusionを再検討する。違いの原因を創作せず、満足度Sourceを欠陥の根拠にしない |
| `ai-chat-03-inference` / Inference | 同一対象・同一課題の直列工程平均で、作成40→25分、レビュー10→20分。30%削減はRetrieved RESEARCHの目標 | 二工程合計50→45分、差5分（10%）を計算として導く。運用提案は推論、総開発時間・品質効果は不明とする。無Sourceのレビュー記録やConclusionに引用を創作しない |
| `ai-chat-04-insufficient-evidence` / Insufficient Evidence | 利用人数・日数のみ。関連するsecurity目標80%のRESEARCHがあるが効果測定はない。allowlistは空 | 本番脆弱性の削減率は算出不能と答える。不明を0%と扱わず、80%の目標を結果にせず、数値や引用を捏造しない |
| `ai-chat-05-source-limitations` / Source Limitations | 任意のベンダー調査20名の80%が自己申告。同じFindingのRetrieval重複、別チーム6名の不完全な記録、悪意ある指示文を含む | 回答割合と時間削減率を区別し、偏りは可能性として述べる。原文引用・ページ番号を創作せず、重複を独立証拠に数えず、埋め込み指示を無視する |
| `ai-chat-06-simple-question` / Simple Question | 台帳にレビュー件数4件。Source配列は台帳の1件で、Retrievalは空 | 台帳に記録された4件を短く直接答え、台帳Sourceを引用する。配列長とレビュー件数を混同せず、空Retrievalを理由に拒否しない |

ケース別の `expectedBehaviors` はcriterion IDとdimensionを持ち、 `failureConditions` と `evaluationNotes.claimCitationRules` を併用する。Sourceの捏造、正しいIDによる誤った主張の補強、直接根拠のない結論引用、証拠不足の数値化を、それぞれ検出できる設計である。

Agreementは記録間の傾向の一致を評価し、Contradictionは別試行の逆方向の観察を評価する。同一試行が同時に二値を取るという論理矛盾を想定していない。Inferenceは平均の直列工程なので加算できる。異なる集団や中央値を無条件に足すことを許容する例ではない。

## 4. 採点方法

各expected behaviorに0/1/2を付け、短い回答抜粋、根拠記録ID、判定理由を残す。

| 評点 | 意味 |
| --- | --- |
| 2 | 意味・根拠・適用範囲を満たす |
| 1 | 主要点は正しいが説明や限定が不足。捏造や誤引用はない |
| 0 | 期待を満たさない、またはFailure Conditionに該当 |

**Pass**は採点可能な実際のGemini応答を取得し、全criterionが2、Failure Conditionに非該当、共通Citationルールを満たす場合。全体を平均して誤引用を相殺しない。**Fail**は完了した実Gemini応答を取得したがPass条件を満たさない場合。**Not Run**は実応答がない、またはAPI/embedding/streamなどの問題で採点可能な応答を取得できない場合である。実行を試みた際のHTTPエラー・finish reason・途中出力は実行状態として別記し、モデル内容のFailと混同しない。

キーワードの出現、期待文章との完全一致、Source IDの存在だけでは採点しない。語句や表現が異なっても意味が基準を満たせばよい。Simple Questionの1〜2文は目安であり、厳密な文数で判定しない。各repeatを独立runとして残し、成功するまでの再試行で失敗を消さない。単一runでモデルの安定性全般は断定しない。

## 5. 実行方法と必要条件

### 既存AI Chatルートを使う場合

既存の隔離された非Production環境で、次の条件を**すでに**満たす場合にだけ実施できる。

1. Public Demoではなく、AI Chatが有効な通常SaaSの隔離環境である。DBの隔離はホスト名がlocalhostであることだけでは判断しない。
2. 既存の有効な認証sessionとWorkspace membershipがあり、対象Researchにアクセスできる。provider、embedding、DB、rate limiterの設定が利用可能である。
3. 6ケースに対応するResearch、Finding、Sourceリンク、取得対象の既存索引と、履歴の空の既存Conversationがある。synthetic IDと実IDの対応を記録できる。
4. 実際にモデルへ供給されるContextを照合できる。保存MessageだけではContextやRetrieval snapshotは復元できないため、隔離環境の既存debug手段等で引数を確認できる必要がある。再取得したRetrievalだけで、その応答生成時の完全一致を証明しない。
5. chat POSTが隔離DBにUser Message、Conversation.updatedAt、AiUsageEvent、完了AI Messageを書き込むことを許容する。これはread-onlyな評価ではない。

手順は、対象を確認し、caseごとの既存Research/ConversationとSource IDを対応づけ、Contextを照合した後、`userQuestion` をそのResearchの既存Chat UIから一回送信する。APIでは `POST /research/<existing-research-id>/chat` に `{ conversationId: <existing-conversation-id>, message: <userQuestion> }` を送る。実際の認証情報はレポートやコマンド履歴に記載しない。

このルートはContext JSONを入力として受け取らない。`cases.json` をそのままPOSTしたり、messageに貼ってDBからのContextを置き換えたりしない。既存レコードがfixtureと合わなければ、今回の6ケースの結果はNot Runとし、実データを使った評価は別variantとして記録する。実IDの一貫した置換は許容するが、追加証拠、履歴、欠落Findingなどの意味の差を無視しない。distance自体は実測値を記録し、fixtureの手作業値との一致を要求しない。

rawの全streamを保持し、stream終了後のConversation詳細GETで保存AI応答とSupporting Sourcesを確認する。HTTP 200だけでは成功とせず、完了状態、保存結果、実モデル由来であることを確認する。rawに誤ったCitationがある場合は、保存結果が補正されてもモデルの失敗として記録する。各ケースは独立した既存の空Conversationを使い、前ケースのhistoryを混入させない。現行limiterはWorkspace×Userごとに10 requests/minuteであり、429を内容評価のFailとしない。

今回の作業では新DB、Seed、索引再生成、Conversationの新規作成、環境変数変更、認証情報取得、Production書き込みを行わない。条件が揃わなければデータや設定を補って実行せずNot Runを維持する。Public DemoはAI Chatが無効なので評価先にしない。

### 既存Retrieval検査スクリプトの位置づけ

既存の隔離環境と設定が確認済みの場合の参考コマンド:

```text
pnpm exec tsx scripts/evaluate-retrieval-context.ts <existing-isolated-workspace-id>
```

このスクリプトは16問をquery embeddingし、取得Contextを印字する。認証付きChat、生成回答、6ケースの固定Context replay、assertionを実行するものではない。実行にはDBとembedding providerが必要であり、今回の作業では実行していない。その印字成功をAI ChatのPassにしない。

将来、fixtureを実Geminiに固定入力として渡すreplay runnerを作れば生成品質だけを比較しやすいが、現行Promptとの一致を維持し、通常ルートの認証・Retrieval・DB保存まで検証した結果とは区別する。今回はrunnerを追加しない。

### run記録に必要な情報

case ID、variant、run日時、dataset version、Prompt/ルートの識別情報、実model ID、Context snapshot、実ID対応、履歴、Retrievalの実distance、raw応答、保存応答、表示Sources、HTTP/finish reason、API実行状態、criterion別の評点と回答抜粋、判定者を残す。provider tokenやsession cookieは含めない。routeはContext snapshotを自動保存しないため、この記録が別途可能でなければ固定fixtureの再現性は未確認とする。

## 6. 評価結果

### Facts — 今回確認できたこと

- 指定された7ファイルと補助実装を読み、ContextとCitationの契約に沿った6ケースを作成した。
- JSONの構文、6ケースの必須情報、Contextのキー/型、Retrievalの件数・distance、Source ID/URLの整合、allowlistの導出、fixture間のID整合をローカルの一時検査で確認した。これはデータセットの整合検査であり、Geminiの回答品質のPassではない。
- 実際のGemini応答は取得していない。provider/API/DBへの評価リクエストは送っていない。
- 新しいVitest、AI実装、Prompt、Schema、Seed、Playwright、環境設定は変更していない。Git操作も行っていない。Lint/Vitest/Buildは今回の文書・JSON作業では実行していない。

| Case | 実モデル評価 | 実応答 | criterion評点 | 理由 |
| --- | --- | --- | --- | --- |
| Agreement | Not Run | 未取得 | 未採点 | 対応する既存隔離環境・レコード・Conversationの実行条件未確認 |
| Contradiction | Not Run | 未取得 | 未採点 | 同上 |
| Inference | Not Run | 未取得 | 未採点 | 同上 |
| Insufficient Evidence | Not Run | 未取得 | 未採点 | 同上 |
| Source Limitations | Not Run | 未取得 | 未採点 | 同上 |
| Simple Question | Not Run | 未取得 | 未採点 | 同上 |

**集計: Pass 0 / Fail 0 / Not Run 6。実モデルAPIの試行0件。** 以前のPhase 6のmanual評価やPhase 10のPublic Demo E2E成功を、この6ケースの評価結果に転用していない。

### Inferences — 実装確認からの判断

- ルートはDBからContextを作るため、固定fixtureを直接渡せない。対応する既存データと空Conversationが確認できない状態では、データや環境を補わずにこの6ケースを同条件で実行することはできないと判断した。
- 未許可のCitationをrawのstreamに出したモデル応答が、保存後には一部補正され、liveとrestoreで異なる見え方になるリスクがある。コード上の経路は確認したが、この6ケースでの発生率や実際のUI上の発生は測定していない。
- 固定Contextの生成評価と実Retrievalの選択評価を分けると、回答の失敗が検索で必要な証拠を得られなかったためか、得た証拠を誤解したためかを調査しやすい。

### Uncertainties — 未確認の条件

今回利用できる隔離SaaS URL、認証済みsession、既存の対応データ・空Conversation・索引、provider credentialとmodelの利用可能性は確認できていない。有効なcredentialが存在しないと断定したわけではない。環境変数・secretファイルの値を読み出したり、新たな認証を試したりしていない。実モデル評価の再現性、各criterionの達成率、run間のばらつきはすべて未測定である。

## 7. 発見した制約・問題点

| 区分 | 静的に確認した内容 | 評価での扱い |
| --- | --- | --- |
| Facts | 許可Sourceの意味的な主張支持はvalidatorの対象外 | Contradictionの無関係な許可Sourceを使う誤引用を人が判定する |
| Facts | 未リンクSourceはallowlist外だが、Source metadata自体はCurrent Contextに含まれる | Sourceが一覧にあるだけで引用可能と誤解しないか評価する |
| Facts | streamに保存時validatorが適用されず、live UIは保存textに置換されない | rawとpersistedの違いを別記する |
| Facts | Source本文、ページ番号、原データは取得されない | Source Limitationsで読了や正確な引用の捏造を判定する |
| Facts | 代表chunk、更新遅延、欠落hydrateのskip、全Context/historyのサイズ予算なし | 実Retrieval/長会話の追加評価として残す |
| Facts | 既存検査スクリプトはContextを印字するだけ | 生成品質の結果として使わない |

本レポートで実モデルの不具合を実測した項目はない。表は実装の制約であり、GeminiのFail記録ではない。改善のためのアプリ変更は今回行っていない。

RoadmapのPhase 5記述には、Supporting Sourceをcurrent Researchだけで解決する旧baselineの説明が残る。一方、現行コードとAI ArchitectureはWorkspaceのSource解決と保存前allowlist検証を説明する。現行挙動の基準は後者を用い、Phase 5の歴史的な説明を現行の全制約として扱わない。指定された変更範囲を守り、RoadmapやArchitectureは書き換えていない。Phase 10全体やAI-related testsを完了扱いにしない。

## 8. 未検証項目

- 6ケースの実Gemini出力、意味的な正確性、Citationの実際の成功率。
- fixtureが実embeddingで意図した順序・chunkとして選択されること。distance閾値の新規校正やrecall/precision。
- 複数run・モデル変更・長履歴・省略されたfollow-up query・古い索引・選択chunkの欠落による差。
- malformed Citation、URL漏出、stream途中とrestore後のUI差の実ブラウザー確認。
- 多言語、長文、複数矛盾、別種類のprompt injection、Source改訂後のhistory、モデルの停止や途中エラー。
- 評価者間の一致。将来の採点では一部の応答を二者で判定し、criterionの曖昧さを調整する。

## 9. 次にVitestで自動化すべき処理

以下は追加提案であり、今回の実装・実行結果ではない。既存のauth/membership、429、使用量記録、`stop`/`length`の保存分岐、Citationの基本keep/remove/dedup、Retrievalのobservability検査を重複して作り直すことは避ける。

| 優先度 | 対象 | 意味のある追加チェック |
| --- | --- | --- |
| P1 | Dataset契約 | このJSONを実 `ResearchContext` / `WorkspaceRetrievalContext` 型と照合し、Source参照整合とallowlistの和集合を検査する。fixture変更時の壊れた入力を検出する |
| P1 | ルートのallowlistと保存境界 | Currentのリンク済みSource + Retrieved FINDINGのみを許可し、Research Sources単独・履歴だけのSource・未知IDを除去する。mock済みvalidator呼び出しの確認だけでなく、実validatorを使う境界テストにする |
| P1 | Citation parser/validator | 既存3件に加え、空allowlist、日本語の句読点、複数/重複ID、IDの大文字小文字、空白・空ID・閉じ括弧欠落の扱いを明示する。不正形式の現行挙動と将来の望ましい仕様を分ける |
| P1 | Context builder | null Conclusion、無Source Finding、リンク済みSourceとResearch-level Sourceの区別、欠落Research、Source本文/Commentが入らないことを実関数で検査する |
| P1 | Retrieval選択 | 0.35境界、10候補/5選択、同一itemの複数chunk、同じResearchのCONCLUSIONとRESEARCHを別itemとすること、元レコード欠落のskipと非補充、type別sources、chunk contentの保持を検査する |
| P2 | generation/persistence | 既存`stop`/`length`検査に、空/空白text、引用除去後に空になる応答、retrieval失敗でuser turn未保存、generation失敗でuser turnが残り得る経路を追加する。raw streamと保存validatorの境界も固定する |
| P2 | Supporting Source表示 | 改善方針を決めたうえで、未リンクResearch Sourceをrawで参照した場合、Source refresh失敗、liveとrestoreの差をComponentテストで検査する。現在の差を検査することと差を解消することを区別する |

VitestでGeminiをmockしたexpected outputは、Context組立やパーサーの制御フローを検証できるが、この6ケースの推論・矛盾分析・不確実性表現の品質を証明しない。実モデルの内容評価は本rubricで別に行い、 deterministicな文字列一致を品質判定の代わりにしない。
