# Phase 10 — Validation / Authorization Acceptance Review

実施日: 2026-10-19 (JST)。実行者: Codex。対象 Repository:
`morimotodev93/evidence-atlas`。PR #12 用の未コミット成果物であり、PR は作成していない。

## 結論と対象

| 項目 | 推奨判定 |
| --- | --- |
| V / Validation tests | Pass。限定された保存入力契約について完了候補とする |
| AZ / Authorization tests | Pass。限定された逐次認可契約について完了候補とする |

根拠は [PR #10 の受入条件](phase10-quality-acceptance.md) の Completion decision policy、
V、AZ、V / AZ / E の追加gate、Required safety gates。有限なdirect-call契約の判定であり、
本番全体の安全性、実DB、OAuth、HTTP transport の合格を含まない。
チェックボックスは変更していない。更新の承認・実施はこの報告の確認後に別途判断する。
Phase 10 の他の9項目にも変更はない。

| 開始時の項目 | 確認値 |
| --- | --- |
| Branch | `test/phase10-validation-authorization-acceptance` |
| HEAD | `a886ca4b6c14ed8bb3b59da1d4a7b345b816872a` |
| HEAD の件名 | `Merge pull request #11 from morimotodev93/docs/quality-markdown-readability` |
| Base | 指定は `main`。checkout、merge、reset は実施していない |
| 作業ツリー | ` M .vscode/settings.json` のみ。既存個人設定を保持 |

開始時に `git branch --show-current`、`git log -1 --oneline`、`git status --short` を実行した。
指定HEADと一致する。レビュー対象はこのHEADと、本報告に列挙したテスト差分。
アプリ本体、DB contract、依存関係、テスト設定、ロードマップを変更していない。

仕様として [product-definition.md](product-definition.md) §9.6–9.7、
[data-model.md](../architecture/data-model.md) のscope・役割と§7.3–7.10、
[directory-structure.md](../architecture/directory-structure.md) の入口一覧を照合した。
対象の現行契約と実装に矛盾は見つからなかった。過去の「受入条件未定義」という記録は、
PR #10 より前の判断として保持し、今回の未完了理由に読み替えない。

## 証拠の帰属と利用条件

| 種類 | 今回の扱い |
| --- | --- |
| S / 静的確認 | ローカルの仕様、実装、assertion、モック境界を照合 |
| C / 今回のCodex実行 | 下記の対象suiteと全suite、TypeScript、ESLintの実行結果 |
| C/D / 過去記録 | `roadmap.md` の PR #6–#9。今回の実行と区別して再利用 |
| G-local | HEAD、履歴、差分を確認。GitHub API・Checks・配備状況は未照会 |

[source-memo.md](source-memo.md) に従い、今回の仕様判断はリポジトリ内の情報を用いた。
外部仕様やGitHubの現在状態を調査していない。PR番号はローカル履歴と文書の対応を表す。

過去実績は PR #6: 55ファイル / 1,029件、PR #7: 56ファイル / 1,053件、
PR #8: 58ファイル / 1,255件、PR #9: 58ファイル / 1,287件。
PR #8 の実行記録と、PR #9 が比較値を developer-provided とした帰属は統合しない。
PR #9 のURL仕様が現在の入力契約であり、PR #8 のFTP/mailto許可は現在の根拠にしない。

実行環境は Windows `10.0.26200`、Node.js `v24.16.0`、pnpm `12.9.1`、
Vitest `3.2.7`。package.json の Next.js `16.3.8`、Zod `4.6.5` を前提とする。
テスト実行時刻は 2026-10-19 10:44–10:49 JST。これは合成データを使うローカル実行であり、
実Sessionの取得・変更ではない。

### テスト証拠の索引

以下の略号は同名ファイル内のdescribe/itとassertionを指す。パスは省略せずここに固定する。

| 略号 | ファイル |
| --- | --- |
| V-schema | `src/types/research/validation.test.ts` |
| V-action | `src/auth/inputValidationActions.test.ts` |
| Onboard | `src/auth/createInitialWorkspace.test.ts` |
| Roles | `src/auth/memberRoleActions.test.ts` |
| Research | `src/auth/researchActions.test.ts` |
| Create | `src/auth/researchCreateActions.test.ts` |
| Pages | `src/auth/researchPages.test.ts` |
| Detail | `src/auth/researchDetailDisplay.test.ts` |
| Chat | `src/auth/chatRoutes.test.ts` |
| Demo-read | `src/auth/publicDeploymentRoutes.test.ts` |
| Demo-write | `src/auth/publicDeploymentWrites.test.ts` |
| User | `src/auth/requireUser.test.ts` |
| Current | `src/workspace/requireCurrentWorkspace.test.ts` |
| Switch | `src/workspace/switchWorkspace.test.ts` |
| Read追加 | `src/auth/readAuthorizationAcceptance.test.ts` |
| Child追加 | `src/auth/childAuthorizationAcceptance.test.ts` |

## V / Validation の契約対応

### スキーマ単体の証拠

実装は `src/types/research.ts` と `src/types/research/` の `source.ts`、`finding.ts`、
`comment.ts`、`tag.ts`、`conclusion.ts`、`status.ts`。V-schema の129件を再利用した。

| 契約 | 判定・assertion |
| --- | --- |
| Research title 1–200、Source title 1–200 | Pass。各text schemaのmissing/null/blank/min/max境界 |
| Research description null または0–2,000 | Pass。nullableだがoptionalではなく、空文字も許可 |
| Finding content 1–10,000 | Pass。必須、trim後の境界と内部改行 |
| Comment content 1–5,000 | Pass。同上。既存の句点付きエラーはAction側で確認 |
| Tag name 1–50 | Pass。同上 |
| Conclusion 0–5,000 | Pass。空文字許可、schemaではnull拒否 |
| Status 3値 | Pass。`IN_PROGRESS` / `COMPLETED` / `ARCHIVED`、大小文字・空白の拒否 |
| Source URL 最大2,048 | Pass。missing/null/blank/不正URL、max−1/max/max+1 |

V-schema のtext共通describeには、次の既存assertionがある。

- `requires the property even when its value may be empty or null`:
  undefined拒否とnull契約を別に確認する。
- `handles empty/whitespace input %j`、`accepts a single character`、
  `accepts max length plus %i`、`rejects one character over the limit`:
  blank、min、max−1、max、max+1と `too_big` を確認する。
- `trims before checking length and preserves internal newlines`:
  text schemaはtrimするが内部CRLF/CR/LFを保持する。
- `preserves installed Zod 4.6.5's supplementary-character counting`:
  インストール済みZodのcode-point長を特徴付ける。grapheme仕様ではない。
- `rejects non-string schema input (case %#)`: 数値・object・array拒否。
  FormDataの全File入力拒否を証明するものではない。

URLでは `accepts HTTP/HTTPS URL %s without canonicalizing it`、
`rejects non-HTTP/HTTPS URL %s with the existing message` を照合した。
HTTP/HTTPS、localhost、`HTTPS://EXAMPLE.COM:443/a`、query/fragmentを許可し、
javascript/data/file/ftp/mailto/telを既存の `Please enter a valid URL` で拒否する。
周囲のtrim、元の綴り保持、内部tab/newlineの除去とtrim後の上限も別assertionがある。

### 実Actionへの接続

V-action の71件は各Actionを直接呼び、各Actionが実schemaを使うことを検証する。
全11 Actionの `rejects invalid input with its existing error contract before auth or DB access`、
`passes normalized data to persistence after authorization and then redirects`、
`retains the save-error return/exception contract without indexing or redirect` を再利用した。

| Action | Passの根拠・正常保存scope |
| --- | --- |
| `createResearch` | `researchSchema`。current Workspace IDと認証User ID、title/description |
| `updateResearch` | `researchSchema`。認可Research IDへのtitle/description更新 |
| `createSource` | `sourceSchema`。認可Research IDとtitle/URL |
| `updateSource` | `sourceSchema`。子から導いたResearchを認可後、対象Source ID更新 |
| `createFinding` | `findingSchema`。認可Research IDと正規化content |
| `updateFinding` | `findingSchema`。対象Finding IDと正規化content |
| `createComment` | `commentSchema`。認可Research ID、認証User IDとcontent |
| `updateComment` | `commentSchema`。対象Comment IDとcontent |
| `createTag` | `tagSchema`。ResearchのWorkspace内Tag、新規TagとResearchTagのtransaction呼出 |
| `updateConclusion` | `conclusionSchema`。認可Research ID、正規化textまたはnull |
| `updateResearchStatus` | `researchStatusSchema`。認可Research IDとenum値 |

ここに列挙した名前の実装パスは、`createResearch` / `updateResearch` が
`src/app/research/_actions/`、残り9 Actionが `src/app/research/[id]/_actions/`。
全Actionについて実装のimport、safeParse、認可順序、保存・失敗・redirect経路を静的照合した。

V-action の成功assertionはpayload全体のexactly-once、更新の最終where、
TagのWorkspace/name検索とResearchTagのpair、indexの有無、redirect先を確認する。
Research descriptionはmissing/blankをnull、内部CRLFは保持する。
Finding/Comment/ConclusionはActionでCRLFとCRをLFに置換し、trim後に保存する。
Conclusionのmissing/blankはnull保存する。CRLFを正規化してから上限を検査する3件も既存証拠。

indexを要求するのはこの11件では `createResearch`、`updateResearch`、`createFinding`、
`updateFinding`、`updateConclusion`。Source/Comment/Tag/Statusはindexなし。
無効入力はauth、private query、transaction、mutation、index、redirectなし。
Sourceの許可protocol以外についても、create/update両方でこの順序を検査している。
Public Demoでは既存のvalidation先行とentry guard先行の差を維持する。

### エラー、onboarding、役割

| 契約 | 判定・証拠 |
| --- | --- |
| Research create/updateの入力エラー | Pass。V-actionが既存messageのthrowを確認 |
| 残り9 Actionの入力エラー | Pass。V-actionが `{ error }` の既存messageを確認 |
| 11 Actionの保存失敗 | Pass。V-actionが既存stateまたは例外同一性、index/redirectなしを確認 |
| Onboardingの各名称1–100 | Pass。Onboardがmissing/blank/101拒否、trim後1/99/100保存 |
| Onboardingの保存値と失敗 | Pass。両ADMIN membership、User/Organization/Workspace ID、cookie/redirect |
| Role enum | Pass。Rolesが両scopeの不正7値をauth/query/write/cache前に拒否 |
| Role保存失敗 | Pass。今回のRoles追加2件で既存error stateとcache/cookie副作用なし |

Onboarding実装は `src/app/onboarding/_actions/createInitialWorkspace.ts`、role実装は
`src/app/settings/organization/_actions/updateOrganizationMemberRole.ts` と
`src/app/settings/workspace/_actions/updateWorkspaceMemberRole.ts`。
Onboardはtransaction失敗時に `Failed to create your workspace. Please try again.` を返し、
cookie/redirectなしを確認する。Roles追加はupdateの正しいtarget predicateも確認する。
transactionの呼出と合成失敗を検証したものであり、実DB rollbackを証明しない。

Vの必須条件に残る不足はない。schema単体129件だけでAction接続まで証明したとは扱わない。

## AZ / Authorization のroute / caller / guard対応

### 実Guardとモック境界

| 実Guard・helper | 証拠・モック境界 |
| --- | --- |
| `src/auth/requireUser.ts` | User、V-action、Roles、Pages、Detail、Read追加、Switch、Demo。authとnavigationをmock |
| `src/auth/requireWorkspaceAccess.ts` | Research、V-action、Roles、Current、Switch、Read追加、Child追加。DBをmock |
| `src/auth/requireResearchAccess.ts` | Research、V-action、Pages、Detail、Child追加。Researchとmembership I/Oをmock |
| `src/auth/requireOrganizationAccess.ts` | Roles、Read追加。要求Organizationとの複合predicateを確認 |
| `src/auth/requireOrganizationAdmin.ts` | Roles。Organization MEMBER/non-member、他tenant ADMIN拒否 |
| `src/auth/requireWorkspaceAdmin.ts` | Roles。Workspace MEMBER/non-member、他tenant ADMIN拒否 |
| `src/workspace/requireCurrentWorkspace.ts` | Current、Read追加。cookieとDBをmock。Currentではfallback helperもmock |
| `src/workspace/getAccessibleWorkspaces.ts` | Read追加では実helper。User条件、複数所属と他Userの除外 |
| `src/workspace/switchWorkspace.ts` | Switch。実User/Workspace guard、auth/DB/cookie/cacheをmock |

Research suiteは `requireUser` をmockするがResearch/Workspace guardは実物。
CreateはUserとResearch guardをmock、ChatはauthとResearch guardをmockする。
Create/Chatのcaller契約は、Research/V-action/Pages/Detail/Child追加の実guard証拠へ接続する。
mockしたguardが存在するだけで実guard成功とは判定しない。
OnboardはUserとaccessible helperをmockし、その境界をUserとRead追加で補う。
cookieを使う選択と、明示したResearch/Workspace IDに対する所属認可は別の契約である。

### 読み取り入口

全SaaSページは実 `requireUser` で認証する。認証なしはsign-in redirect、Demoではauth前に
notFound（rootは `/demo` redirect）。通常のreadはADMINとMEMBERを許可する。
各行の認可後にだけ以下のprivate dataを読む。全ページのDemo境界はDemo-readで確認済み。

| 入口 | Guard / scope / assertionの対応 |
| --- | --- |
| `src/app/page.tsx` | User→Current。Workspace内Research/Tag、子はResearch ID集合。Read追加のunauth/所属なし/第2Workspace選択 |
| `src/app/onboarding/page.tsx` | User→実accessible helper。自User所属なしだけform、既存MEMBERは `/`。Read追加2件 |
| `src/app/settings/organization/page.tsx` | User→Current→OrganizationAccess。Read追加 |
| `src/app/settings/workspace/page.tsx` | User→Current→WorkspaceAccess。Read追加 |
| `src/app/research/page.tsx` | User→Current。Workspace内Research。Read追加 |
| `src/app/research/[id]/page.tsx` | User→ResearchAccess。Detail既存・追加 |
| `src/app/research/new/page.tsx` | Userのみ。Pagesがunauth拒否/認証済みformを確認。Workspace保存scopeはcreateResearchで決定 |
| `src/app/research/[id]/edit/page.tsx` | User→ResearchAccess。Pages |

両settingsはcurrent Workspace ID、またはそこから導いたOrganization IDを本体queryに使う。
Read追加が局所role、所属なし、不在、unauthを検証する。Research listはWorkspace内Researchと、
そのResearch ID集合に属するTagを読む。Read追加でunauth、所属なし、第2Workspaceの選択を確認。
detailは親認可後にSource/Finding/Comment/ResearchTagを読む。editのPagesはunauth、
missing/inaccessibleの同一notFound、MEMBER許可、DB例外伝播を既存assertionで確認する。

Read追加の `permits local %s and exposes controls only to the local ADMIN` は、両settingsで
local MEMBER / opposite ADMINには編集controlなし、local ADMIN / opposite MEMBERにはありと確認。
read自体は両roleに許可する。Organization membershipがない場合は、Workspace ADMINや
他Organization ADMINでもOrganizationの本体query前に `Forbidden`。
Workspace cookieに所属がなければ、他scope ADMINでもそのWorkspaceを読まず、
自Userのaccessible fallbackまたは `/onboarding` へ進む。
存在しないsettings本体はnotFound。Organizationの所属拒否は現状のthrow契約を保持する。

Detail追加はmissing親とnon-memberの両方でnotFound、全子queryなしを確認する。
元のDetailはMEMBERで編集control・AI UIを返すが、AI providerは呼ばない。
ページ関数が返すReact tree/合成markupの検査であり、HTTP/RSC/browser実行ではない。
Read追加はinteractive childrenをmockし、role controlを示すmarkerだけを検査する。
読取り入口の実装にはindex/AI/cache変更の呼出がなく、cookieはreadのみ。
Read追加は全modelのcreate/update/delete、transaction、cookie set、cache変更なしをassertする。

### Server Actions

すべて認証が必要。Researchの通常操作はWorkspace MEMBER/ADMINの両方に許可する。
別tenant ADMINは対象Workspace membershipの代わりにならない。

| Caller | 実Guard・scopeと証拠 |
| --- | --- |
| `createResearch` | User→Current。V-action正常payload/unauth、CurrentとRead追加で実選択を補完 |
| `updateResearch` / `updateConclusion` | User→ResearchAccess。Researchの拒否/DB例外/成功、V-actionの保存scope |
| `updateSource` / `deleteSource` | Source→User→ResearchAccess。ResearchとChild追加の不在、V-actionの更新値 |
| `updateFinding` / `deleteFinding` | Finding→User→ResearchAccess。同上。成功後のみ必要index |
| `updateComment` / `deleteComment` | Comment→User→ResearchAccess。同上。作者専用制約はない |
| `attachFindingSource` | Finding→User→ResearchAccess→Sourceの同一Research検査。ResearchとChild追加 |
| `detachFindingSource` | Finding→User→ResearchAccess→正確なFinding/Source pair。ResearchとChild追加 |
| `createSource` / `createFinding` / `createComment` | User→ResearchAccess。CreateとV-action |
| `createTag` | User→ResearchAccess。Createの同Workspace再利用、V-actionの新規transaction |
| `detachTag` | User→ResearchAccess。Createの正確なResearch/Tag pair、Child追加の不在、Demo-write追加 |
| `updateResearchStatus` | User→ResearchAccess。CreateとV-actionの認可後ID/enum保存 |
| `createInitialWorkspace` | User→accessible helper。Onboardで既存所属なら作成なし、正常は自Userの両ADMIN |
| `updateOrganizationMemberRole` | User→OrganizationAdmin。Rolesでactor/target/count/updateをOrganizationに限定 |
| `updateWorkspaceMemberRole` | User→WorkspaceAdmin。Rolesでactor/target/count/updateをWorkspaceに限定 |
| `switchWorkspace` | User→WorkspaceAccess。Switchのunauth/他tenant ADMIN/DB例外/許可MEMBER |

Researchの10 Action×6件は、missing親/non-member/unauth/両DB例外/成功を既存証拠として利用。
今回その拒否・例外assertionへindex未呼出も加えた。Createの6 Actionの拒否・例外にも同様に追加。
成功側はV-actionのexact payload/whereとCreateのtag再利用・detach pairを組み合わせる。
Child追加のmissing子8件、missing Source、違うResearchのSource、missing supporting pair、
missing ResearchTagは既存suiteの未対応分だけを確認する。許可時のFindingSource作成pairも確認。
全拒否でwrite/index/redirectなし。通常モードの子lookupは一部authより前であり、
unauth時に全DB readがないとは主張しない。Demoではentry guardがそれらより先に拒否する。

Rolesは同scope ADMINのみ変更可、対象Userとの複合predicateを用いる。
反対scope ADMINも別tenant ADMINも流用不可。別tenantのADMINをcountに含めず、
最後のADMINの降格を既存stateで拒否し、同scopeに他ADMINがいれば対象だけ降格する。
これはread/count→updateの逐次契約。DBの並行降格や認可後の所属変更への競合保証ではない。
拒否時はwrite/cookie/cacheなし、許可時は対象membershipだけ更新し該当settings pathをrevalidate。
Switchは対象membership確認後だけHTTP-only/lax/path cookieを書きrefreshする。

### Chat / Conversation入口

各入口の実装は、Public Demo/C2チェック→auth→ResearchAccessの順。
User IDをWorkspace membershipへ結び、認可ResearchのWorkspaceからscopeを導く。
Chat suiteのResearch guardはmockなので、上記実guard証拠との接続が必要である。

| 入口 | Chat suiteのassertionと正常scope |
| --- | --- |
| `src/app/research/[id]/chat/route.ts` POST | 401/404/400/429、正常保存とAI scope |
| `src/app/research/[id]/chat/conversations/route.ts` GET | 401/404ではqueryなし。認可後Research IDのみでlist |
| `src/app/research/[id]/chat/conversations/route.ts` POST | 401/404では作成なし。認可Research IDを保存、201 |
| `src/app/research/[id]/chat/conversations/[conversationId]/route.ts` GET | 会話pair、Message/Source scope |

POSTとdetailはConversation IDと認可Research IDの一致が必要であり、不一致/不在は404。
POSTのretrieval/usageは認可Workspace、detailのMessageはその会話、Sourceは同Workspaceに限定する。
POSTはResearch 404、Conversation 404、body 400、rate-limit 429をそれぞれ確認する。

Chatの既存 `returns 404 when the conversation does not belong to the authorized research` は
POST/detail双方で複合predicateとMessage/AI等への未到達を確認する。mockがnullを返すケースは
「不在または他Researchとのpair不一致」の同一境界であり、実DB検索の証拠ではない。
`loads conversation detail from the authorized research workspace` と
`lists conversations only after confirming research access` は正常scopeと順序を確認する。
正常送信のusageは認証User/Workspace/Research/Conversationに帰属し、USER/AI保存も会話に限定。
会話作成者のUser IDという列・権限を新設しない。Workspace MEMBERにも共有会話アクセスを許可する。

Chat拒否時は該当query、Conversation/Message/usage write、rate-limit、context/retrieval、
source resolver、stream生成の未呼出を段階に応じて確認する。拒否前に必要なauth/親認可readは許容する。
Demoの4 handlerはauth/guard/private query/AI前に404。Chat suiteはこれら外部境界をmockし、
real provider、Redis、DBに接続しない。cookie/cache/indexはこれらrouteの呼出対象ではない。

### Public Demo

Demo-readは8ページ、Auth catch-all、inline sign-outのentry拒否を確認する。
Demo-writeは今回の `detachTag` を含む21 Actionを実User/deployment guardで拒否し、
auth/private query/write/transaction/cookie/index/cacheなしをassertする。
子をauth前に読む8 Actionもentry guardが先である。User suiteは有効Session形mockや
Demo Workspace設定欠落がロックを解除しないことを確認する。
Demoの公開readそのものは既存 `src/lib/demo/read.test.ts` と `src/app/demo/pages.test.ts` を再利用し、
今回全suiteで再実行した。公開scopeとSaaS拒否を混同しない。

## 完了条件別の最終判定

| V必須条件 | 判定 |
| --- | --- |
| 7schemaの必須/null/blank/min/max/enum | Pass — V-schema |
| trim/内部改行/CRLF、description/Conclusion null保存 | Pass — V-schema + V-action |
| PR #9のHTTP(S)/localhost/大文字/URL上限 | Pass — V-schema + V-action |
| 11 Actionの実schema接続と正常保存値/scope | Pass — V-action + 静的照合 |
| 不正入力の既存error契約と無副作用 | Pass — V-action、Onboard、Roles |
| 保存例外・戻り値とindex/redirect/cache抑止 | Pass — V-action、Onboard、Roles追加 |
| Onboarding名・role入力と正常保存 | Pass — Onboard、Roles |

| AZ必須条件 | 判定 |
| --- | --- |
| route/callerと実guardの対応、mock補完 | Pass — 本表と実guard suite |
| 未認証/別tenant/不在、同scope MEMBER/ADMIN | Pass — Research/Pages/Read追加/Rolesほか |
| Organization/Workspace ADMIN独立、target複合predicate | Pass — RolesとRead追加 |
| last ADMINの逐次保護 | Pass — Roles。競合保証は含まない |
| 複数Workspace、cookie再検証、switch | Pass — Current/Switch/Read追加 |
| settings/onboarding/list/detail read入口 | Pass — Read追加とDetail追加、既存Pages |
| 子不在とFinding/Sourceの所属一致 | Pass — Child追加とResearch |
| ConversationのResearch所属、401/404、正常scope | Pass — Chat caller + 実Research/Workspace guard証拠 |
| Demoのauth/private read前拒否 | Pass — Demo-read/Demo-write/Chat/User |
| 拒否時無mutation/index/cookie/cache/AI、許可時scope | Pass — 各suiteの上記assertionと静的呼出順 |

必須条件の未充足箇所・Fail・Blockedは残っていない。下記は明示的に別gateであり、
未実行をPassに含めない。VとAZそれぞれについてチェック更新を推奨するが、この差分では更新しない。

## 不足assertionと今回の補完

| 不足の重要度・再現条件 | 補完 |
| --- | --- |
| P1: 通常モードのonboarding/settings/list/overviewを直接呼ぶ | Read追加20件。unauth、局所role、不在、所属なし、第2Workspace |
| P1: 詳細の親不在または対象Workspace非所属 | Detail追加2件。子query前の同一notFound |
| P1: 子不在、関連Sourceが別Research、関連pair不在 | Child追加13件。拒否無副作用、成功pair |
| P1: role updateのDB保存だけ失敗 | Roles追加2件。固定error state、他scope無更新、cache/cookieなし |
| P1: DemoでTag解除を直接呼ぶ | Demo-write追加1件。auth/private query前拒否 |
| P1: 既存Research/Createの拒否時index未呼出assertion | 既存ケースを強化。件数追加なし |

追加は合計38件。schema境界129件やAction入力71件は増やしていない。
全新規ケースは変更前のアプリ実装に対して初回から成功した。アプリ不具合の失敗再現、
修正によるred→greenはない。失敗するテストを捏造せず、アプリ修正案も追加していない。

## 今回の実行記録

| 実行 | 結果・数値exit |
| --- | --- |
| 追加前の対象実行・restricted | config読込時 `spawn EPERM`、exit 1。collection前でテスト未実行 |
| 同じ対象実行・許可済み子process環境 | 14ファイル / 467件成功、exit 0 |
| 追加後の変更suite初回 | 5ファイル / 98件成功、exit 0 |
| `pnpm test --run` 最終 | 60ファイル / 1,325件成功、exit 0 |
| `pnpm exec tsc --noEmit` 最終 | 成功、exit 0 |
| `pnpm lint` 最終 | 成功、exit 0 |
| `git diff --check` | 成功、exit 0 |

追加前の対象コマンド:

```text
pnpm test --run src/types/research/validation.test.ts src/auth src/workspace
```

追加後の初回コマンド:

```powershell
pnpm test --run src/auth/readAuthorizationAcceptance.test.ts `
  src/auth/childAuthorizationAcceptance.test.ts src/auth/memberRoleActions.test.ts `
  src/auth/publicDeploymentWrites.test.ts src/auth/researchDetailDisplay.test.ts
```

初回restricted起動失敗と、その後の成功は別結果として保持する。
Vitestの全体実行には合成C2/Playwright toolingのunit suiteも含むが、ブラウザE2Eではない。
Vitest設定は `.env*` をロードせず、DB/auth/SDK等のI/Oを既存mockで隔離する。
pnpm版は指定と一致し、自動依存取得やinstallは不要だった。
LF→CRLFのGit通知はwhitespace違反ではない。新規未追跡ファイルは通常diff対象外なので、
個別の `git diff --no-index --check` でも検査する。exit 1は追加差分の存在を示す。

## 未検証・持ち越し事項

| 別gate | 今回の状態 |
| --- | --- |
| 実HTTP / Server Action transport / HTTP-RSCエラー | Not run。I/Eの隔離runtime gate |
| 実DB transaction / rollback / concurrent last ADMIN / 認可後の競合 | Not run。DB gate |
| 実OAuth / Auth.js Session作成・更新・revoke | Not run。C2/Session/OAuth gate |
| 実AI / embedding / Redis / Inngest Cloud / Sentry | Not run。各外部I/O gate |
| 保存済みSource URLの表示防御 | Not run。PR #10のP0として別PRで追跡 |
| ブラウザE2E / production build / deploy | Not run。今回の許可範囲外 |

duplicate FormData keys、全fieldのFile拒否、Unicode grapheme単位の文字数、
新しいID形式/payload制限は未定義の別policyであり、今回追加していない。
実入力のFileは既存Source URLケースのみ特徴付ける。
DB mockのpredicate検査をSQL実行、外部key/一意制約、削除cascade、実rollbackの保証に拡張しない。
同時降格、membership変更とmutationの間のrace、cookieの実ブラウザ挙動は残る。
Chatのcitation-only出力の空保存など既存E/AI残課題も今回の合格で解消した扱いにしない。
実DB・サービス接続、migration/seed、server起動は実施していない。

## レビュー対象の差分

新規ファイル:

- `docs/planning/phase10-validation-authorization-review.md`
- `src/auth/readAuthorizationAcceptance.test.ts`
- `src/auth/childAuthorizationAcceptance.test.ts`

既存テストの変更:

- `src/auth/memberRoleActions.test.ts`
- `src/auth/publicDeploymentWrites.test.ts`
- `src/auth/researchActions.test.ts`
- `src/auth/researchCreateActions.test.ts`
- `src/auth/researchDetailDisplay.test.ts`

`.vscode/settings.json` は開始前からの個人設定差分であり、この成果物に含めない。
通常の `git diff --stat` はその差分を含み、新規未追跡3ファイルを含まないため、
最終報告では今回の追跡差分と新規ファイルのstatを分けて示す。
commit、push、PR作成、stagingは実施せず、レビュー可能な未コミット状態で停止する。
