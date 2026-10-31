# PR #30 — Authenticated Chat Read-only Runtime Smoke

最終結果（2026-10-23 12:00 JST）: **R01はBlocked、R02はNot run。** 第3回のQueryなしResearch GETは1件受理されたが、応答完了を観測できず、ゲートの30秒応答監視で閉鎖した。Chrome画面は503とのユーザー報告。PR #30の厳格な通信ゲートによる試行は終了し、追加枠・第4回は実施しない。末尾の「最終実測結果とcloseout」を参照。以下の先行記録は各作業時点の履歴として保持する。

記録日: 2026-10-23 (JST)。Preflight記録基準時刻: 10:17:06 JST。
対象Repository: `morimotodev93/evidence-atlas`。

**初回Preflight時点ではR01/R02は実測開始前にBlocked。対象HTTP・browser操作・Session使用は0件。受付ゲートは開始時から閉鎖を維持した。**

## 初回Preflight時点の結果

| 対象 | 判定 | 実際の観測と限界 |
| --- | --- | --- |
| R01 Research画面 / History | Blocked | 既存の通常SaaS Sessionを使い、送信前に通信を制限できるbrowser制御経路を確保できず、画面表示・History操作とも未実施。HTTP status、Conversation件数、updatedAt順、USER preview / 空状態、認証・認可、Research / AI panel表示はすべて未確認 |
| R02 Conversation Detail GET | Blocked | R01の一覧を取得していないため、先頭Conversationの選択・detail GETは未実施。ID対応、Message ID / authorType / createdAt、保存順序、本文・SourcesとUIの一致、履歴への切替はすべて未確認 |

必要なP01とP09例外は今回のユーザー依頼で明示承認されている。停止理由は実行経路と通信制御の未充足である。実測未実施の項目をPassへ変更していない。

## 今回の承認と実行境界

[PR #29計画](phase10-chat-runtime-smoke-pr29.md)を基礎に、このスレッドの今回の明示承認を適用した。承認メッセージの正確な送信時刻は本記録では取得していない。

- P01: `http://localhost:3000/research/h8uo44a86ydzro3j7hl2c6pt`を既存ログインSessionで1回表示し、Historyを1回開き、既存会話があれば返却先頭1件だけを1回選択する。desktop 1 tab、観測最大60秒。アプリ経由DB読取とAuth.jsのSession読取・期限更新・期限切れ削除・Cookie変化の可能性を承認。
- P09例外: Sentry / telemetry / Fontsの抑制を維持した上で、Node preloadが全通信経路を遮断できない残余リスクを限定的に許容。AI / embedding / Upstash / OAuth / 新規Inngest enqueue / 外部Source / 外部API接続試験 / 新規課金呼出は許可されていない。想定外の外部通信を確認したら停止。
- 必要な範囲の一時ゲート開放だけを承認。終了時は閉鎖へ戻す。新規Session、アカウント切替、New、Send、直接DB接続・SELECT、データ作成・削除、build / deploy、アプリソース・schema・依存変更、commit / push / PR作成 / mergeは対象外。

## 実行前確認

| 項目 | 確認結果 |
| --- | --- |
| Git | `test/phase10-chat-readonly-pr30`。HEADとローカル追跡ref `origin/main` はともに `14c37724e8c4c04e3126572803a41ecf8f6d5b18`。開始時clean、worktreeは指定checkoutの1件。fetchなし |
| 通常SaaS process | `node.exe` PID 3076、親PID 9132、bind `::1:3000`。起動は2026-10-23 10:02:25 JST。command lineの対象checkout参照とwebpack flagを値のdumpなしで確認。C2 markerなし |
| 起動制御 | 既存の `.next/pr30-local-runtime/launch.cjs` と `preload.cjs` を静的確認。launcher PID 8396、pnpm PID 2068。Next 16.3.8、指定pnpm 12.9.1で起動した既存記録を参照。今回再起動は行っていない |
| 実効設定の根拠 | PID 3076の10:02:28 JSTの安全な自己報告で、DSN空・tracing無効・Next telemetry無効・ローカルfont応答選択・C2 / Demo gate無効・HTTP gate閉鎖を確認。今回のOS確認でも同PID・起動日時を維持。process環境全体や秘密値は取得・出力していない |
| Sentry server / client | server / edge / clientの設定はいずれもDSNの有無で有効化を決定する。preloadはprocess限定でDSNを無効化する。実browser / client bundleの挙動は未確認 |
| Telemetry / Fonts | process限定の無効化設定とローカルfont応答を維持。前段のオフラインfont-loader確認結果は今回のbrowser実測へ格上げしない |
| 通常DB設定 | 通常dotenv候補のDB URLは設定済み、解析可能なloopback接続先で、専用C2 DB URLとは異なる。DB名・roleは識別可能、schema指定は検出されない。launcher / preloadはDB接続設定を上書きしない。既存Docker / WSL中継processの存続をOSから確認。実server identity、実効role / schema、接続成功は未確認 |
| C2 | port 3001のlistenerなし。ユーザーによる意図的停止として扱い、今回起動していない |

dotenvは値を出力せず静的解析した。`.env*`の編集・コピー・Git追加は行っていない。[調査方針](../planning/source-memo.md)に従い、ローカル一次資料とインストール済みpackageの情報を使用した。

## 実測開始を止めた条件

利用可能なツールにローカルbrowser操作機能が見つからず、実行中Chrome / Edgeのprocessにもremote-debugging flagとbrowser所有TCP listenerは検出されなかった。DevTools endpointへの接続試験はしていない。Playwright 1.63.0はインストール済みだが、既存の通常Sessionを持つbrowserへの制御経路は未確保。Cookieやprofileを抽出・コピーせず、新規ログインも行っていない。C2専用の保存Session・fixture・runnerは使用していない。

連携機能のカタログも確認したが、ローカルの既存Sessionと今回の通信制限を満たす機能は確認できなかった。Cloud browserの利用やprivate情報の移送は行っていない。

既存ゲートはpreload読込時に閉鎖処理を組み込む実装で、実行中の限定開放・回数制御・60秒後の自動再閉鎖を指示する制御経路がない。環境変数を別shellで変更するだけでは既存processのゲートを切り替えられない。通常の `next dev` 直接起動やC2起動を代替手段として実行していない。Browser条件も未充足のため、今回ゲートの改造・再起動・開放は行わず停止した。

## 実際の操作・通信回数

以下は今回の作業で開始した対象browser / `localhost:3000`通信の回数。上限は消費していない。

| 対象 | 承認上限 | 実際 | HTTP / UI観測 |
| --- | --- | --- | --- |
| Research画面 GET | 1 | 0 | status未取得、画面未表示 |
| Conversation一覧 GET | 1 | 0 | status・件数未取得、History未操作 |
| 先頭既存Conversation detail GET | 1 | 0 | status未取得、対象ID未取得、履歴未表示 |
| 同origin Next.js静的asset GET | 100 | 0 | 未取得 |
| favicon GET | 1 | 0 | 未取得 |
| HMR WebSocket | 1接続、再接続なし | 0 | 接続なし |
| 追加RSC / prefetch / 診断POST / その他変更method | 0 | 0 | 未実施 |

Browser tabの起動・接続、別HTTPクライアント、reload、retry、pollingは使用していない。60秒の実測観測枠は開始していない。OSのprocess / listen情報の読取と設定の静的解析はHTTPによる稼働確認ではない。

## Session・egress・終了状態

- 既存Sessionの利用、有効性確認、Cookie読取・書出、新規Session作成、OAuthは0回。当該smokeによるSession更新・削除・Cookie変化は観測していない。直接DB確認は行わず、環境全体でSession変更がなかったとの証明にはしない。
- PID 3076の既存記録には、前段の起動調整時（10:02:28 JST）のnpm version確認fetchを送信前に拒否した記録が1件ある。今回新たに実行した通信として数えない。今回確認時点で、同PIDのゲート拒否記録は0件、その他の外部fetch拒否記録も0件だった。これらの記録は全通信経路の監視ではない。
- Sentryへのイベント送信・flush / probe、AI / embedding / Redis、Inngest enqueue、外部Source遷移、課金API照会は実行していない。全経路の外部通信0回を実証したとは扱わない。P09で許容された残余リスクは残る。
- 認証失敗・redirect・HTTP error・timeout・ID不一致・private情報露出の実観測はない。該当経路を未実行のため、これらの停止条件に対するPassでもない。実行前のbrowser / gate制御要件で停止した。
- ゲートは開始時から閉鎖を維持し、開放・再閉鎖はともに未実施。既存の閉鎖処理とprocess自己報告を確認したが、503応答をHTTPで測定していない。抑制設定、既存 `.env*`、Docker DB、C2は操作していない。
- 本文・preview・Source URL・個人情報・raw headers / response・Cookie・HAR・trace・video・storageState・screenshotを証拠へ保存していない。今回追加する追跡対象は本書だけ。

## 残った前提とPhase 10

次のR01/R02実行には、既存の通常Sessionを使えるローカルbrowser制御経路と、送信前allowlist / 回数制限 / redirect・RSC・prefetch・診断通信の拒否、限定ゲート開放と期限内再閉鎖の手段を先にレビューする必要がある。今回の閲覧枠を確認用GETで消費せず、Sessionの移送・ログインで補わない。

**R03〜R06は引き続きBlocked。Phase 10は4/11、Error handlingはPartialを維持する。** [roadmap](../planning/roadmap.md)・受入チェックは変更しない。保存履歴を取得した証拠もなく、過去の特定Chat POSTやAiUsageEventの保存成功を認定しない。

最終環境確認: 2026-10-23 10:20:32 JST。PID 3076とlauncherは存続し、port 3000のownerも同じ。ゲート閉鎖の自己報告を維持し、同PIDのinbound拒否記録と未知の外部fetch拒否記録はともに0件。C2は停止状態、既存DB中継processは存続している。これらはHTTP / DB接続による検査ではない。

文書検査: 相対リンク3件・リンク切れ0件、末尾空白0件・最終改行あり。`git diff --check` はexit 0。未追跡の本書に対する `git diff --no-index --check` は空白診断0件・exit 1（新規追加の差分あり）。既存追跡ファイルとindexに差分はなく、未追跡は本書1件だけ。テストsuite、build、deployは実行していない。

本書を未コミットで残して停止し、ChatGPTによるレビューを待つ。

## 手動browser検証への切替準備（2026-10-23 JST）

続くユーザー依頼で、既存ログイン済みbrowserをユーザー自身が操作する方式へ切り替えた。Codexによるbrowser / 認証済みHTTP / Session使用は引き続き行わない。上記の自動操作経路未確保という記録は、その時点の結果として保持する。**手動実測の結果はまだなく、R01/R02のPassを追加しない。**

一時ゲートの実装変更はGit無視対象の `.next/pr30-local-runtime/` 内だけ。`launch.cjs` / `preload.cjs` とローカルの `read-policy.cjs`、`manual-gate.cjs`、`control.cjs` を使用し、アプリソース・schema・依存関係・既存 `.env*` は変更していない。

| 制御 | 準備した動作 |
| --- | --- |
| 開始・終了 | `control.cjs open` で60秒の枠を開始、`close` で閉鎖、`status` はローカルの安全な集計だけを表示。初期状態は閉鎖。期限で自動閉鎖し、HTTP応答とHMR socketも閉じる。既にアプリへ到達したSession / DB処理の取消は保証しない |
| 許可する読取 | 対象Research文書GET・History一覧GET・一覧の先頭Conversation detail GETを各1回。先頭IDはメモリ内だけに保持。空一覧なら閉鎖。対象外path・別origin・書込method・RSC / prefetchはNext / Auth到達前に拒否して枠を閉じる |
| Next開発用通信 | 同originの `/_next/static/` GET最大100、favicon GET最大1、`/_next/hmr` upgrade最大1。asset / faviconの304も許容。再接続は受理しない。アプリが追加の診断通信等を要求した場合は制限を緩めず停止 |
| browser側 | 応答CSPで外部resource / connectとform送信等を制限。Next devに必要な同origin script・inline script / style・eval・HMRを許可。外部リンク遷移・拡張機能・既存service workerを含む全browser経路の遮断証明ではない。ユーザーはSources等を開かない |
| server側 | Sentry server / client用DSN無効、tracing / telemetry無効、Google Fontsのローカル応答、外部fetchの送信前拒否を維持。既知のnpm version確認以外の外部fetch要求を検出した場合も枠を閉じる。非fetch / native経路等の残余リスクに関するP09例外は引き続き適用 |
| 記録 | statusとeventは種別・status・件数・時刻・整合booleanだけ。Research本文、preview、Source URL、Session / headers、全response、Conversation IDはファイルへ出力しない |

オフライン検査では、ネットワークsocket接続を禁止して、実dotenv loaderによる抑制維持、font loaderのローカルCSS、許可範囲・method / path / RSC / prefetch / 回数 / 期限の拒否、先頭会話への限定、CSP付与、閉鎖・HMR socket終了、statusの定期更新を確認した。HTTP応答は合成objectで、実アプリ・実Sessionの証拠ではない。閉鎖時status更新の不備はこの準備中に修正して再検査した。

通常SaaSだけを再起動し、10:39:20 JSTにNext Readyを記録。新server PIDは6680、launcher PIDは7548。dotenv読込後の抑制設定と手動ゲート選択を自己報告で確認。Ready時の既存 `.env*` hash比較は一致。ゲートのlive openはCodexでは実行せず、`close` とローカルstatusの確認だけを行い、ユーザーの閲覧枠を未使用で残す。DB / Docker / C2は停止・再起動していない。

手動操作は次の順序に限定する。

1. 他の `localhost:3000` tabを閉じ、既存ログイン済みbrowserのdesktop 1 tabで操作する準備をする。新規ログインしない。
2. Repositoryのterminalで `node .\.next\pr30-local-runtime\control.cjs open` を実行し、すぐに対象Research URLを1回だけ表示する。ここから最大60秒。
3. Historyを1回だけ開き、一覧があれば先頭1件だけを1回選択する。空なら終了。New / Send / 編集 / Sign out / Sources等のリンクには触れない。redirect・error・制御による拒否があればreloadや再試行をせず停止する。
4. 閲覧後は60秒以内にtabを閉じ、`node .\.next\pr30-local-runtime\control.cjs close` を実行する。HMR clientはtabを残すと再接続を試みるが、ゲートは追加接続をNextへ通さない。
5. `node .\.next\pr30-local-runtime\control.cjs status` で閉鎖と集計を確認する。報告はHTTP status / 件数・UI確認の一致不一致だけとし、本文・preview・Source URL・Cookieやrawログを共有しない。

既に対象Researchを受理した枠は再openできない。失敗を別枠・reloadで補わず、ユーザーの結果報告後に必要な次の範囲をレビューする。安全な503待機状態への復元は `control.cjs close` で行い、抑制設定を解除した通常の `next dev` 直接起動やC2起動で代用しない。Phase 10・R03〜R06の状態は変更しない。

## 手動試行の停止結果とpath-refused調査（2026-10-23 JST）

**この節を最新の実行結果とする。R01/R02はBlockedを維持。手動試行はゲートで止まり、アプリの画面・認証・History・detailを測定できていない。先行する手動手順は調査中のため再実行しない。**

### ユーザー報告と既存記録

ユーザーは `closed: true`、`fresh: true`、`used: false`、`reason: path-refused`、全6種カウント0を報告した。`open`は「an already-used window cannot be reopened」を含むエラーで拒否され、`close`は「close requested」、その後のstatusも閉鎖だった。追加の記憶確認では、**対象Researchの完全URLを直接開いた**との回答を得た。再操作は依頼していない。トップページへの手動アクセスを原因と認定しない。

既存の安全な `events.jsonl` をPID 6680で絞り、時刻・event・reason・種別・statusだけを確認した。

| 記録 | 結果 |
| --- | --- |
| manual-gate-opened | 10:44:02.911 JST、1件 |
| 最初のmanual-request-refused | 10:44:05.764 JST、reasonはpath-refused。開放の2,853 ms後 |
| manual-request-refused合計 | 9件。以後もreasonはpath-refusedだが、同一パスの9回試行とは判断できない |
| manual-request-accepted / manual-http-finished | ともに0件 |
| manual-used.json | 存在しない |
| status / control | 全カウント0、statuses空、used false、closed true、reason path-refused。controlはmode closed |
| 未知の外部fetch拒否記録 | 同PIDで0件。全経路の外部通信0回を証明するものではない |

ゲートは通常HTTP拒否時に503を返す実装だが、今回の記録に実際のwire上のstatusは保存されていない。アプリ応答statusと混同しない。対象browserからの要求は発生しており、以前の「HTTP・browser操作0件」という準備時点の記録を今回のユーザー試行へ流用しない。判明しているのは拒否event 9件と、許可・アプリ応答記録0件であり、browser全通信数・各拒否のURL / method / upgrade種別は未確定である。

### 確定した制御上の原因

静的根拠はローカルの `read-policy.cjs` の `ReadPolicy.permit/close`、`manual-gate.cjs` の `sync` / request hook、`control.cjs` のopen条件とcatchである。launcher / preloadは同じ手動ゲートを選択し、Sentry / telemetry / Fonts抑制を維持する構成だった。これらは今回変更していない。

1. **最初のpath-refused:** 開いた枠でmethod・origin・RSC / prefetch等の前段チェックを通った通常GETが、pathと追加条件のいずれにも一致せず閉鎖した。upgradeは別branchでupgrade-refusedになるため、最初の拒否をHMR WebSocket再接続と断定する根拠はない。RSC header / `_rsc`付き要求やPOSTなら別reasonになる。
2. **カウント0:** 許可分類が成功した後にだけカウンタを増やす実装である。Research受理前に閉じたため、Researchも補助通信もカウントに入っていない。0件は「browserから要求が届かなかった」という意味ではない。
3. **used false:** 公開statusのusedは `manual-used.json` の有無で決まり、このファイルはResearch受理時だけ作る。今回は未作成であり整合する。
4. **再open拒否:** `control.cjs` は鮮度・usedファイル・closed状態に加えて、reasonが `not-opened` または `operator-closed` かを検査する。path-refusedは対象外なので、未使用でも拒否される。catchは全失敗に同じ説明を出しており、「使用済み」という表示だけで実際の使用を判断できない。
5. **close後もreasonが残る:** closeコマンドはcontrolにmode closedを書くだけ。`sync`はpolicyがまだ開いている場合だけoperator-closedへ変えるため、既にpath-refusedで閉じたpolicyはそのreasonを保持する。これはclose失敗を示さず、closeも検証枠のリセットではない。
6. **閉鎖eventの欠落:** `permit`内で既にclosedへ変更してからadapterのcloseを呼ぶため、adapterのwasOpenがfalseになり、manual-gate-closed eventが出ない。この欠落も「ゲートが開いたまま」という意味ではない。

### 最初の具体的パスの確定限界とallowlist照合

`manual-request-refused` が保存するのはreasonだけで、pathname・method・document判定・query有無・分類結果がない。launcherもraw stdout / stderrを転送・保存せず、拒否はNextへ到達する前である。**確認した既存の安全な記録から、最初の具体的な拒否パスは復元できなかった。** Browser履歴・Cookie・profile・raw requestログを取得して補っていない。

ユーザーの完全URL直接表示という回答と両立する未確定候補は、対象文書より先に届いた補助GET、または対象URLに対する追加判定の不一致である。次の表はinstalled Next 16.3.8とゲートの静的比較であり、今回の実通信を再現した結果ではない。

| 経路 / 条件 | Next / browser側の静的根拠とgateとの差 |
| --- | --- |
| 対象Research文書 | gateはexact pathname・queryなし・`sec-fetch-dest: document`をすべて要求する。末尾slash、`_rsc`以外のquery、dest欠落 / 別値でもpath-refusedになる。今回そのいずれかだった証拠はない |
| `/_next/static/**` / `/favicon.ico` | 基本パスは許可対象。ただしResearchカウント1を先に要求するため、先行したasset / favicon GETは同じpath-refusedになる。`src/app/favicon.ico`が存在し、Nextのrouter-serverにもfavicon処理があるが、今回の先行到着は未確認 |
| `/.well-known/appspecific/com.chrome.devtools.json` | Nextの `server/lib/chrome-devtools-workspace.js` と `router-server.js` にdev用handlerがある。gateのallowlistにはなく、先行GETならpath-refusedになり得る。画面 / History表示に必須とは確認していない。既定handlerはcheckout root等を返すため、そのままの通過許可は提案しない |
| History一覧 / detail | 一覧はResearch受理済み、detailは一覧の先頭IDがメモリに存在することが必要。以前の文書やcacheから一覧GETだけが先行しても拒否する。今回このパスだった証拠はない |
| HMR | installed clientの `/_next/hmr` とgateのpathは一致。Research前のupgradeならupgrade-refusedであり、今回の最初のreasonとは異なる |
| client navigation / prefetch | Nextのfetch-server-responseはRSC headerを付ける。gateは意図的に拒否し、専用reasonになる。viewport prefetchはinstalled Nextのdevelopment分岐で無効。RSCを通常の静的assetとして広く許可する理由はない |
| dev error診断 | installed Nextは `/__nextjs_original-stack-frames` へPOSTする経路を持つ。正常閲覧に必須とは認定せず、今回も許可対象外。最初のPOSTならmethod-refusedになる |

`/`や`/research`も対象外だが、ユーザーがそこへ手動遷移したと推定しない。前回の合成request検査は許可対象が所定順序で届く場合を確認したもので、実browserの最初の通信順序・補助通信を検証したものではなかった。

### 再実測前の最小修正案（今回は未適用）

1. **安全な拒否分類を追加:** raw URL・query値・headers・IDを保存せず、既知のpathを `target-document` / `static-asset` / `favicon` / `devtools-discovery` / `history-list` / `other` のような固定aliasへ分類する。method、request / upgrade、target一致boolean、query有無、destがdocumentか、Research前か、拒否分岐を記録する。閉鎖後の拒否と最初のpolicy違反を分け、最初の診断を保持する。
2. **状態表示だけを正確化:** open拒否をstale / used / already-open / policy-fault等で説明し分ける。path-refusedを単にopen許可へ加えたり、closeでoperator-closedへ上書きして再開可能にする変更は行わない。policy違反による停止を維持する。
3. **原因に応じたexact修正だけをレビュー:** 補助GETと判明した場合は、その固定パスだけをNext / Authへ通さずローカルで応答する案を検討する。DevTools discoveryなら内容なし204等が候補だが、別予算・扱いも先に決める。対象URLの判定不一致なら条件を個別確認する。`/_next/**`、任意query、RSC、OAuth、診断POST、Research前の任意読取をまとめて許可しない。
4. **検証枠は別途レビュー:** 上記の純粋な判定・状態遷移を実ネットワークなしで検査した上で、最初の具体的パスに関する既存証拠を確認する。今回の記録だけでパスが確定しない場合はR01/R02を再開せず、追加診断の範囲自体を別途レビューする。新しい枠の作成・fault解除・resetは今回行わない。

本調査ではgate / control / preload / launcherの変更・実行、open / close、枠リセット、server再起動、browser / HTTP / Session再試行、DB / C2操作を行っていない。既存controlはmode closedのまま。抑制設定も解除していない。文書だけを追記し、未コミットで停止する。R03〜R06はBlocked、Phase 10は4/11、Error handlingはPartialを維持する。

## Gate診断改善とオフライン検証（2026-10-23 JST）

続く限定依頼に基づき、Git無視対象の一時ファイルだけに診断改善を実装した。変更は `read-policy.cjs`、`manual-gate.cjs`、`control.cjs`、`manual-check.cjs`、新規は `control-policy.cjs` と `diagnostic-check.cjs`。本書への追記以外にRepository追跡対象の変更はない。launcher / preload・外部通信抑制設定・既存 `.env*` は変更していない。

- 拒否診断はrequest / upgrade / other、固定method分類、target-document / static-asset / favicon / devtools-discovery / history-list / other、query有無、document判定一致、Research受理前か、open / closedのphase、reason、最初に失敗した条件の固定enumだけを保存する。未知methodや未知pathはotherへ畳み、URL・query値・header値・Cookie・認証情報・Research / Conversation ID・本文を転記しない。
- 閲覧枠内の最初の拒否をimmutableな `firstRefusal` としてstatusに保持する。後続要求は別の現在診断でgate-closed等を記録し、最初の診断を上書きしない。eventの `firstInWindow` で区別する。枠を開く前の待機中要求も安全に分類するが、閲覧枠の最初の診断枠を消費しない。既存記録にない過去の拒否情報を復元する機能ではない。
- 条件enumはmethod、host / origin、RSC header / query、prefetch、document query / destination、Research未受理、path allowlist、upgrade条件、count limit、gate closed、expiry等を区別する。判定順序と許可条件は維持し、Research前のasset / favicon、DevTools discovery、RSC / prefetch、POSTを許可していない。
- `control.cjs open` はstale / used / already-open / policy-fault / status-invalidを区別し、入出力失敗と不正commandにも固定説明を出す。エラー内に生の例外情報を出さない。path-refusedは引き続きpolicy-faultとして停止し、closeでfaultを解除する変更はない。不正なstatus構造もfail closedにする。

検証は `node .next/pr30-local-runtime/diagnostic-check.cjs` を使用し、**30グループ成功、exit 0**。Nodeのsocket接続・HTTP listen / client呼出・fetch・子process起動を禁止した別processで、合成要求と隔離した一時fixtureだけを使用した。実アプリ・preload・既存Session・本番のcontrolコマンドは実行していない。

確認範囲は正常Research document、Research前のfavicon / asset / History、DevTools discovery、RSC / query / document不一致、未知path / method、POST、upgrade、回数上限、期限切れ、閉鎖処理、最初の診断の保持、診断の機密値非混入、controlの理由別拒否。既存のオフラインadapter検査も実行し、CSP・status定期更新・ローカルstatus保存後の最初の診断保持・HMR socket閉鎖・合成handlerへの未到達を確認した。合成fixtureは実際のcontrol / status / usedファイルから隔離し、終了時に片付けた。テスト失敗時も生のassertion値を出さず固定case名だけを報告する。

**実ゲートの開放・枠リセット・再起動は行っていない。** 現在のmode closed、reason path-refused、used false、許可カウント0を維持する。稼働中processは既に読み込んだ旧gateを使うため、今回の診断はまだliveには反映されず、過去の拒否パスも未特定のまま。

次回はこの差分のレビュー後、通常SaaSへの変更反映と、停止理由を確認した上で新しい診断枠を作成・開放する範囲を別途承認・レビューする必要がある。restartによって旧fault状態が暗黙に消えたことを再試行の許可として扱わない。現時点ではopenを再実行せず、allowlistを拡大しない。Browser / localhost HTTP / Session / DB / C2 / 外部通信は実行しておらず、R01/R02の実測結果とPhase 10の判定は更新しない。未コミットで停止する。

## 診断ゲート再起動と第2回手動枠（2026-10-23 JST）

ユーザーが通常SaaS再起動、改善済み診断の反映、新しい検証枠の作成、R01/R02の手動再実測を各1回に限って明示承認した。今回は準備までで停止し、Codexはbrowser / localhost HTTP / Sessionを使用していない。手動結果はまだ受領していない。

### 環境・再起動・証拠保全

| 項目 | 今回の確認 |
| --- | --- |
| Git | branch `test/phase10-chat-readonly-pr30`、HEAD `14c37724e8c4c04e3126572803a41ecf8f6d5b18`。開始時の未追跡は本書だけ、追跡ファイル・indexの差分なし |
| 旧ゲート | owner PID 6680、closed true、reason path-refused、used false、全許可カウント0、control mode closedを再確認。旧processには診断改善が未反映 |
| 前回証拠 | 停止後、旧control / status / events / launcher metadataの4ファイルをGit無視対象の `.next/pr30-local-runtime/evidence/manual-01-path-refused/` に保存。原本とのSHA-256一致を確認し、保全manifestを付記。元のeventsも残して追記する。前回の不明な拒否パスを今回の分類で推定補完しない |
| 停止対象 | launcher 7548からの親子関係・起動日時・port所有者を再確認し、通常SaaSのlauncher / pnpm / cmd / Next CLI / Next serverだけを停止。port 3000解放をOS情報で確認 |
| 起動 | 11:15:08 JSTに既存 `launch.cjs` で起動、11:15:14 JSTにNext Readyを記録。pnpm 12.9.1 / webpack / development。launcher PID 7184、pnpm PID 20796、Next CLI PID 25988、server PID 17976 |
| process対応 | 指定checkoutへのcommand line参照とlauncherからの親子関係を値のdumpなしで確認。`::1:3000` のownerは17976。再起動時のGit確認とlauncherの期待SHA記録を対応付けたもので、読み込まれた全moduleの暗号学的revision証明ではない |
| 診断反映 | 新serverのstatusに firstRefusal null が出現。旧processに存在しなかった診断schemaの反映と、同じserver PIDのpreload-activeを確認。live拒否を発生させた診断試験はしていない |
| DB / C2 | 通常dotenvのオフライン解析でローカルPostgres設定を確認。C2専用変数は通常dotenvには未読込であり、その変数との比較は判定不能。通常接続先が静的なC2 target契約に一致しないこと、runtimeのC2 mode無効を確認。DB設定の上書きなし。既存Docker / WSL中継process存続、3001 listenerなし。DB接続・C2操作はしていない |
| ファイル | Ready時の既存 `.env*` hash比較は変更なし。Next devによる既知のAGENTS.md自動生成ブロック追記は、そのブロックだけを除去して起動前の内容へ復元。アプリソース・設定・schema・依存は変更していない |

### 新しい枠と維持する制限

新枠の識別子は `pr30-manual-02`。識別情報はGit無視対象の `manual-frame.json` に1回だけ作成した。前回faultをopen許可理由へ加えず、旧証拠を保存した上で明示承認された新process・新枠として区別する。初期controlはclosedを維持し、Codexはopenを実行していない。

今回の最小変更は一時 `control.cjs` / `control-policy.cjs` とオフライン検証 `diagnostic-check.cjs`。open前に `manual-opened.json` を排他的に作成する。Research未到達でoperator closeした場合も、同じ枠は `window-already-opened` で再開を拒否する。control書込失敗でも開放権を自動回復しない。closeは旧faultや使用済み印を解除しない。新枠の連続作成・自動resetはしない。

`read-policy.cjs`、`manual-gate.cjs`、launcher / preload / font応答は今回変更していない。Research / 一覧 / 先頭既存detail各1 GET、静的asset最大100 GET、favicon最大1 GET、HMR最大1接続、開放から最大60秒を維持する。Research前asset / favicon、DevTools discovery、RSC / prefetch / POST、その他未承認pathの許可は追加していない。違反・redirect・HTTP error・timeout等で閉鎖し、firstRefusalは最初の固定分類を保持する。

オフライン検証は変更前30グループ成功、変更後は既存30に単発control検証を追加して **31グループ成功・exit 0**。後者はin-memory filesystem / VMで実際のcontrolコードを実行し、二重open・close後の再open拒否・最初の開放印保持を確認した。socket / HTTP / fetch / child processを禁止した合成検証で、本物のopen / closeや実アプリ・Sessionは使用していない。

### 外部通信の抑制と観測限界

11:15:26 JSTの新server自己報告で、client / server DSN空、tracing無効、Next telemetry無効、ローカルfont応答選択、C2 / Demo mode無効、manual read-only gate選択を確認した。process限定のキーは `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN`（無効化）、`NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` / `NEXT_TELEMETRY_DISABLED`（収集抑制）、`NEXT_FONT_GOOGLE_MOCKED_RESPONSES`（ローカル応答）、`PR30_LOCAL_HTTP_GATE` / `NODE_OPTIONS`（既存ゲート・preload選択）、`npm_config_offline`（package managerのoffline指定）。秘密値・接続URLは記録しない。

同時刻に既知のNext npm version確認fetchを送信前に拒否した記録が1件ある。これは通過した外部通信ではない。その他の外部fetch拒否、対象HTTP / WS受付は準備時点で0件。Sentryへのイベント送信や外部サービス接続試験はしていない。非fetch / native経路・browser拡張・既存service worker等を含む外部通信0回の実証ではなく、P09で承認された残余リスクを保持する。client bundleや実画面での抑制動作も未実測。

### 手動操作への引継ぎ・判定

引継ぎ時のローカルstatusは ownerPid 17976、closed true、fresh true、reason not-opened、used false、openingRequested false、firstRefusal null、全カウント0、HTTP statuses空。503応答はHTTPで試験していない。新枠は準備済みで未開放。

1. 既存ログイン済みbrowserの他のlocalhost:3000 tabを閉じ、desktop 1 tabで対象Researchを直接表示する準備をする。
2. RepositoryのPowerShellで `node .\.next\pr30-local-runtime\control.cjs open` を1回だけ実行し、承認済み対象URLを直接1回開く。新たなNext / C2 processを起動しない。
3. Historyを1回開き、既存会話があれば先頭1件だけを1回選ぶ。空なら終了。New / Send / 編集 / OAuth / Source遷移はしない。
4. 最大60秒以内にtabを閉じ、`node .\.next\pr30-local-runtime\control.cjs close`、続いて `node .\.next\pr30-local-runtime\control.cjs status` で閉鎖を確認する。
5. 未知の通信・redirect・error・拒否があれば再試行せず同じ終了処理を行う。statusの固定分類・件数・HTTP statusとUIの確認結果だけを報告し、本文・ID・URL・Cookie・headers・Session情報を転載しない。closed trueを確認できない場合は追加操作せず、その事実を報告する。

**第2回のR01は結果待ち（前回Blockedを成功へ更新しない）、R02はNot run。** HTTP status・件数・UI整合・Session副作用は未観測で、手動結果を受領してから追記する。R03〜R06は引き続きBlocked、Phase 10は4/11、Error handlingはPartial。単発枠を未使用で引き渡し、文書を未コミットで残して停止する。

## 第2回手動結果とdocument-query調査（2026-10-23 JST）

ユーザーからChrome画面503、最初の拒否分類、全許可カウント0、最終closed trueの報告を受領した。調査時刻は11:36 JST。branch / HEADは前節と同じで、開始時のGit変更は未追跡の本書だけだった。新しい実測・開放・枠作成・再起動はしていない。

### 実測記録と判定

既存の安全なローカルstatus / eventsを読んで、ユーザー報告と照合した。枠は `pr30-manual-02`、owner PIDは17976。開放記録は11:29:32.924 JST、枠内最初の拒否は11:29:47.385 JST。

| firstRefusal項目 | 固定診断値 |
| --- | --- |
| eventClass / methodClass | request / GET |
| pathClass | target-document |
| hasQuery / documentMatches | true / true |
| beforeResearch / phase | true / open |
| reason / condition | path-refused / document-query |

Research / list / detail / asset / favicon / HMRの通過カウントはすべて0、statusのHTTP statusesは空。第2回準備開始後の拒否eventは11件（開放前2、開放以降9）。うちopen phaseの拒否は最初の1件だけで、残り10件はclosed phaseのgate-closed。後続の拒否は最初の診断を上書きしていない。イベント件数から手動操作・reload・ブラウザの自動要求の回数や動機を推定しない。

**R01はBlocked**。503はユーザーの画面観測で、ゲートの固定503応答と整合する。通常Research / AI panelの表示、認証・認可、History一覧、件数・順序・previewは未確認である。**R02はNot run**。一覧を取得しておらず、保存会話の選択・detail取得を実施した証拠はない。アプリのGET失敗やError handling受入結果として扱わない。

### コード上の拒否原因

静的根拠は `.next/pr30-local-runtime/read-policy.cjs:9,19,50,52,60,67` と `manual-gate.cjs:98–118`。URL全文や実Queryを取得せず、実装と固定診断だけを確認した。

1. `classify()` が `new URL(req.url, origin)` で解析し、pathnameが対象と一致するとtarget-document、`Boolean(url.search)` をhasQueryとして記録する。documentMatchesは `sec-fetch-dest` がdocumentかの真偽だけである。
2. `permit()` は同じrequest targetを解析し、先にmethod / host / origin、RSC・prefetch header、URL origin、`searchParams.has('_rsc')` を検査する。今回のconditionは、これらで先に拒否されなかったことを示す。
3. Research許可にはpathname一致・`!url.search`・document判定一致がすべて必要。今回は非空のsearchによってこの分岐に入らず、pathname一致後の拒否分岐でdocument-queryを設定する。カウンタ加算より前に閉鎖するため、全カウント0 / used falseと矛盾しない。
4. serverのemit wrapperは `policy.permit(args[0], event)` をNextのlistener呼出より前に実行する。拒否時は503を返してreturnし、元のemitへ進まない。この要求によるNext / Auth / アプリDB処理には到達していない。これは環境全体で他のSession処理がなかったことの証明ではない。

hasQuery trueは、URL parserが非空のsearchを返した事実であり、キー名・値・付与主体・アプリに必要なQueryかを示さない。有効なkey/value組があることさえ保証しない。実データを使わない合成6ケースで、queryなしと末尾の裸の疑問符はResearch許可、合成Queryと区切り記号だけのQueryはdocument-query、合成 `_rsc` は先行するrsc-query、fragmentだけならResearch許可を確認した。全ケースでrequest targetは不変。socket / HTTP / fetchを禁止したメモリ内の検証で、本物の枠やSessionは使っていない。

### Query付与経路の確認範囲

| 経路 | 確認できたこと / 限界 |
| --- | --- |
| ゲート・launcher・preload | runtimeのrequest targetやsearchへQueryを追加・書換するコードは見つからない。base originにもQueryがなく、queryなしの合成requestからhasQuery trueにはならなかった。controlのrunIdは制御ファイル内の値で、閲覧URLへ付与していない |
| Next server | installed Next 16.3.8の `dist/server/lib/start-server.js:219–247` でHTTP listenerからrequest handlerへ進む。今回のemit段階で遮断されるため、同じ要求に対するNextのroute rewrite / auth redirectがこの拒否より前にQueryを付けたとは説明できない |
| Next client RSC | `dist/client/components/router-reducer/fetch-server-response.js:89,491` と `set-cache-busting-search-param.js:32–57` にrsc header / `_rsc` の付与実装がある。ただし今回のdocument-queryはそれらの先行拒否と異なり、通常のRSC経路が今回の原因だとは裏付けられない |
| Next HMR | `dist/client/dev/hot-reloader/app/web-socket.js:60` にHMR専用pathのQuery付与がある。request / target-documentだった最初の拒否とは種別・pathが異なる。HMRやRSCを通す変更の根拠にはしない |
| Researchアプリ | 対象pageはparamsからIDを取り、Queryを必須引数にしていない。通常Next設定にQuery付与の独自rewriteはなく、確認したsrc / publicにはQuery付与・Service Worker登録の該当実装を見つけていない。未確認のbrowser側状態や拡張まで存在しないとは言わない |
| Chrome・リンクを渡すアプリ等 | 今回のローカル一次資料から、Chrome標準動作がこのdocumentへQueryを付けたとする根拠はない。前回の案内はQueryなしのMarkdownリンクだったが、リンクを開く側のアプリによる計測用装飾、拡張機能・既存Service Worker等による要求加工、既存履歴等の影響は未検証の仮説として残る。該当機能の存在・利用や具体的なQueryは確認していない |

対象Researchへの直接遷移というユーザー操作と、request targetにQueryがあることは、リンク受渡しやブラウザ側で加工された場合には両立し得る。**ユーザーが別Researchや誤ったURLを開いたとは推定しない。** 第1回のpath-refusedも同じ原因だったとは遡って認定しない。Queryキー・値・raw URL、Cookie・profile・headers・Session情報の追加収集はしていない。

### 最小修正案（未適用）

- 出所と必要性が未確定の現状では、Query許可条件を変更しない。次の別途承認された試行では、リンククライアントの加工を避けるため、Queryなしの対象URL文字列をアドレスバーへ直接入力・貼付する方法を候補とする。今回再操作を依頼・実行するものではなく、それで解決する保証もない。
- アプリに必要なQueryが静的根拠等で特定された場合に限り、対象Research documentのGETだけに、事前承認した固定キー・個数・重複禁止・長さと値の形式の厳格な条件を追加する案をレビューする。未知キー・混在・重複・不正形式は引き続き閉鎖し、値を証拠へ保存しない。機能に不要な装飾なら、許可拡張より付与経路の回避を優先する。現時点で許可対象キーや値を決める根拠はない。
- RSC / prefetch / OAuthは許可せず、既存の先行拒否と回数・60秒・firstRefusal保持を維持する。さらに診断が必要なら、生のキー名や値をログへ加える代わりに、別途承認した固定キー群への一致boolean・固定分類だけを検討する。診断変更、反映、追加枠・実測はいずれも今回未実施。

調査終了時もcontrol mode closed、reason path-refused、used false、全通過カウント0。外部通信抑制は変更していない。既知の起動時Next version確認fetch拒否1件以外の外部fetch拒否記録は0件で、全経路の外部通信0回の証明にはしない。今回の変更は本書だけ。R03〜R06はBlocked、Phase 10は4/11、Error handlingはPartialを維持し、未コミットで停止する。

## 第3回・最終手動Smokeの準備（2026-10-23 JST）

ユーザーは新しい単発枠1件と、既存Sessionによる限定R01/R02の手動実測を明示承認した。**成功・失敗を問わず、今回をPR #30の厳格な通信ゲートによる最終試行とする。** P01 / P09の限定例外はこの1回に限って適用する。結果が得られるまでは準備記録であり、Passを追加しない。

### 環境と旧証拠

| 項目 | 準備結果 |
| --- | --- |
| Git | branch `test/phase10-chat-readonly-pr30`、HEAD `14c37724e8c4c04e3126572803a41ecf8f6d5b18`。開始時は本書1件のみ未追跡、追跡差分・index差分なし |
| 第1回証拠 | 既存 `evidence/manual-01-path-refused/` の4ファイルをmanifestのSHA-256と照合して一致。上書き・変更していない |
| 第2回証拠 | 旧PID 17976のclosed / path-refused / document-query / used false / 全カウント0を確認して通常SaaSだけを停止。その後、control / status / events / launcher metadata / frame / opened印の6ファイルを `.next/pr30-local-runtime/evidence/manual-02-document-query/` に保全し、hash一致を確認した。frame / opened印は保全先へ移動し、旧枠の印を新枠へ流用しない。runtimeコード9ファイルのhashもmanifestへ記録 |
| 証拠の限界 | 第2回のQuery出所は引き続き未確定。ChatGPT / Chrome / 拡張機能等の原因を断定せず、第1回へも遡及しない。URL全文・Queryキー/値・Cookie・headers・Session情報は収集していない |
| 再起動 | 旧launcher 7184からの親子関係・起動日時・3000所有者を照合し、通常SaaSのlauncher / pnpm / cmd / Next CLI / serverだけを停止。新launcherは11:44:01 JSTに起動、11:44:02.658 JSTにNext Readyを記録 |
| 新process | launcher PID 7492、pnpm PID 12568、Next CLI PID 23052、server PID 9264。checkout参照・親子関係・webpack起動を確認し、OSのlisten情報は `::1:3000` / owner 9264。HTTP応答による確認ではない |
| DB / C2 / ファイル | 既存Docker / WSL中継processの存続、3001 listenerなしをOSから確認。DB接続・DB/C2操作なし。launcherはDB設定を上書きせず、Ready時の既存 `.env*` hash比較は変更なし。アプリコード・設定・schema・依存の変更なし。Next devによる既知のAGENTS.md自動追記だけを起動前へ復元 |

### 最終枠・通信制御・オフライン検証

識別子 `pr30-manual-03` のframeを11:43:43.020 JSTに1件だけ作成した。metadataにfinalAttempt true / openingLimit 1 / durationSeconds 60と旧証拠の保全先を記録した。実際の単発開放は既存controllerの排他的opened印で制限し、最大60秒の閉鎖は既存policy / timerで実行する。今回Codexはopenを実行していない。

準備確認時のstatusは closed true、fresh true、reason not-opened、used false、openingRequested false、firstRefusal null、全許可カウント0、HTTP statuses空。開放印・Research受理印とも存在しない。第2回faultを許可理由へ変更したのではなく、旧証拠を保持した上で、承認された新process・新枠として分離した。

**`!url.search`・allowlist・安全停止条件は変更していない。** Research / 一覧 / 先頭既存detail各1 GET、静的asset最大100 GET、favicon最大1 GET、HMR最大1接続、開放から最大60秒。RSC / prefetch / Query付きResearch / OAuth / 未承認path / 書込methodを新たに通す変更はない。最初の拒否をfirstRefusalへ保持し、違反時は閉鎖、再開しない。

準備前に既存 `diagnostic-check.cjs` を実行し、**31グループ成功・exit 0**。合成要求と隔離fixtureによるオフライン検証で、実通信・実アプリ・Session・live controlは未使用。準備後にpolicy / adapter / controller / preload / launcher / font応答 / 検証コードの計9ファイルを開始時hashと照合して全件一致した。ゲートの機能変更や新しい依存の導入はしていない。

11:44:04.238 JSTのserver PID 9264のdotenv後自己報告で、Sentry client / server DSN無効、tracing / Next telemetry無効、Google Fontsのローカル応答選択、C2 / Demo mode無効、manual read-only gate選択を確認した。今回の起動でも既知のNext version確認fetchを送信前に拒否した記録が1件ある。対象GET / WS通過・拒否と、それ以外の外部fetch拒否は準備時点で0件。非fetch / native / browser側の経路を含む通信0回の実証ではなく、P09の残余リスクとclient実表示未検証の限界を維持する。

### ユーザーへの手動引継ぎと最終試行の終了条件

1. 既存ログイン済みChromeで、他のlocalhost:3000 tabを閉じる。
2. RepositoryのPowerShellで `node .\.next\pr30-local-runtime\control.cjs open` を1回だけ実行する。
3. Chromeの新しいdesktop tabでCtrl+Lを押し、承認済みQueryなしResearch URL文字列を直接貼り付ける。ChatGPT内のリンクはクリックしない。Enter前に疑問符以降がないことを確認し、Enterを1回だけ押す。
4. 正常表示された場合だけHistoryを1回開き、既存Conversationがあれば先頭1件だけを選ぶ。空なら終了。New / Send / 編集 / OAuth / 新規ログイン / Source遷移をしない。
5. 最大60秒以内にtabを閉じ、`node .\.next\pr30-local-runtime\control.cjs close` と `node .\.next\pr30-local-runtime\control.cjs status` でclosed trueを確認する。503 / redirect / error / 拒否の場合も同じ終了処理とし、reload / 再試行 / pollingはしない。open自体が拒否された場合も再実行しない。

今回はここで停止し、ユーザーの画面・安全なHTTP観測・固定statusの結果を待つ。第3回の成否は未確定で、既存のR01 Blocked / R02 Not runを維持する。手動結果の受領後、確認できた範囲だけ最終判定へ反映する。失敗した場合はfirstRefusal・件数・技術的限界を記録してPR #30の試行を終了し、枠追加・その場の条件緩和・第4回の提案はしない。必要な次の開発課題は、より単純なローカル検証方式として別途検討する。

R03〜R06はBlocked、Phase 10は4/11、Error handlingはPartialを維持する。既存記録を保持した本書だけを未コミットで残す。commit / push / PR作成 / mergeは行っていない。

## 最終実測結果とcloseout（2026-10-23 JST）

第3回のユーザー手動結果を受領し、12:00 JSTに既存の安全なstatus / eventsと静的コードで照合した。branch `test/phase10-chat-readonly-pr30`、HEAD `14c37724e8c4c04e3126572803a41ecf8f6d5b18`。今回の作業は証拠文書の完成だけで、browser / HTTP / Sessionの再操作、ゲート開放・reset・枠作成、通常SaaS / C2再起動、DB操作、外部サービス接続は行っていない。

### 第1〜3回の概要

| 手動試行 | 確認できた結果 | Research / list / detail通過数 | 未確認範囲 |
| --- | --- | --- | --- |
| 第1回 | path-refusedで安全停止。診断改善前のため最初のpath・不一致条件は不明 | 0 / 0 / 0 | Research / Historyの正常表示なし。第2回と同じQuery原因とは認定しない |
| 第2回 | target-document / GET / document一致 / hasQuery true / document-query。Chrome画面503 | 0 / 0 / 0 | Queryのキー・値・出所・必要性は未確定 |
| 第3回（最終） | QueryなしResearch GETを受理。その応答完了を観測できずresponse-timeoutで閉鎖。Chrome画面503 | 1 / 0 / 0 | 正常HTTP応答、Research / AI panel、認証・認可、History・保存会話は未確認 |

第1回4ファイル・第2回6ファイルの保全manifestとのhash一致を再確認した。runtimeコード9ファイルも第2回保全時のhashと一致する。既存記録は上書きせず保持し、今回の変更対象は本書だけである。

### 第3回の時系列と通信観測

frameIdは `pr30-manual-03`、server ownerPidは9264。次の時刻はローカルeventsのUTC記録をJSTへ変換したもの。

| 時刻（JST） | 安全なevent / 観測 |
| --- | --- |
| 11:53:12.402 | manual-gate-opened |
| 11:53:28.241 | manual-request-accepted、kind research。Queryなし条件を満たしてResearch通過数が1になった |
| 11:53:58.513 | manual-gate-closed、reason response-timeout。受理eventから30.272秒後で、枠の60秒期限より前 |
| 11:53:58.550 | manual-request-refused、firstInWindow true。閉鎖から37ms後、target-document / GET / hasQuery false / documentMatches true / beforeResearch false / condition gate-closed / phase closed。reasonは既存のresponse-timeoutを継承 |
| 11:53:58.878 | 閉鎖後のfavicon拒否。firstInWindow false |
| 11:54:44.563 | 閉鎖後のdevtools-discovery拒否。firstInWindow false |

通過eventはResearchの1件だけ、list / detail / asset / favicon / HMRの通過数は0。拒否eventは計3件で、すべてtimeout閉鎖後。`manual-http-finished` は0件、`statuses` は `{}` のまま。拒否応答はコード上固定503だが、拒否経路には通過応答用のfinish観測が付かないため、この3件の実際の応答完了を記録したものではない。

Chromeの503はユーザーによる画面観測として記録する。**受理されたResearch GET自体が503を返して完了したとは認定しない。** 受理した応答のheaders・途中の本文・first byteは記録しておらず、途中送信が全くなかったとも断定できない。閉鎖後のdocumentに対するゲート503と画面表示は整合するが、browser上の要求と応答の一意な対応付けはしていない。

### timeoutとfirstRefusalのコード上の意味

静的根拠は `.next/pr30-local-runtime/manual-gate.cjs:25–32,74–95,98–118` と `read-policy.cjs:27–40,60,74–76`。

- Research許可はpathname一致・`!url.search`・document判定一致を要求し、受理時にcountとused印を更新する。したがって今回はQueryなしResearch GETがゲートを通過した事実を確認できる。元のemitへ渡す実装だが、それだけで認証成功・DB読取成功・画面表示成功とはしない。
- `observeResponse()` はResearch / assetに30,000ms、それ以外に10,000msのtimerを設定する。callbackは `close('response-timeout')` とresponseのdestroyを行う。closeはpolicyを閉鎖し、追跡中のHTTP応答・HMR socketをdestroyする。今回のreasonと約30秒のevent間隔は、このゲート自身の応答監視と整合する。60秒の閲覧枠満了（reason expired）とは区別する。
- status記録と `manual-http-finished` は通過応答のfinish listenerで更新する。今回はfinishの観測がなく、正常応答完了の証拠がない。HTTP接続のdestroyがコンパイル・認証・DB処理の中断やSession副作用の取消しまで保証する実装ではない。
- timeoutのclose処理そのものはfirstRefusalを設定しない。firstRefusalは後に `permit()` が呼ばれ、すでにclosedなら `reject(this.reason, 'gate-closed')` を通った際に初めて設定される。今回はevent順序もそれに一致する。**gate-closedは閉鎖後の判定という診断であり、独立した新しいpolicy違反やtimeoutの原因を表さない。** 後続request eventが記録されたことと、ユーザーが独立した新しい操作・手動retryを行ったことを同一視しない。既存記録ではbrowserの自動再要求等との区別もできない。

### 確定事項と残る仮説

| 論点 | 確定できること / 未確定の原因 |
| --- | --- |
| Next.jsの初回コンパイル | installed Next 16.3.8の `dist/server/dev/next-dev-server.js:718–735` と `on-demand-entry-handler.js:665–698` には、要求に応じたpage ensureとcompiler完了待ちがある。起動時Readyは対象Researchのコンパイル完了を証明しない。今回のコンパイル開始・完了・所要時間は安全なeventに残らず、30秒の主因だったとは確定できない |
| 認証・DB | 対象pageはrequireUser / auth、Research / Workspace認可、その後Source / Finding / Comment / TagのDB読取へ進む実装。いずれかの待機・接続・処理時間は候補だが、到達地点・成否・所要時間を観測していない。通常DBへ接続して原因確認することはしていない |
| Session副作用 | 第1・2回はNext到達前の拒否だったが、第3回は通過しており、P01で許容したSession読取・期限更新・期限切れ削除・Cookie変化が起きた可能性を排除できない。実行・不実行とも未確認で、used trueはSession更新成功を意味しない |
| timerと応答観測 | ゲートの応答監視callbackによる閉鎖はコードとeventで確定できる。30.272秒という差から、その間をコンパイル / DB / event loop等へ配分できない。監視時間がcold startに不足した仮説も残るが、延長すれば成功するとは判断しない |
| ログの限界 | launcherはraw stdout / stderrを保存せず、Ready・固定error / warning markerだけを記録する。対象ルートのcompile / render / auth / DB計測はない。error markerは0件だが、これで処理正常やエラー不在を証明しない。追加のpreload-active等も処理完了の証拠にはしない |

Sentry server / client、Telemetry、Fontsの抑制設定を変更していない。第3回準備以降の安全な自己報告では、serverと後続workerの抑制flagはすべてtrue。既知の起動時Next version確認fetchの送信前拒否1件、その他の外部fetch拒否0件。ただし全egress・browser側通信を観測したものではなく、外部通信0回の実証にはしない。

### PR #30の最終判定と次の検証方式

| 項目 | 最終判定 |
| --- | --- |
| R01 Research / History | **Blocked**。QueryなしGET受理まで確認したが、正常応答・Research / AI panel・認証 / 認可・History一覧の成功証拠なし |
| R02 Conversation Detail | **Not run**。History未到達。既存Conversation / Message / Sourcesの取得・UI一致は未確認 |
| R03〜R06 | **Blocked**を維持 |
| Phase 10 / Error handling | **4/11 / Partial**を維持。ロードマップの受入チェックを変更しない |

PR #30は厳格ゲート下での実証未達と技術的制限を記録して終了する。保存履歴取得成功、過去のChat POST成功、AiUsageEvent保存成功を認定する証拠もない。最終statusはused true / closed true / reason response-timeout、control mode closedである。ゲートを再開せず、追加枠・第4回・その場のallowlistやtimeout変更を行わない。

次のPRでは、**Nextの起動・対象画面の初回コンパイル準備と、R01/R02の応答観測を別段階にした専用ローカルfixture方式**を推奨する。通常のNext通信を横断して一時preloadで制御する方式から、検証専用のアプリ設定で作成・編集・Chat送信を拒否し、外部AI等の依存を通信しないadapterへ差し替える方式を検討する。合成User / Research / 保存Conversationを使い、通常のNext表示に必要な通信を先に整理した上で、同じ認証・認可・GETロジックを既存Chromeで確認する。Session準備やfixture作成を含む操作範囲は別PRの計画で明示する。

観測は受付・応答開始・finish / close・経過時間と、compile / auth / DBの固定段階だけを記録し、本文・識別ID・接続先・Query・Cookieは保存しない。処理の起動待ちとHTTP完了を分けて判定する。先に既存のオフラインGET / UI統合テストで権限・順序・切替・外部呼出不発を確認し、専用fixtureの実測と通常SaaSの実Session検証は証拠範囲を区別する。この方式は提案だけで、今回実装・起動・データ準備・接続・再実測はしていない。

文書の既存履歴を保持してcloseoutを追記した。今回もcommit / push / PR作成は行わず、本書を未コミットで残して停止する。
