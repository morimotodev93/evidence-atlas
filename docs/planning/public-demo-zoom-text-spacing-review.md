# Public Demo — Zoom / Text Spacing Review（PR #16準備）

記録日: 2026-10-20 JST。これは手動レビューの手順・未記入の結果表であり、ブラウザ成功報告ではない。[Phase 10受入条件](phase10-quality-acceptance.md#a--accessibility-review)のA / Rを補う。参照先の正式な受入条件は変更しない。

## 開始状態・既存証拠

- ブランチ: `test/demo-zoom-text-spacing-review`。
- HEAD: `15d5cb44d1a283a54fb1a6e28146c74381d09ea8`。ローカル`main`も一致。fetchしていないためリモートの最新状態は未確認。
- worktree: `C:/Users/owner/Desktop/sm-dev/evidence-atlas`、単一worktree、開始時`git status --short`は空（clean）。
- Node.js `24.16.0` / pnpm `12.9.1`（packageManagerと一致）。依存追加なし。
- PR #15の20/20は[既存のユーザー提供結果（D）](phase10-quality-acceptance.md#pr-15-final-preview-results--2020-passed-2026-10-20-jst)。今回の再実行ではない。PR #4のWindows Chrome 200%部分報告も[roadmapの履歴](roadmap.md)に保持する。環境値・ページ別結果が不足するため下表をPassで埋めない。

`e2e/public-demo.spec.ts`の既存20件は、root/list/代表詳細/read-only/404/無効endpointの6件、追加3詳細desktopの3件、一覧・代表詳細の狭幅2件、代表詳細keyboardの3幅3件、追加3詳細の狭幅2幅6件で構成される。構造・本文・件数・存在する空状態・実Tab/Shift+Tab/Enter・Back・Source focusを既に検査する。今回はテスト追加 **0件**、spec / helper / Playwright設定の変更なし。目視とブラウザUI設定が不足しているので、同じDOM assertionを増やして代替しない。

## 方法と証拠の区別

| ID | 方法 | 記録できる証拠 / 限界 | 今回 |
| --- | --- | --- | --- |
| A | Windowsの実Chrome、メニューで200% | その実環境・window・5ページのnative zoom目視と操作。viewport縮小、CSS `zoom: 2`、deviceScaleFactorは代替不可 | Not run |
| B1 | ブラウザ固有のtext-only 200%機能 | 対応機能を実際に確認したブラウザの文字拡大。通常のページzoomと分ける。ブラウザ名・version・機能名・設定操作を必須記録 | Not run |
| B2 | 一時的なCSSで4つのtext spacing値を同時適用 | CSS上書き後のレイアウト・操作の観測。native zoom / ブラウザ固有text-only zoomの証拠にはしない | Not run |
| B3（補助・任意） | computed font-sizeを基準の2倍にするCSS stress検査案 | 特定CSS条件の回帰のみ。B1の合格に置換しない。現段階ではharness未作成・未実行 | Not run |

仕様の数値はリポジトリの受入文書に従う。外部仕様・ブラウザの現行機能の照会は今回行っていない。B1の機能が利用できない場合は方法と理由を記録して **Not run** とし、対応ブラウザでの別レビューを残す。

## 実行境界と環境記録

今回Codexが行うのは静的調査、文書準備、指定のoffline検証だけ。ブラウザE2E、Previewアクセス、サーバー起動、実DB / OAuth / Session、AI / Cloud接続、production build / deploy、commit / push / PR作成は実行しない。

後日のブラウザ確認は、別途承認された公開read-only Demo接続先で行う。承認時にURL・deployment ID / success・配備commitの対応と対象範囲を確定し、下表に記録する。PR #14 / #15のPreview identityや既定公開aliasを今回の配備identityとして流用しない。個人アカウントにログインしない。画面がDemoでない、編集・AI・認証が必要になる場合は停止して記録する。外部Source / Supporting Source / GitHubはフォーカスのみとし、クリック・Enterしない。

下記を**実行単位（A / B1 / B2ごと）にコピー**する。ユーザーの手動結果はD、Codexのoffline結果はCとして別に残す。実行日時とこの文書の記録日を混同しない。

| 実行情報 | 記入欄（初期状態） |
| --- | --- |
| 実行ID / 方法ID / 証拠種別 | 未実施 / A・B1・B2から選択 / D（手動） |
| 実行開始・終了日時 / timezone | 未記録（例: YYYY-MM-DD HH:mm:ss +09:00 / Asia/Tokyo） |
| 実行者 | 未記録 |
| 対象origin / deployment ID・status / 配備commit | 未確認 |
| Windows version・build / ブラウザ名・完全なversion | 未記録（AはWindows Chrome必須） |
| window外寸・単位 / 最大化状態 | 未記録 |
| viewport内寸（CSS px）: 基準100% → 設定後 | 未記録 |
| OS display scaling | 不明（取得できれば%と対象displayを追記） |
| テーマ / 拡張機能など表示に影響する設定 | 未記録 |
| A: Chromeメニューの200%表示を確認した事実・時刻・capture ID | 未確認（全5ページで同一window、各ページで設定保持も確認） |
| B1: text-only機能名・有効化手順・200%表示の確認 | 未確認（通常のページzoom設定も別記） |
| B2: 上書き内容 / computed値の代表測定 / 基準zoom | 未確認 |
| 証拠の保存先 / 設定復元の確認 | 未記録 |

window外寸とviewportは区別し、モニターの「1920」から推定しない。必要なら承認されたページ上で`outerWidth / outerHeight`、`innerWidth / innerHeight`、`document.documentElement.clientWidth / clientHeight`をそれぞれ採取する。zoom前後で同じwindowを維持し、DevToolsを使う場合は別windowにして計測・keyboardレビュー前にページへ戻す。versionは番号だけを残し、profile path / command line / cookie / private情報はcaptureしない。

## A — Native Chrome 200%の手順

1. 承認された`/demo`をWindows Chromeで開く。基準100%の環境値を記録し、ChromeメニューのZoomを **200%** に設定する。メニューが200%を表示した事実を記録する。CSSやemulationを適用しない。
2. `/demo`でWorkspace見出し・本文・4つのResearch名を確認する。詳細のURLは一覧の実hrefから取得して記録し、Research IDを推測・固定しない。
3. 一覧から各ResearchへTab / Shift+Tabで到達しEnterで開く。各詳細のh1・説明、Conclusion / Sources / Findings / Discussionを縦スクロールして最後まで読む。
4. 重要文字の欠け、意図しないclipping、横スクロール、要素の重なり、リンクやBackの操作不能を調べる。横スクロールがあれば有無・位置・操作への影響を記録する。縦スクロールでページ末尾まで進み、上へ戻れることを確認する。
5. headerのEvidence Atlas / Source code、一覧全4リンク、詳細のBack / 全Source / 全Supporting Sourceを順方向・逆方向に辿る。末尾のリンクも一度Tabで抜けてShift+Tabで戻る。focus時は途中で手動スクロールやfocus代入をせず、実keyboard auto-scroll後の輪郭全体を目視する。sticky header・viewport上下端に文字やindicatorが部分的にも隠れず、フォーカス位置が分かることを確認する。trap・順序の飛び・輪郭欠けも記録する。
6. 外部リンクではEnterを押さずに通過する。各詳細の`← Back to Demo Workspace`に戻りEnterで一覧復帰し、元のResearchへ再度Tab到達できることを確認する。ここでのBackはアプリ内リンクであり、browser history操作とは分ける。
7. 全5ページで200%保持を確認し、ページ別・項目別結果とcaptureを保存する。終了後は元のzoomに戻し復元を記録する。

一覧の既存title ellipsisとSource URL preview短縮は受入文書で許容される。全Research名をlink name等で識別でき、詳細h1とSource / Supporting Sourceタイトルの重要文字・本文を読めることを確認する。一覧descriptionの既存line-clampも観測として記録し、拡大で新たに重要情報や操作が失われた場合まで許容範囲を広げない。

### A — ページ別結果表（ユーザー手動・D）

各セルは`Pass / Fail / Not run`で記録する。`Not run`を初期値とし、未確認をPassや「不具合なし」にしない。`—`は構造上対象外のみ（一覧に詳細4セクション / Backがないため）。ページ全体のPassは全適用項目と環境記録が揃った場合だけ。詳細へのEnterとBack復帰は4詳細それぞれに記録する。

| ページ / 実URL | 見出し・本文 | 4セクション | 重要文字・clipping | 横scroll・重なり・操作 | 縦scroll | Tab可視focus | Shift+Tab可視focus | Enter / Back復帰 | 外部遷移なし | 総合 / 不具合・証拠ID |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/demo` | Not run | — | Not run | Not run | Not run | Not run | Not run | Not run（4リンク） | Not run | Not run / 未観測 |
| Developer Productivity / URL未取得 | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run / 未観測 |
| Code Quality & Reliability / URL未取得 | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run / 未観測 |
| Developer Experience / URL未取得 | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run / 未観測 |
| Adoption & Organizational Impact / URL未取得 | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run / 未観測 |

## B — Text-only 200% / Text Spacingの手順

各方法を独立して基準状態から実施し、同じ5ページでAの可読性・clipping・scroll・keyboard / Back・外部遷移なしを繰り返し確認する。Aの200%と上書きを意図せず重ねない。組合せを追加した場合は別実行IDを付け、個別方法の結果に混ぜない。

- **B1:** 実際のブラウザUIでtext-only拡大機能と200%を確認し、機能名・設定手順・通常のページzoom値・対象ブラウザを記録する。対応機能が未確認なら実行しない。ブラウザのdefault font-size変更やCSS font-size変更をtext-only機能として記録しない。
- **B2:** 基準ページzoom100%で下記CSSを一時適用する。Line height **1.5**、Paragraph spacing **2em**（paragraphの下側margin）、Letter spacing **0.12em**、Word spacing **0.16em**を**同時に**検査する。適用後に見出し・本文・タグ・Supporting Source・Back等のcomputed値を採取し、font-sizeに対するpx換算値と対応を確認する。CSSに値を書いた事実だけでは適用確認にしない。

以下は**後日の承認されたブラウザ作業用CSS案・未実行**。ページに一時style要素を追加する等の方法で適用する。`body > header`も対象とし、sticky headerの折返し・focus遮蔽を確認する。可読性の問題を隠すためにheight / overflow / white-spaceを解除しない。擬似要素やshadow DOMはこの案の範囲外。

```css
:is(body > header, main),
:is(body > header, main) * {
  line-height: 1.5 !important;
  letter-spacing: 0.12em !important;
  word-spacing: 0.16em !important;
}
:is(body > header, main) p {
  margin-block-end: 2em !important;
}
```

クライアント遷移で上書きが残るかは未検証なので、**各ページで適用とcomputed値を確認**し、消えていたら再適用する。終了後は追加styleを除去してreloadし、基準表示・設定への復元を確認する。リポジトリの本番CSSには追加しない。

### B — 内容別の観測方針

| 対象 | 確認する内容 |
| --- | --- |
| 本文 | Workspace説明、Research説明、Conclusion / Findings / Discussion本文とmetadataを末尾まで読める。行間・段落間隔で欠落や重なり、横方向の操作不能がない |
| 長いResearchタイトル | 全4件を確認し、特にAdoption & Organizational Impactの一覧識別・詳細h1全文・折返しを確認。短いものだけで代表させない |
| Sourceタイトル | 各詳細の全Source見出しを確認。URL previewの意図的短縮とタイトルclippingを分ける |
| Supporting Sourceリンク | 全タイトルの折返し、実Tab / Shift+Tab後の輪郭全体、sticky headerとviewport端からの露出。外部へ開かない |
| タグ / status / Demo badge | 固定高さ・nowrap・overflowのあるBadgeも対象。文字欠け・他要素との重なりを目視。ソース上のclassは不具合の実測ではない |
| 空状態 | 実際に表示されたNo research available / No conclusion / sources / findings / discussion等を検査。表示されない分岐は「未表示・未検証」と残す。実DBを空にしたりseedを実行しない |
| Backリンク / headerリンク | 全文、可視focus、Enterによる一覧復帰とその後のTab到達。Source codeはfocusのみ |

seedやoffline静的レンダリングテストの存在だけでは、配備先のデータ・空状態の実表示やCSS可読性を証明しない。未表示分岐の視覚確認には別途承認した合成データharnessが必要で、今回それを構築・実行したことにはしない。

### B — ページ別結果表（方法別にコピー・ユーザー手動D）

実行ID: 未実施。方法: **B1 / B2を選択**。内容欄の対象が存在しなければ`未表示・未検証`と理由を明記する。方法ごとに表を残し、B2の結果でB1のNot runを埋めない。

| ページ / 実URL | 本文 | 長いtitle | Source title | Supporting Source | タグ等 | 空状態 | Back / header | scroll・往復focus・操作・外部遷移なし | 総合 / 不具合・証拠ID |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/demo` | Not run | Not run | — | — | Not run | Not run | Not run（header） | Not run | Not run / 未観測 |
| Developer Productivity / URL未取得 | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run / 未観測 |
| Code Quality & Reliability / URL未取得 | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run / 未観測 |
| Developer Experience / URL未取得 | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run / 未観測 |
| Adoption & Organizational Impact / URL未取得 | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run | Not run / 未観測 |

### 不具合 / 未実施理由の記録ひな型

実行ID・方法 / ページtitle・実URL / 発生時刻 / 環境記録への参照 / 設定の確認値 / 操作順序とTab方向 / 期待値 / 実際（欠け・横scroll・重なり・focus輪郭・操作への影響）/ capture ID / 未表示・未実施の理由を残す。部分的な遮蔽も完全遮蔽と分けて記録する。Failを見つけた場合だけ再現条件を固定して修正を検討し、推測で共通CSSを変えない。

## Playwrightの追加判断（現時点では追加しない）

CSS条件で再現した問題の回帰が必要になった場合だけ、既存helperを再利用する小規模なB2 / B3検査を検討する。5ページの実リンクを使い、各遷移後に上書き・computed値を確認し、必要本文・リンクfragmentのclipping / 横overflowと実keyboard操作を検査する。B3を作るなら**変更前に全対象のcomputed font-sizeを一括取得**して各要素へ2倍のpx値を適用し、親子の二重拡大を避ける。root font-sizeの一律変更だけで200%を確認したことにしない。

この検査もnative Chrome zoom / ブラウザtext-only機能 / 知覚的contrastを証明しない。既存の明示的`E2E_BASE_URL`、Public Demo preflight、同origin GETのみ、外部遷移禁止を維持する。ブラウザE2Eには別途承認が必要。今回はCSS注入・画像取得・ブラウザ検査自体を行っていない。

## 未完了の受入条件

全5ページのA / B1 / B2と環境値・ページ別証拠は未取得。focus / hover / sticky背景、本文・metadata・タグ等のcontrast（通常text 4.5:1、大きなtext 3:1、必要な非text / focus境界3:1）の限定確認も残る。CSS上のindicatorの存在と目視・contrast測定は分ける。

通常SaaSの375px / 768px / desktop、Chatの1023 / 1024px・keyboard・synthetic操作は別scopeで未完了。screen reader、他browser・物理device、dark theme、全contrast全状態等のdeferred riskも保持する。PR #15の20/20を撤回せず、その成功範囲をnative zoomや全A/Rに拡張しない。**roadmapのPhase 10チェック状態は変更しない。**

## Codex offline検証（C・2026-10-20 JST）

実行者: Codex。これはユーザー手動表（D）とは別記録。Node.js `24.16.0` / pnpm `12.9.1`、上記ローカルworktreeで実行した。

| コマンド | 今回の結果 |
| --- | --- |
| `pnpm exec playwright test e2e/public-demo.spec.ts --list` | exit 0、20件列挙。ブラウザ / HTTP preflight未実行、ブラウザ成功ではない |
| `pnpm test --run` | 初回exit 1、esbuildの`spawn EPERM`でconfig読込中に停止、テスト未実行。同一コマンドを子process起動可能な承認済み環境で再実行し、63ファイル / 1,395件成功、exit 0（開始09:26:35 JST、9.48s） |
| `pnpm exec tsc --noEmit` | exit 0 |
| `pnpm lint` | exit 0 |
| `git diff --check` | exit 0（新規文書も別途whitespace確認） |

Vitest内のC2 / Playwright名のテストはoffline / mock範囲であり、実C2やブラウザE2Eの実行ではない。今回のブラウザ結果はA / B1 / B2とも **Pass 0 / Fail 0 / Not run 5ページ**。CSS stress案も未実行。

差分は本新規文書と`phase10-quality-acceptance.md`への追記のみ。アプリ・E2E spec・依存・roadmapに変更なし。既存履歴を保持し、commit / push / PR作成をせず未コミットで停止する。
