# Public Demo — Contrast / Visible Focus Review（PR #20準備）

> **現在状態の補足（PR #39まで）:** 本書のFail / Pending / Not run・配備条件は各検査時点の履歴。PR #39でAppearance Selectを含むTab操作・Sourceリンクfocus遮蔽・scroll余白を修正し、CSS変更が反映されたVercel Previewでユーザー実行のPlaywright E2E **20/20（2.1分）** が成功した。375px / 768pxの順逆keyboard・Source遮蔽・read-only UIの限定結果であり、contrast全状態やWCAG全体の完了ではない。[帰属・検証範囲](../planning/phase10-quality-acceptance.md#pr37-39-status-alignment)を参照。以下の原記録は保持する。

記録日: 2026-10-20 JST。静的調査と後日の手動検査計画であり、ブラウザ検査・色実測の成功報告ではない。[Phase 10受入条件](../planning/phase10-quality-acceptance.md)を補う。**Accessibility review / Responsive UI reviewは未完了。**

## 1. Scope and Non-goals

対象はPublic Demoの次の5ページのみ。詳細URLのResearch IDは固定しない。

| ページID | ページ | 実URL |
| --- | --- | --- |
| L | Research list | origin未取得 / `/demo` |
| D1 | Developer Productivity | 未取得（後日の一覧リンクから取得） |
| D2 | Code Quality & Reliability | 未取得（後日の一覧リンクから取得） |
| D3 | Developer Experience | 未取得（後日の一覧リンクから取得） |
| D4 | Adoption & Organizational Impact | 未取得（後日の一覧リンクから取得） |

今回は静的調査、手動検査手順、未実施の記録表、最小限のオフライン文書確認のみ。アプリ修正・テスト追加は行わない。サーバー起動、PlaywrightブラウザE2E、外部Preview・Source・GitHubへのブラウザ操作、実DB、migration / seed、OAuth / Session、AI API、Cloud / Vercel操作、production build / deployment、依存インストール、commit / push / PR作成 / mergeは行わない。

通常SaaS、Chat、dark theme、screen reader、全支援技術、他browser・物理deviceの網羅は本レビューの対象外であり、既存の残課題を完了扱いにしない。native zoom・text-only・text spacingは[既存レビュー文書](public-demo-zoom-text-spacing-review.md)と別の検査として扱う。

### 開始状態と参照資料

- branch: `docs/demo-contrast-visible-focus-review`。
- HEAD: `ad6c0be9facf0c5bb016e27efb34d72fec2d5812`（指定と一致）。
- `git status --short --branch`: branch行のみ、変更なし。
- `git worktree list`: `C:/Users/owner/Desktop/sm-dev/evidence-atlas` の1件、上記branch / HEAD。
- `package.json`: `pnpm@12.9.1`。Next / React、Tailwind CSS v4、Base UI / Badge、Lucide、Vitest / Playwrightが宣言されている。dev / build / start / lint / test / test:e2e / contract:emit / seed / seed:demo等のscriptsを読み取り、実行していない。依存追加なし。
- 一次資料: [roadmap](../planning/roadmap.md)、[Phase 10受入条件](../planning/phase10-quality-acceptance.md)、[zoom / text spacingレビュー](public-demo-zoom-text-spacing-review.md)、[design system](../design/design-system.md)。
- 外部調査方針: [source-memo](../planning/source-memo.md)。外部参照は第4節のW3C公式仕様に限定し、配備先・外部リンク先は調べていない。

## 2. Evidence Types and Limitations

| 種別 | 今回扱う証拠 / 限界 |
| --- | --- |
| S: Codex静的確認 | ソース・CSS・既存spec・文書の読み取り。描画、現在の配備identity、実DB内容、知覚上の可視性を証明しない |
| C: 既存自動テスト等の記録 | 過去の実行環境・commit・assertion範囲に限る。今回の再実行ではない |
| D: ユーザー提供結果 | PR #15のPreview 20/20報告、PR #17 native Chrome 200%、PR #18 B2 spacing、PR #19 B1 Firefox text-only等の既存報告。今回の独立観測やcontrast実測にはしない |
| 新しい手動実測 | 未実施。後日実行者が環境・操作・色・証拠IDを添えて追記する。ユーザーの実施ならDとして記録する |
| 今回のオフライン文書確認 | Git差分・Markdown構造・リンク・履歴保持の確認。アプリテストやブラウザ実測ではない |

初期の検査Resultはすべて **Not run**。未測定の前景色・実効背景色・比率は **未測定**、未観測のindicator等は **Not run**。構造上ない対象だけ `—` と理由を使う。表示未確認の空状態や条件分岐は **Not rendered / Not verified** とし、ResultのNot runと別に記録する。未表示を対象外・Passへ置換しない。既存のNot run・当時のPending・PR #15〜#19の原記録を上書きしない。

## 3. Existing Implementation Inventory

以下はS。token名・classは設計上の色指定であり、測定表のForeground / Effective backgroundの実測値ではない。

| ファイル / 対象 | 適用class・token・状態 | 後日の検査上の注意 |
| --- | --- | --- |
| `src/app/globals.css` / Light背景 | `body: bg-background text-foreground`。`:root --background: oklch(0.9851 0 89.88)`、`--foreground: oklch(0.2077 0.0398 265.75)` | 実際のtheme・継承・重なりを確認。OKLCHの静的変換だけでPassにしない |
| 同 / surfacesと補助文字 | `--card: oklch(1 0 89.88)`、`--muted-foreground: oklch(0.4455 0.0374 257.28)`、`--secondary: oklch(0.9288 0.0126 255.51)`、secondary-foregroundはforegroundと同値 | body / card / badge / hoverの各背景でmetadata・説明を分けて測る |
| 同 / hover・border・focus | `--accent: oklch(0.9319 0.0316 255.59)`、borderはsecondaryと同値。`--ring: var(--primary-text)`、primary-textは`oklch(0.5461 0.2152 262.88)`。全要素に`border-border outline-ring/50` | outline色を指定しても幅・style・描画の保証ではない。50% alphaと各隣接色、実indicatorの由来を確認 |
| `src/app/demo/layout.tsx` / header | `sticky top-0 z-10 border-b bg-background/95 backdrop-blur`、内部`flex-wrap` | スクロール下の内容で実効背景・header高が変わり得る。先頭と重なり状態を記録 |
| 同 / Evidence Atlas・Demo | site linkは`font-semibold`、foreground継承。Demoはsecondary Badge | siteは実Tab対象。Badgeはspanであり独立Tab対象ではない。ブランド文字も本計画では可読性を4.5:1目安で測定し、WCAGのロゴ例外と別記 |
| 同 / Read-only demo・Source code | `text-sm text-muted-foreground`。Source codeは`hover:text-foreground`、Githubは`size-4 aria-hidden=true` | Source codeはNormal / Hover / Focusで確認。アイコンは文字ラベルを補う装飾と考えられ、単独必須の識別要素か理由を記録 |
| `src/app/demo/page.tsx` | h1 `text-2xl font-semibold`、組織・説明・空状態は`text-sm text-muted-foreground` | h1以外は通常文字として4.5:1。実一覧4リンクから詳細URLを取得 |
| `src/components/research/research-list-items.tsx` / card | linkは`block rounded-lg border bg-card transition-colors hover:bg-accent/50`。h2は`truncate font-medium`、説明は`line-clamp-2 text-sm text-muted-foreground`、日付は`text-xs text-muted-foreground` | card全体が1リンク。Hover時は半透明accent背景と子の文字・badge・borderを再確認。h2は見出しでも大きな文字と推定しない |
| 同 / status・tag | `showStatus`でoutline Badge、statusはIn progress / Completed / Archived等の文字。tagはsecondary Badge | statusの意味は色だけではなく文字で示される。タグ・statusはカード内の非対話spanで、独立したfocus ringを期待しない |
| `src/app/demo/research/[researchId]/page.tsx` | Backは`text-sm text-muted-foreground hover:text-foreground`。main内aは`scroll-mt-24 sm:scroll-mt-16 scroll-mb-2` | 上端・下端の余白指定は存在するが実auto-scrollとindicator露出は未観測。header折返し時も確認 |
| `src/components/research/research-detail-content.tsx` / ResearchHeader | h1 `text-2xl font-semibold sm:text-3xl`、説明`text-sm ... text-muted-foreground sm:text-base`、Created / Updatedは`text-xs text-muted-foreground`、status outline / tag secondary | h1のサイズ分類を実computed値で確定。metadataは両サイズとも通常文字 |
| 同 / 本文・セクション | h2 `text-lg font-semibold`、Source h3 `font-medium`、本文`text-sm leading-6`、補助説明・件数・displayStyle・著者・日時はmuted | 18px / 600相当のh2を大きな文字と即断しない。Conclusionはbody背景、Finding / Discussionはbg-cardを分ける |
| 同 / Source | `safeSourceHref`が許可したURLのみLink、`min-w-0 flex-1 hover:opacity-80`。cardは`border bg-card`、URL previewは`truncate text-sm text-muted-foreground` | Hoverでリンク配下のtitle / URL / 日時全体が80% opacityとなる。group合成後の前景を確認 |
| 同 / Supporting Source | 許可URLのみLink、`text-sm hover:underline`、foreground継承 | 通常時のリンク認識、折返し、各fragmentとoutlineを確認。Hover underlineはkeyboard focus indicatorの代用にならない |
| 同 / 空状態・非リンク分岐 | No conclusion / sources / findings / discussion、Source不許可URLはdiv、Supporting不許可URLはspan | 画面で未確認の分岐はNot rendered / Not verified。plain textはcontrast対象、Tab対象ではない |
| `src/components/ui/badge.tsx` | 既定span、`h-5 overflow-hidden text-xs font-medium whitespace-nowrap border-transparent`。secondary / outlineをDemoで使用。`focus-visible:border-ring ring-[3px] ring-ring/50`も定義 | focus classがあるだけではspanがTab可能にならない。`[a]:hover`のvariant定義を、spanが独立リンクとして描画される根拠にしない |
| `e2e/public-demo.spec.ts` | `expectExposedKeyboardFocus`はfocus / :focus-visible / outline又はshadowの存在とfragmentの部分露出を確認 | 少なくとも1つのsample点の露出で成功する。輪郭全体の視認性・色比率の保証ではない |
| 同 / 厳密なSource focus検査 | `expectUnobscuredSourceFocus`は全非空fragmentにoutline余白（最低4 CSS px）を加えheader・viewportとの位置を確認。代表詳細375px、追加3詳細375px / 768pxで使用 | プロジェクトの部分重なりゼロ回帰であり、2.4.11 AAそのものより厳しい。auto outlineの実描画・知覚contrastや全5ページ全状態の測定にはしない |

直接依存として `src/app/layout.tsx`、`src/lib/app-font.ts`、`src/lib/source-url.ts`、既存 `node_modules/tailwindcss/theme.css` / `preflight.css` を読み取った。rootはforeground / backgroundを適用し、IBM Plex Sansの400 / 500 / 600 / 700を指定。URL guardはHTTP(S)だけをリンク化する純粋関数で、今回ネットワーク実行していない。preflightはanchorに色・text decorationの継承を指定し、Firefox用auto outlineも含む。通常リンクにはアプリ独自の明示的focus ring classがなく、UA・base CSS・生成CSSを含む実描画が検査対象。

design systemはWCAG 2.2 AAとtheme検証を要求するが、同文書が既知gapとして記載する通り、root layoutにsystem preference連動やtheme選択UIはない。Light / Dark tokenの定義と実theme対応・合格を同一視しない。今回はLightだけを後日確認する計画とし、仕様や実装を変更しない。

### 文字サイズの分類（静的な目安）

既存Tailwind themeはxs 0.75rem、sm 0.875rem、base 1rem、lg 1.125rem、2xl 1.5rem、3xl 1.875rem、medium 500、semibold 600。**root 16 CSS pxと仮定した換算は実測ではない。** 後日、配信時のcomputed font-size / font-weight / font-familyを取得し、ユーザーzoomで通常文字を大きな文字へ再分類しない。

| 対象 | 静的目安（root 16pxの場合） | 計画上の比率 |
| --- | --- | --- |
| 一覧h1 / 詳細h1 | 24px / 600、詳細sm以降30px / 600 | 24px以上の実測を確認できれば3:1、未確認は4.5:1を維持 |
| セクションh2 | 18px / 600 | 4.5:1（headingという理由だけで3:1にしない） |
| 一覧h2 / Source h3 / site link | 継承16px、500 / 600 | 4.5:1（siteブランド文字の例外は別記） |
| 本文・metadata・Badge・Back等 | 12 / 14 / 16px、通常又は500 | 4.5:1 |

## 4. WCAG 2.2 AA Criteria

W3C WCAG 2.2 Recommendation（2024-12-12版）を2026-10-20 JSTに公式文書から確認した。適合宣言ではなく、本レビューの判定区分である。

| 基準 | Level | 本計画で確認する点 / 一次資料 |
| --- | --- | --- |
| 1.4.1 Use of Color | A | 意味・状態・リンクを色だけに依存して識別させない。[公式基準](https://www.w3.org/TR/WCAG22/#use-of-color)・[解説](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) |
| 1.4.3 Contrast (Minimum) | AA | 通常文字4.5:1、大きな文字3:1。[公式基準](https://www.w3.org/TR/WCAG22/#contrast-minimum)・[解説](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) |
| 1.4.11 Non-text Contrast | AA | 識別・理解に必要なUI / 状態・graphicは隣接色と3:1。装飾は一律対象にしない。[公式基準](https://www.w3.org/TR/WCAG22/#non-text-contrast)・[解説](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) |
| 2.4.7 Focus Visible | AA | keyboard focus位置を視覚的に確認できる。[公式基準](https://www.w3.org/TR/WCAG22/#focus-visible)・[解説](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html) |
| 2.4.11 Focus Not Obscured (Minimum) | AA | author作成contentによるfocus対象の完全遮蔽を許容しない。[公式基準](https://www.w3.org/TR/WCAG22/#focus-not-obscured-minimum)・[解説](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) |
| 2.4.12 Focus Not Obscured (Enhanced) | AAA | 対象の一部も隠れない上位基準。AAと分ける。[公式基準](https://www.w3.org/TR/WCAG22/#focus-not-obscured-enhanced) |
| 2.4.13 Focus Appearance | AAA | indicatorの面積・同じpixelのfocus前後contrastを扱う上位基準。2.4.7 AAの必要条件に転用しない。[公式基準](https://www.w3.org/TR/WCAG22/#focus-appearance)・[解説](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html) |

大きな文字は18pt以上、又は14pt以上のbold（言語・fontの同等サイズも考慮）が基準。CSS換算は24px又は約18.67pxのboldで、semibold 600を自動的にbold扱いしない。境界値を丸めて合格させない。[W3Cのサイズ・閾値説明](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)。

Focus indicatorの隣接色比率は1.4.11として判定し、同じpixelのfocus前後比率（2.4.13 AAA）と別に記録する。UAが決めauthorが変更していないUI外観には1.4.11の例外があるが、本実装には`outline-ring/50`があるので「native outlineだから例外」と即断しない。由来・author変更範囲・隣接色を確認し、適用判断と理由を残す。[W3Cの非文字contrast解説](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)。

部分遮蔽だけで2.4.11 AAを一律Failにしない。**対象自体の完全遮蔽、indicatorの可視性（2.4.7）、プロジェクト上の部分重なりゼロ条件**をそれぞれ評価する。既存受入文書とE2Eの厳密なoverlap条件はプロジェクト基準として保持し、AAA適合を宣言しない。

## 5. Contrast Review Procedure

以下は後日開発者が行う手順であり、今回未実行。

1. 対象のread-only Public Demo originとdeployment ID / status / 配備commitを確認し、第9節を実行単位で記入する。過去のPreview URLやローカルHEADを配備identityとして流用しない。
2. `/demo`で一覧の全4件のtitleと実リンクhrefを照合し、リンクからD1〜D4の実URLを取得する。一覧→詳細の遷移でtitleとURLを確かめ、記録表の未取得欄を置換する。IDをseedや推測から固定しない。
3. Light themeをDOMのtheme class・computed背景色で確認し、確認方法を残す。基準zoom100%、viewport **1280×720 / 375×812 / 768×1024 CSS px**をそれぞれ記録する。これは実行条件案であり環境実測値ではない。既存zoom / spacing結果と混ぜず、追加条件は別実行IDにする。
4. 第6節の共通行を各ページ×viewportへコピーする。Normalではpointerを対象外へ置き、Hoverはpointerだけ、Focusはpointerを外して実Tab操作だけで作る。状態が併存するFocus+Hoverは追加行とし、transition終了後を記録する。
5. 要素ごとにcomputed色・font-size / weightと、背景祖先・opacity・outline / shadow・隣接面を採取する。透明色、card hover、source opacity、header blurは現在のscroll位置と背面内容を含めて実効色を確認する。computedの`color`だけをgroup opacity後の前景としない。
6. 使用ツール・version・測定方法と採取位置を記録し、最終合成された前景と背景の組からcontrast比を得る。文字のanti-alias端の薄いpixelだけで規定比率を決めず、ブラウザが使用する色とalpha合成を確認する。画像pixelの採取は補助とし、知覚上の読みやすさも別に観察する。
7. headerは先頭と、本文 / card / 文字が下に入り込むscroll位置の双方を測る。場所で背景が異なれば別行にし、必要部分で最も低い比率・採取箇所を残す。Focusはindicatorの内側 / 外側など実際の隣接色を分ける。
8. textは第3・4節の分類で比率を判定。border / iconは識別に必要か理由を記録してから適用する。単なる区切りのborderやlabelを重複するGithub iconを低比率だけでFailにしない。cardのhit領域やfocus状態の唯一の手掛かりなら3:1検査対象にする。
9. 1.4.1は色比率とは別にstatus文字、カードのリンク認識、Supporting Sourceのcontextとunderline、focusの非色手掛かりを観察し、Evidence notesへ基準別結果を記録する。Hover時だけのunderlineで通常時の認識が保証されると推定しない。
10. 比率・判定・Evidence IDを記入する。測定不能 / 未表示は理由付きNot run。Passは実測と適用判断が揃った行だけ。全ページ・全状態への一般化をしない。検査後はzoom・viewport・一時style等を元に戻し、復元を記録する。

## 6. Contrast Measurement Table

実行ID / viewport: 未記録。各行を**ページ・要素・実リンク・状態・背景ごと**に分ける。共通表は5ページそれぞれへコピーし、`全5ページ`のまま一括Passにしない。Foreground / background欄にはtoken名でなく実測色と色空間を記入する。Focus行のtextとindicatorも別測定とする。

### 全5ページ共通（各ページで実施）

| Page / 実URL | Element / Component | UI State | Foreground color | Effective background color | Required ratio | Measured ratio | Result | Evidence ID / Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 全5ページ / 実URL未取得 | Evidence Atlas文字 | Normal | 未測定 | 未測定 | 4.5:1（計画上の可読性目安） | 未測定 | Not run | ブランド例外の適用は別記 |
| 全5ページ / 実URL未取得 | Evidence Atlas文字・indicator（別行へ展開） | Focus | 未測定 | 未測定 | text目安4.5:1 / indicator適用時3:1 | 未測定 | Not run | 実Tab、隣接色・由来を記録 |
| 全5ページ / 実URL未取得 | Demo Badge文字 | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | secondary surface |
| 全5ページ / 実URL未取得 | Read-only demo | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | header背面別 |
| 全5ページ / 実URL未取得 | Source code文字 | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | header背面別 |
| 全5ページ / 実URL未取得 | Source code文字 | Hover | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | foregroundへ変化 |
| 全5ページ / 実URL未取得 | Source code文字 | Focus | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | pointerを外す |
| 全5ページ / 実URL未取得 | Source code indicator | Focus | 未測定 | 未測定 | 適用時3:1 | 未測定 | Not run | 隣接各色・outline由来 |
| 全5ページ / 実URL未取得 | Github icon / header border（別行へ展開） | Normal | 未測定 | 未測定 | 必要性判断後、対象なら3:1 | 未測定 | Not run | 装飾と考えられる根拠は第3節。適用判断未実施 |

### ページ固有の測定表

| Page / 実URL | Element / Component | UI State | Foreground color | Effective background color | Required ratio | Measured ratio | Result | Evidence ID / Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| L: Research list / origin未取得・`/demo` | Workspace h1 | Normal | 未測定 | 未測定 | 分類確認後3:1、未確認4.5:1 | 未測定 | Not run | computed size / weight |
| L: Research list / origin未取得・`/demo` | 組織名・Workspace説明（各要素へ展開） | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | body背景 |
| L: Research list / origin未取得・`/demo` | 一覧card title / 説明 / 日付（各要素へ展開） | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | 4リンクそれぞれ |
| L: Research list / origin未取得・`/demo` | 一覧card title / 説明 / 日付（各要素へ展開） | Hover | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | accent/50合成背景 |
| L: Research list / origin未取得・`/demo` | 一覧card title / 説明 / 日付（各要素へ展開） | Focus | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | pointer対象外 |
| L: Research list / origin未取得・`/demo` | status文字 / tag文字（各要素へ展開） | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | outline / secondary別 |
| L: Research list / origin未取得・`/demo` | status文字 / tag文字（各要素へ展開） | Hover | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | 親card Hoverの背景を確認 |
| L: Research list / origin未取得・`/demo` | card border / status border（各要素へ展開） | Normal | 未測定 | 未測定 | 必要性判断後、対象なら3:1 | 未測定 | Not run | 文字・配置で識別できるなら装飾として理由を記録 |
| L: Research list / origin未取得・`/demo` | card border / status border（各要素へ展開） | Hover | 未測定 | 未測定 | 必要性判断後、対象なら3:1 | 未測定 | Not run | 背景の変化を確認 |
| L: Research list / origin未取得・`/demo` | card indicator | Focus | 未測定 | 未測定 | 適用時3:1 | 未測定 | Not run | 4リンク各々・内外の隣接色 |
| D1: Developer Productivity / 実URL未取得 | Research h1 | Normal | 未測定 | 未測定 | 分類確認後3:1、未確認4.5:1 | 未測定 | Not run | computed size / weight |
| D1: Developer Productivity / 実URL未取得 | Research説明・label・Created / Updated（各要素へ展開） | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | body背景 |
| D1: Developer Productivity / 実URL未取得 | status / tag文字（各要素へ展開） | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | outline / secondary別 |
| D1: Developer Productivity / 実URL未取得 | Conclusion / Sources / Findings / Discussion見出し・本文（各要素へ展開） | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | body / card別 |
| D1: Developer Productivity / 実URL未取得 | 補助説明・件数・displayStyle・著者・日時（各要素へ展開） | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | body / card別 |
| D1: Developer Productivity / 実URL未取得 | Back文字 | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | muted-foreground |
| D1: Developer Productivity / 実URL未取得 | Back文字 | Hover | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | foreground |
| D1: Developer Productivity / 実URL未取得 | Back文字 | Focus | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | pointer対象外 |
| D1: Developer Productivity / 実URL未取得 | Back indicator | Focus | 未測定 | 未測定 | 適用時3:1 | 未測定 | Not run | 内外の隣接色 |
| D1: Developer Productivity / 実URL未取得 | Source title / URL / 日時（各要素へ展開） | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | 全Source、bg-card |
| D1: Developer Productivity / 実URL未取得 | Source title / URL / 日時（各要素へ展開） | Hover | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | 全Source、group opacity 80% |
| D1: Developer Productivity / 実URL未取得 | Source title / URL / 日時（各要素へ展開） | Focus | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | 全Source、pointer対象外 |
| D1: Developer Productivity / 実URL未取得 | Source indicator | Focus | 未測定 | 未測定 | 適用時3:1 | 未測定 | Not run | 全Source・内外の隣接色 |
| D1: Developer Productivity / 実URL未取得 | Supporting Source文字 | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | 全Supporting Source、リンク認識も記録 |
| D1: Developer Productivity / 実URL未取得 | Supporting Source文字・underline（別行へ展開） | Hover | 未測定 | 未測定 | text 4.5:1 / 必須非文字は3:1 | 未測定 | Not run | 全Supporting Source |
| D1: Developer Productivity / 実URL未取得 | Supporting Source文字 | Focus | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | pointer対象外 |
| D1: Developer Productivity / 実URL未取得 | Supporting Source indicator | Focus | 未測定 | 未測定 | 適用時3:1 | 未測定 | Not run | 折返し各fragmentの隣接色 |
| D1: Developer Productivity / 実URL未取得 | card / status / section border（各要素へ展開） | Normal | 未測定 | 未測定 | 必要性判断後、対象なら3:1 | 未測定 | Not run | groupingの装飾か操作・状態識別に必須か理由を記録 |
| D2: Code Quality & Reliability / 実URL未取得 | Research h1 | Normal | 未測定 | 未測定 | 分類確認後3:1、未確認4.5:1 | 未測定 | Not run | computed size / weight |
| D2: Code Quality & Reliability / 実URL未取得 | Research説明・label・Created / Updated（各要素へ展開） | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | body背景 |
| D2: Code Quality & Reliability / 実URL未取得 | status / tag文字（各要素へ展開） | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | outline / secondary別 |
| D2: Code Quality & Reliability / 実URL未取得 | Conclusion / Sources / Findings / Discussion見出し・本文（各要素へ展開） | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | body / card別 |
| D2: Code Quality & Reliability / 実URL未取得 | 補助説明・件数・displayStyle・著者・日時（各要素へ展開） | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | body / card別 |
| D2: Code Quality & Reliability / 実URL未取得 | Back文字 | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | muted-foreground |
| D2: Code Quality & Reliability / 実URL未取得 | Back文字 | Hover | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | foreground |
| D2: Code Quality & Reliability / 実URL未取得 | Back文字 | Focus | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | pointer対象外 |
| D2: Code Quality & Reliability / 実URL未取得 | Back indicator | Focus | 未測定 | 未測定 | 適用時3:1 | 未測定 | Not run | 内外の隣接色 |
| D2: Code Quality & Reliability / 実URL未取得 | Source title / URL / 日時（各要素へ展開） | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | 全Source、bg-card |
| D2: Code Quality & Reliability / 実URL未取得 | Source title / URL / 日時（各要素へ展開） | Hover | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | 全Source、group opacity 80% |
| D2: Code Quality & Reliability / 実URL未取得 | Source title / URL / 日時（各要素へ展開） | Focus | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | 全Source、pointer対象外 |
| D2: Code Quality & Reliability / 実URL未取得 | Source indicator | Focus | 未測定 | 未測定 | 適用時3:1 | 未測定 | Not run | 全Source・内外の隣接色 |
| D2: Code Quality & Reliability / 実URL未取得 | Supporting Source文字 | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | 全Supporting Source、リンク認識も記録 |
| D2: Code Quality & Reliability / 実URL未取得 | Supporting Source文字・underline（別行へ展開） | Hover | 未測定 | 未測定 | text 4.5:1 / 必須非文字は3:1 | 未測定 | Not run | 全Supporting Source |
| D2: Code Quality & Reliability / 実URL未取得 | Supporting Source文字 | Focus | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | pointer対象外 |
| D2: Code Quality & Reliability / 実URL未取得 | Supporting Source indicator | Focus | 未測定 | 未測定 | 適用時3:1 | 未測定 | Not run | 折返し各fragmentの隣接色 |
| D2: Code Quality & Reliability / 実URL未取得 | card / status / section border（各要素へ展開） | Normal | 未測定 | 未測定 | 必要性判断後、対象なら3:1 | 未測定 | Not run | groupingの装飾か操作・状態識別に必須か理由を記録 |
| D3: Developer Experience / 実URL未取得 | Research h1 | Normal | 未測定 | 未測定 | 分類確認後3:1、未確認4.5:1 | 未測定 | Not run | computed size / weight |
| D3: Developer Experience / 実URL未取得 | Research説明・label・Created / Updated（各要素へ展開） | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | body背景 |
| D3: Developer Experience / 実URL未取得 | status / tag文字（各要素へ展開） | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | outline / secondary別 |
| D3: Developer Experience / 実URL未取得 | Conclusion / Sources / Findings / Discussion見出し・本文（各要素へ展開） | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | body / card別 |
| D3: Developer Experience / 実URL未取得 | 補助説明・件数・displayStyle・著者・日時（各要素へ展開） | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | body / card別 |
| D3: Developer Experience / 実URL未取得 | Back文字 | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | muted-foreground |
| D3: Developer Experience / 実URL未取得 | Back文字 | Hover | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | foreground |
| D3: Developer Experience / 実URL未取得 | Back文字 | Focus | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | pointer対象外 |
| D3: Developer Experience / 実URL未取得 | Back indicator | Focus | 未測定 | 未測定 | 適用時3:1 | 未測定 | Not run | 内外の隣接色 |
| D3: Developer Experience / 実URL未取得 | Source title / URL / 日時（各要素へ展開） | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | 全Source、bg-card |
| D3: Developer Experience / 実URL未取得 | Source title / URL / 日時（各要素へ展開） | Hover | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | 全Source、group opacity 80% |
| D3: Developer Experience / 実URL未取得 | Source title / URL / 日時（各要素へ展開） | Focus | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | 全Source、pointer対象外 |
| D3: Developer Experience / 実URL未取得 | Source indicator | Focus | 未測定 | 未測定 | 適用時3:1 | 未測定 | Not run | 全Source・内外の隣接色 |
| D3: Developer Experience / 実URL未取得 | Supporting Source文字 | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | 全Supporting Source、リンク認識も記録 |
| D3: Developer Experience / 実URL未取得 | Supporting Source文字・underline（別行へ展開） | Hover | 未測定 | 未測定 | text 4.5:1 / 必須非文字は3:1 | 未測定 | Not run | 全Supporting Source |
| D3: Developer Experience / 実URL未取得 | Supporting Source文字 | Focus | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | pointer対象外 |
| D3: Developer Experience / 実URL未取得 | Supporting Source indicator | Focus | 未測定 | 未測定 | 適用時3:1 | 未測定 | Not run | 折返し各fragmentの隣接色 |
| D3: Developer Experience / 実URL未取得 | card / status / section border（各要素へ展開） | Normal | 未測定 | 未測定 | 必要性判断後、対象なら3:1 | 未測定 | Not run | groupingの装飾か操作・状態識別に必須か理由を記録 |
| D4: Adoption & Organizational Impact / 実URL未取得 | Research h1 | Normal | 未測定 | 未測定 | 分類確認後3:1、未確認4.5:1 | 未測定 | Not run | computed size / weight |
| D4: Adoption & Organizational Impact / 実URL未取得 | Research説明・label・Created / Updated（各要素へ展開） | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | body背景 |
| D4: Adoption & Organizational Impact / 実URL未取得 | status / tag文字（各要素へ展開） | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | outline / secondary別 |
| D4: Adoption & Organizational Impact / 実URL未取得 | Conclusion / Sources / Findings / Discussion見出し・本文（各要素へ展開） | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | body / card別 |
| D4: Adoption & Organizational Impact / 実URL未取得 | 補助説明・件数・displayStyle・著者・日時（各要素へ展開） | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | body / card別 |
| D4: Adoption & Organizational Impact / 実URL未取得 | Back文字 | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | muted-foreground |
| D4: Adoption & Organizational Impact / 実URL未取得 | Back文字 | Hover | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | foreground |
| D4: Adoption & Organizational Impact / 実URL未取得 | Back文字 | Focus | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | pointer対象外 |
| D4: Adoption & Organizational Impact / 実URL未取得 | Back indicator | Focus | 未測定 | 未測定 | 適用時3:1 | 未測定 | Not run | 内外の隣接色 |
| D4: Adoption & Organizational Impact / 実URL未取得 | Source title / URL / 日時（各要素へ展開） | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | 全Source、bg-card |
| D4: Adoption & Organizational Impact / 実URL未取得 | Source title / URL / 日時（各要素へ展開） | Hover | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | 全Source、group opacity 80% |
| D4: Adoption & Organizational Impact / 実URL未取得 | Source title / URL / 日時（各要素へ展開） | Focus | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | 全Source、pointer対象外 |
| D4: Adoption & Organizational Impact / 実URL未取得 | Source indicator | Focus | 未測定 | 未測定 | 適用時3:1 | 未測定 | Not run | 全Source・内外の隣接色 |
| D4: Adoption & Organizational Impact / 実URL未取得 | Supporting Source文字 | Normal | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | 全Supporting Source、リンク認識も記録 |
| D4: Adoption & Organizational Impact / 実URL未取得 | Supporting Source文字・underline（別行へ展開） | Hover | 未測定 | 未測定 | text 4.5:1 / 必須非文字は3:1 | 未測定 | Not run | 全Supporting Source |
| D4: Adoption & Organizational Impact / 実URL未取得 | Supporting Source文字 | Focus | 未測定 | 未測定 | 4.5:1 | 未測定 | Not run | pointer対象外 |
| D4: Adoption & Organizational Impact / 実URL未取得 | Supporting Source indicator | Focus | 未測定 | 未測定 | 適用時3:1 | 未測定 | Not run | 折返し各fragmentの隣接色 |
| D4: Adoption & Organizational Impact / 実URL未取得 | card / status / section border（各要素へ展開） | Normal | 未測定 | 未測定 | 必要性判断後、対象なら3:1 | 未測定 | Not run | groupingの装飾か操作・状態識別に必須か理由を記録 |

No research / No conclusion / No sources / No findings / No discussion等の空状態は**表示状況: Not rendered / Not verified、測定Result: Not run**。実表示がある場合だけ対象ページ・文言・実効背景ごとの行を追加する。データを空にする操作は計画に含めない。Source不許可URLのplain text分岐も同様に扱い、表示された場合は文字contrastを測る。

## 7. Visible Focus Review Procedure

1. 第9節の環境と第5節の5ページ実URLを確定する。各viewportごとにページへkeyboard操作を戻し、pointerをリンクから外す。ブラウザのchromeとページ内focusを区別する。
2. 一覧でEvidence Atlas → Source code → Research 4リンクを実Tabで辿る。順序・focus対象名・URLを記録し、各段階でindicatorと対象を目視する。Demo / Read-only demo / status / tagはspanであり独立Tab対象ではない。
3. 一覧の4件をそれぞれkeyboard Enterで開き、詳細ではheader 2リンク → Back → 全Source → 全Supporting Sourceを順方向に辿る。実際のリンク数と順序は画面で採取する。不許可URLは非リンクになるため、seedの想定件数だけでTab順を決めない。
4. 各詳細の最後のリンクをTabで一度抜け、Shift+Tabで戻る。そこからheaderまで逆方向に全対象を辿る。最後がBackの場合も同じ。途中で手動scrollやfocus代入をせず、keyboard auto-scroll直後の状態を記録する。
5. 毎回、対象自体とindicatorを別に観察する。header overlapをNone / Partial / Full、viewport上下・左右のclipping、折返しリンク各fragmentの輪郭・読める文字・位置の認識を記録する。部分遮蔽は具体的な部位・可用性への影響とともに別観測にする。
6. 2.4.7、2.4.11、必要なら1.4.11、プロジェクトoverlap条件をEvidence notesで個別判定する。Partialだけで2.4.11をFailにしないが、2.4.7やプロジェクト条件の問題を見逃す根拠にもしない。Header overlapとviewport clippingを混同しない。
7. 同一対象のHoverだけの見え方とFocusだけの見え方を比較する。hover色変更・opacity・underlineをfocus indicatorと取り違えない。indicator色の測定は第6節に実測行を作り相互にEvidence IDを参照する。
8. BackをEnterで開いて一覧へ戻り、元のResearchへTab到達してfocus認識を確認する。各詳細で繰り返す。Source / Supporting Source / Source codeはfocusだけとし外部へクリック・Enterしない。
9. 読める対象・輪郭の露出・順序・trapの有無を証拠付きで保存する。表示されないSource等はNot rendered / Not verifiedと理由を残す。環境と各対象の確認が揃うまでページ総合Passを付けない。

## 8. Page-by-page Focus Review Table

実行ID / viewport: 未記録。以下は各viewportへコピーする。Source / Supporting Source行は**画面に存在する1リンクにつき**展開する。TabとShift+Tabは別行で、末尾のリンクも逆方向検査に含める。Resultは基準別判定をEvidence notesで参照し、プロジェクト条件によるFailをWCAG AAのFailと混同しない。

| Page / 実URL | Focus target | Navigation direction | Visible indicator | Header overlap | Viewport clipping | Readability / Recognition | Result | Evidence ID / Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| L: Research list / origin未取得・`/demo` | Header: Evidence Atlas | Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| L: Research list / origin未取得・`/demo` | Header: Evidence Atlas | Shift+Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| L: Research list / origin未取得・`/demo` | Header: Source code | Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| L: Research list / origin未取得・`/demo` | Header: Source code | Shift+Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| L: Research list / origin未取得・`/demo` | Research link: Developer Productivity | Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| L: Research list / origin未取得・`/demo` | Research link: Developer Productivity | Shift+Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| L: Research list / origin未取得・`/demo` | Research link: Code Quality & Reliability | Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| L: Research list / origin未取得・`/demo` | Research link: Code Quality & Reliability | Shift+Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| L: Research list / origin未取得・`/demo` | Research link: Developer Experience | Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| L: Research list / origin未取得・`/demo` | Research link: Developer Experience | Shift+Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| L: Research list / origin未取得・`/demo` | Research link: Adoption & Organizational Impact | Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| L: Research list / origin未取得・`/demo` | Research link: Adoption & Organizational Impact | Shift+Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D1: Developer Productivity / 実URL未取得 | Header: Evidence Atlas | Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D1: Developer Productivity / 実URL未取得 | Header: Evidence Atlas | Shift+Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D1: Developer Productivity / 実URL未取得 | Header: Source code | Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D1: Developer Productivity / 実URL未取得 | Header: Source code | Shift+Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D1: Developer Productivity / 実URL未取得 | Back to Demo Workspace | Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D1: Developer Productivity / 実URL未取得 | Back to Demo Workspace | Shift+Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D1: Developer Productivity / 実URL未取得 | Source（1リンクごと展開） | Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D1: Developer Productivity / 実URL未取得 | Source（1リンクごと展開） | Shift+Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D1: Developer Productivity / 実URL未取得 | Supporting Source（1リンクごと展開） | Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D1: Developer Productivity / 実URL未取得 | Supporting Source（1リンクごと展開） | Shift+Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D2: Code Quality & Reliability / 実URL未取得 | Header: Evidence Atlas | Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D2: Code Quality & Reliability / 実URL未取得 | Header: Evidence Atlas | Shift+Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D2: Code Quality & Reliability / 実URL未取得 | Header: Source code | Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D2: Code Quality & Reliability / 実URL未取得 | Header: Source code | Shift+Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D2: Code Quality & Reliability / 実URL未取得 | Back to Demo Workspace | Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D2: Code Quality & Reliability / 実URL未取得 | Back to Demo Workspace | Shift+Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D2: Code Quality & Reliability / 実URL未取得 | Source（1リンクごと展開） | Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D2: Code Quality & Reliability / 実URL未取得 | Source（1リンクごと展開） | Shift+Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D2: Code Quality & Reliability / 実URL未取得 | Supporting Source（1リンクごと展開） | Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D2: Code Quality & Reliability / 実URL未取得 | Supporting Source（1リンクごと展開） | Shift+Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D3: Developer Experience / 実URL未取得 | Header: Evidence Atlas | Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D3: Developer Experience / 実URL未取得 | Header: Evidence Atlas | Shift+Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D3: Developer Experience / 実URL未取得 | Header: Source code | Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D3: Developer Experience / 実URL未取得 | Header: Source code | Shift+Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D3: Developer Experience / 実URL未取得 | Back to Demo Workspace | Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D3: Developer Experience / 実URL未取得 | Back to Demo Workspace | Shift+Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D3: Developer Experience / 実URL未取得 | Source（1リンクごと展開） | Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D3: Developer Experience / 実URL未取得 | Source（1リンクごと展開） | Shift+Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D3: Developer Experience / 実URL未取得 | Supporting Source（1リンクごと展開） | Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D3: Developer Experience / 実URL未取得 | Supporting Source（1リンクごと展開） | Shift+Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D4: Adoption & Organizational Impact / 実URL未取得 | Header: Evidence Atlas | Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D4: Adoption & Organizational Impact / 実URL未取得 | Header: Evidence Atlas | Shift+Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D4: Adoption & Organizational Impact / 実URL未取得 | Header: Source code | Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D4: Adoption & Organizational Impact / 実URL未取得 | Header: Source code | Shift+Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D4: Adoption & Organizational Impact / 実URL未取得 | Back to Demo Workspace | Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D4: Adoption & Organizational Impact / 実URL未取得 | Back to Demo Workspace | Shift+Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D4: Adoption & Organizational Impact / 実URL未取得 | Source（1リンクごと展開） | Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D4: Adoption & Organizational Impact / 実URL未取得 | Source（1リンクごと展開） | Shift+Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D4: Adoption & Organizational Impact / 実URL未取得 | Supporting Source（1リンクごと展開） | Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |
| D4: Adoption & Organizational Impact / 実URL未取得 | Supporting Source（1リンクごと展開） | Shift+Tab | Not run | Not run | Not run | Not run | Not run | 未観測 |

一覧にはBack / Source / Supporting Sourceが構造上存在しない（—）。詳細には一覧4カードが存在しない（—）。一方、詳細でSource / Supporting Sourceが表示されていない場合は、構造的対象外にせず **Not rendered / Not verified** をnotesに記録し、ResultはNot runを維持する。

## 9. Environment and Evidence Record

後日、実行・viewport・方法ごとにコピーする。記録日やローカルHEADを実行日時・配備SHAに転記しない。想定値を測定済みとして記入しない。

| 記録項目 | 記入欄 |
| --- | --- |
| 実行ID / 証拠種別 | 未記録 |
| 実行開始・終了日時 / timezone | 未記録 |
| 実行者 | 未記録 |
| OS / build | 未記録 |
| Browser / 完全なVersion | 未記録 |
| viewport width / height（CSS px） | 未測定 |
| window / OS display scaling（取得できる範囲） | 未記録 |
| zoom値 / 設定確認方法 | 未確認 |
| Light theme / 確認方法・computed背景 | 未確認 |
| 対象origin / 一覧URL / 4詳細の実URL | 未取得 |
| Deployment ID / Status / Commit SHA / 確認根拠 | 未確認 |
| 測定方法 / 使用ツール・Version / 色空間 | 未記録 |
| 状態の作り方 / scroll位置 / header背面 / pointer位置 | 未記録 |
| font-size / font-weight / font-family / 大きな文字の根拠 | 未測定 |
| Screenshot / Evidence ID / 保存先 | 未取得 |
| 検査後の設定復元（zoom / viewport / CSS等） | Not run |

証拠IDは実行IDにページ・viewport・対象・状態・方向を紐付ける。測定日時、実URL、色と比率、focus時の対象・indicator・header・viewport端のcapture、操作順、期待値と実際、基準別判定、未実施理由を残す。スクリーンショットだけで測定条件や比率を推測しない。

## 10. Known Risks / Not Rendered States

- 半透明header（95%）とbackdrop-blurはscroll背面で色が変わり得る。header折返しとscroll marginの固定値の関係も未観測。
- SourceのHover opacity 80%、cardのaccent 50%、outline色50%は未測定。通常色の比率をHover / Focusへ転用しない。
- 通常リンクのfocusはUA依存の外観を含む。Badgeのfocus-visible classはDemo内の非対話spanには独立適用されない。classの存在から実描画Passを付けない。
- Supporting Sourceは通常文字と同じforegroundを継承し、Hoverでunderline。文脈を含むリンク識別の観測対象で、静的に1.4.1違反又は合格と断定しない。
- 一覧title truncate / description line-clamp、Source URL preview truncate、Badgeの固定高・nowrap / overflowは既存実装。リンクやfocus indicatorの欠けと識別可能性を後日観察する。
- 空状態、無tag / description省略、不許可URLの非リンク分岐は **Not rendered / Not verified**。実DB / seedを変更して出現させない。別harnessの構築・実行も今回行わない。
- PR #15の20/20、PR #17〜#19の手動結果は各条件での既存証拠。過去のPending / Not runは当時の記録として保持し、今回の新しいcontrast / Visible Focus表は埋めない。
- design systemのLight / Dark検証要求と実theme選択のgapは既存の未完事項。今回のLight限定計画で解消したことにしない。

## 11. Remaining Work

後日開発者が配備identityと実URLを記録し、全5ページ×3viewportの共通・固有contrast行、全リンクの両方向focus行を展開して検査する。前景・実効背景・比率、indicatorの実描画、header部分 / 完全遮蔽、viewport端・折返しの露出、リンク・statusの非色手掛かりはすべて未測定・未観測。未表示分岐は別の未検証記録として残す。

不具合を実観測した場合はページ・viewport・状態・操作・証拠・該当基準を固定して別タスクの修正範囲を判断する。今回の静的懸念だけでアプリを変更しない。通常SaaS・Chat・既存deferred riskも残るため、**Phase 10 Accessibility / Responsive UI review全体は未完了**。roadmap・既存チェックボックスは変更しない。

今回の確認は指定のオフライン文書確認のみ。アプリテスト、テスト列挙、lint、型チェック、build、ブラウザE2Eは実行していない。変更は本新規文書とPhase 10文書末尾へのPR #20準備状況の追記だけとし、commit / push / PR作成を行わず、未コミットで停止する。

## PR #21 — L1 Contrast / Visible Focusユーザー手動報告（記録日: 2026-10-20 JST）

開始時は `docs/demo-contrast-focus-list-evidence` / `a482f635892d00548c8fb1a63a886609d8fdf4a9` / cleanで指定と一致。`git status --short --branch`はbranch行のみで、既存の未コミット変更なし。`git worktree list`は `C:/Users/owner/Desktop/sm-dev/evidence-atlas` の1件。開始HEADを配備commitとは扱わない。

本節はSession **L1**の**D: Developer-reported manual review（開発者提供のユーザー手動報告）**を記録する。PR #21の詳細検査対象はResearch一覧（`/demo`）。既存表のページID `L`とSession ID `L1`を区別する。4詳細ページのPassは補足のページ単位報告として保持し、詳細検査の個別実測記録が揃ったとは扱わない。Codexによるブラウザ操作・再実行・独立観測ではなく、第1〜11節のPR #20準備記録・Not run表は当時の履歴として変更しない。

### L1の環境・証拠情報（D）

| 記録項目 | ユーザー提供情報 / 未確認事項 |
| --- | --- |
| Session ID / Evidence type | L1 / D（Developer-reported manual review） |
| Date / Time | 2026-10-20 11:28（timezone未確認。JSTとは補完しない） |
| OS / build | Windows 11（build未確認） |
| Browser | Google Chrome 157（ユーザー申告。完全なversion / build未確認） |
| URL | [Research一覧（ユーザー提供Preview）](https://evidence-atlas-git-docs-demo-contrast-visi-627546-morimotodev93.vercel.app/demo)（今回アクセスしていない） |
| Deployment ID / Commit SHA | 未確認。配備statusも未確認 |
| Viewport | 1280 × 720 CSS px（ユーザー申告、提供DevToolsスクリーンショットにも表示） |
| Zoom | 100%（ユーザー申告） |
| Theme | Light（ユーザーが明示的に訂正・確認。DOM / computed背景の独立確認なし） |
| Keyboard | Tab / Shift+Tabの両方を確認したとの報告。各リンク・方向別の結果は未取得 |
| Screenshot / capture ID / 保存先 | 会話で提供されたスクリーンショットあり。capture ID・保存先は未確認 |

スクリーンショットはユーザー提供の補助証拠であり、新しい自動テストや完全な測定artifactとして扱わない。スクリーンショットの表示から配備identity、色・比率、個別focus結果を推測しない。window寸法・OS display scaling、操作順・scroll位置・pointer位置、検査後の設定復元記録も未確認。過去の別Sessionの値で補完しない。

### Visible Focusのページ単位報告（D）

| ページ | L1で報告されたVisible Focus | PR #21での扱い / 実URL |
| --- | --- | --- |
| Research list | Pass（ユーザー手動報告） | 詳細検査対象。上記 `/demo` URL。リンク別・方向別の個別結果は未取得 |
| Developer Productivity | Pass（ユーザー手動報告） | 補足のページ単位報告。個別URL未確認 |
| Code Quality & Reliability | Pass（ユーザー手動報告） | 補足のページ単位報告。個別URL未確認 |
| Developer Experience | Pass（ユーザー手動報告） | 補足のページ単位報告。個別URL未確認 |
| Adoption & Organizational Impact | Pass（ユーザー手動報告） | 補足のページ単位報告。個別URL未確認 |

**全5ページPassとのユーザー手動報告（D）**を保持する。Tab / Shift+Tabの両方を確認したとの報告を、各リンクで両方向の個別確認が済んだ証拠には展開しない。以下の詳細項目は未確認であり、第8節のNot runをPassへ置換しない。

- Evidence Atlas / Source code / 一覧4リンク / Backを含む、各リンクの個別Tab / Shift+Tab結果・順序・操作ログ。
- Focus indicatorの色・幅・コントラスト比、各fragmentの輪郭と露出。
- Sticky headerによる部分遮蔽・完全遮蔽、viewport端のindicator clipping。
- Source / Supporting Sourceの個別focus結果と実リンク数、4詳細ページの個別URL。

### Contrastの報告と測定の限界（D）

ユーザーからは「目視では視認可能」との報告があるが、**厳密なコントラスト比率は未測定**。CSS Overviewでは **`Contrast issues`項目が表示されなかった**とのユーザー報告であり、「問題0件」とは断定しない。CSS OverviewだけでWCAG 2.2 AAへの適合を宣言せず、全面適合は未確認とする。

前景色・実効背景色・比率は補完せず、**第6節のContrast測定表のNot run / 未測定を維持する**。Normalの数値測定に加え、Hover、透明度を含む合成色（card背景・Source opacity・半透明sticky headerと背面）、Focus indicatorの色・幅・隣接色との比率、FocusとHoverの併存状態は未確認。目視の報告を各状態や各要素の数値Contrast Passに展開しない。未表示の空状態・非リンク分岐は引き続きNot rendered / Not verified、測定ResultはNot run。

### L1記録後の残項目と今回の確認範囲

一覧の個別リンク・両方向focus記録、indicator実測、header遮蔽・viewport clipping、数値Contrast、配備identityの確認が残る。4詳細ページは補足のページ単位Pass報告にとどまり、Source / Supporting Sourceを含む詳細検査は未完了。他viewport、通常SaaS / Chat、既存deferred riskも完了扱いにしない。**Phase 10 Accessibility review / Responsive UI reviewは引き続き未完了**。受入状況は[Phase 10のPR #21追記](../planning/phase10-quality-acceptance.md#pr-21-l1-report)に記録し、roadmap・既存チェックボックスは変更しない。

今回の変更は指定Markdown 2ファイルの末尾追記のみ。確認はGit差分・Markdown表・見出し・相対リンク・履歴保持のオフライン確認に限る。アプリコード・CSS・テストは変更せず、ブラウザ検査・E2E・外部Previewアクセス、DB / OAuth / Session / AI / Cloud操作、サーバー起動・production build、commit / push / PR作成 / mergeは行わず、未コミットで停止する。


<a id="pr-22-codex-browser-batch"></a>

## PR #22 — Codex実行 Chromium Contrast / Focus / Responsive batch（2026-10-20 JST）

本節は **C22: Codexが今回実行したPlaywright Chromiumの独立観測**。PR #20の準備・143行の未実施表とPR #21のD: ユーザー手動結果は当時の履歴として変更しない。15条件を1 batchとして検査したが、**全条件Pass・知覚上の完全なfocus可視性・WCAG全面適合は宣言しない**。一覧の2 viewportで部分重なり / 下端余白不足が残り、数値化できない色はNot verifiedとした。

### C22-1. 開始状態・実行環境・対象配備

| 項目 | 今回の実測・確認 |
| --- | --- |
| branch / HEAD | `test/demo-contrast-focus-batch` / `c6d97caac748457bcaa042eda883ff342fffe9f8` |
| working tree / worktree | 開始時clean。`C:/Users/owner/Desktop/sm-dev/evidence-atlas` の1件、想定branch / HEAD |
| PR #21 | ローカル `main` と `origin/main` が同じ `c6d97ca`。commit messageは `Merge pull request #21`、parentsは `a482f63` / `dce6545`、mainへのancestor検査もexit 0。fetch・GitHubアクセスなし |
| OS / Node / package manager | Windows NT `10.0.26200.0` / Node `v24.16.0` / 宣言・実行とも `pnpm@12.9.1` |
| Playwright / Browser | 既存 `@playwright/test 1.63.0` / headless Chromium **153.0.8010.12**。PR #21のChrome 157とは別環境 |
| 実行日時 | batch `2026-10-20T02:59:55.518Z`〜`03:02:04.920Z`、JST換算 **11:59:55.518〜12:02:04.920**。各ページの実採取時刻は下表とJSON。実行時計の値であり時刻同期の独立検証なし |
| 時刻の注意 | 保存したpreflightのHTTP `Date` は `Tue, 20 Oct 2026 03:02:14 GMT`、実行側preflight時刻は `02:59:55.379Z`。両時計に約139秒の差があり、HTTP Dateで採取時刻を補正していない |
| 実viewport / zoom | 各ページで `innerWidth/innerHeight` = **1280×720 / 375×812 / 768×1024**、DPR=1、`visualViewport.scale=1`、root / body computed zoom=`1`。新規contextの100%条件。native browser UI設定の手動検査ではない |
| Light / font | `prefers-color-scheme: light=true`、rootにdark classなし、body背景 `lab(98.2716 0 0)` ≈ `#fafafa`。IBM Plex Sans、`document.fonts.ready` 待機、全15条件でfonts loaded |
| 設定・依存 | package.json / lock由来のinstalled version / `playwright.config.ts`を読取。既存configはworker 1、serviceWorkers block、Chromiumのみ。configのdefault別originは使わず、今回の明示URLだけをrunnerに固定。依存導入・変更なし |
| Browser起動 | sandbox内の初回launchは `spawn EPERM`。権限を伴う再試行で起動できた。失敗した起動をブラウザ検査成功に算入しない |
| 対象Deployment | 下記Previewは200・期待表示を確認。**Deployment ID / 配備SHA / ローカルHEADとの一致は未確認**。`x-vercel-id`は応答識別子として保存し、Deployment IDとは扱わない。管理API / Cloud設定にはアクセスしない |

一覧から取得した実URL（このorigin以外へ遷移していない）:

| ID | ページ | 実URL |
| --- | --- | --- |
| L | Research list | [Preview /demo](https://evidence-atlas-git-docs-demo-contrast-visi-627546-morimotodev93.vercel.app/demo) |
| D1 | Developer Productivity | [実一覧リンク](https://evidence-atlas-git-docs-demo-contrast-visi-627546-morimotodev93.vercel.app/demo/research/v0313wclyankpmyo4ujhmza2) |
| D2 | Code Quality & Reliability | [実一覧リンク](https://evidence-atlas-git-docs-demo-contrast-visi-627546-morimotodev93.vercel.app/demo/research/c3q3cl35ne9iq5yuwxpx7bg5) |
| D3 | Developer Experience | [実一覧リンク](https://evidence-atlas-git-docs-demo-contrast-visi-627546-morimotodev93.vercel.app/demo/research/qyjy9por32pcwpg8mhevznmw) |
| D4 | Adoption & Organizational Impact | [実一覧リンク](https://evidence-atlas-git-docs-demo-contrast-visi-627546-morimotodev93.vercel.app/demo/research/ix53bd2y7be2zmk55h2sypn8) |

Preflightは指定 `/demo` のHTTP 200、実URL不変、h1=`AI-Assisted Software Development`、`Read-only demo`、Research listの4リンクとタイトル・Demo href形式を検査した。詳細も全15条件で200・対応h1・Read-only表示を確認し、D1〜D4ではConclusion / Sources / Findings / Discussionの4セクションを確認した。Research IDのseed参照・推測はしていない。初回の環境確認preflightの後、保存したbatch開始時にもpreflightを実施した。

通信はcontext全体のrouteで**GET・指定origin・`/demo` / Demo詳細 / `/_next/static/` / faviconに限定**。`route.fetch(maxRedirects:0)`でredirectを自動追従せずLocationも検査し、Service Workerはblock、WebSocketもcloseする。保存したbatch監査は **許可GET 483件 / 全200 / 通信エラー0**。Previewが要求した `vercel.live` のfeedback script **31件は送信前にrouteで遮断**した。外部Source / GitHubをclick・Enterで開いておらず、外部サイトを取得していない。Source hrefはDOM属性として記録しただけである。この制限で表示されないVercel feedback UIはDemoアプリの検査対象に含めない。

### C22-2. 実行方法と証拠

既存E2E全体は実行していない。`e2e/public-demo.spec.ts` の `expectResponsiveElement`、`expectExposedKeyboardFocus`、`expectUnobscuredSourceFocus` を参照し、同じRange / clipping ancestor、hit testing、全fragment＋最低4 CSS px余白の方法を一時runnerへ取り込んだ。helperはspec内の非export関数であり直接importするとscope外テストを登録するため、既存spec・configには変更しない。過去のE2E成功は今回の結果に算入しない。

Normalはpointerをリンク外へ移し、各文字要素をscrollしてcomputed styleとRangeを採取した。Focusは新しいdocumentから実際のTabだけで前進し、最後に1回Tabでdocument境界へ出てShift+Tabで末尾に戻り、全リンクを逆順でも検査した。focusの直接代入・forced state・途中の手動scrollなし。Hoverはfocusを実keyboard操作でbodyへ外し、pointer hoverと200msのtransition待機で採取した。記録されたNormal / Hover / Focusに意図しないHover+Focus併存は0件。

- [preflight.json](../planning/evidence/pr22-demo-browser-review/preflight.json): browser version、headers、取得リンク、環境値。
- [summary.json](../planning/evidence/pr22-demo-browser-review/summary.json): 15条件の集計・実時刻・実viewport。
- [measurements.json](../planning/evidence/pr22-demo-browser-review/measurements.json): 全文字sample、computed foreground・size / weight、祖先背景・opacity / filter、比率、実focus対象・両方向順序・全fragment・scrollY・outline / shadow、clippingの個別観測。`backgroundChainId`は同ファイルの`backgroundChains`配列を参照する重複排除で、値は元の採取結果と同じ。
- [network.json](../planning/evidence/pr22-demo-browser-review/network.json): batchの許可GET・遮断・status・エラー。最初の別preflightの件数はこの483件へ合算していない。
- [runner-source.txt](../planning/evidence/pr22-demo-browser-review/runner-source.txt) / [batch-source.txt](../planning/evidence/pr22-demo-browser-review/batch-source.txt): 実行した一時スクリプトの証拠用コピー。アプリコード・既存E2Eではない。
- PNG 32枚: `L/D1/D2/D3/D4-{width}-normal.png` の15枚、D1のSource / 最後のSupporting Sourceの両方向sample 12枚、一覧の余白Fail 4枚、preflight 1枚。[SHA-256 manifest](../planning/evidence/pr22-demo-browser-review/sha256.json)で全証拠ファイルを照合できる。

### C22-3. ページ・viewport別結果

以下の「keyboard」は順序・実focus・`:focus-visible`・outline又はshadow・部分露出の自動assertion成功数。**4px余白判定・知覚上の可視性の合格数ではない**。「clipping」は意図的な省略を除いたRange検査。採取時刻はすべて2026-10-20 JST。全行とも実viewportは指定値と一致し、HTTP 200、横幅は `scrollWidth=clientWidth=viewport.width`。

| ページ | 実viewport | 採取開始 JST | keyboard 両方向 | 4px余白 / 部分重なり | 横overflow / 非意図的clipping | 意図的省略の観測要素数 |
| --- | --- | --- | --- | --- | --- | --- |
| L | 1280×720 | 12:00:00.709 | 12/12 Pass | **Fail 2件（F1 / F2）** | なし / なし | 0 |
| D1 | 1280×720 | 12:00:12.526 | 22/22 Pass | Pass | なし / なし | 0 |
| D2 | 1280×720 | 12:00:20.610 | 24/24 Pass | Pass | なし / なし | 0 |
| D3 | 1280×720 | 12:00:28.812 | 24/24 Pass | Pass | なし / なし | 0 |
| D4 | 1280×720 | 12:00:37.035 | 22/22 Pass | Pass | なし / なし | 0 |
| L | 375×812 | 12:00:45.147 | 12/12 Pass | **Fail 2件（F3 / F4）** | なし / なし | 5 |
| D1 | 375×812 | 12:00:53.660 | 22/22 Pass | Pass | なし / なし | 2 |
| D2 | 375×812 | 12:01:01.535 | 24/24 Pass | Pass | なし / なし | 1 |
| D3 | 375×812 | 12:01:09.728 | 24/24 Pass | Pass | なし / なし | 2 |
| D4 | 375×812 | 12:01:17.923 | 22/22 Pass | Pass | なし / なし | 0 |
| L | 768×1024 | 12:01:26.035 | 12/12 Pass | Pass | なし / なし | 0 |
| D1 | 768×1024 | 12:01:34.494 | 22/22 Pass | Pass | なし / なし | 1 |
| D2 | 768×1024 | 12:01:42.465 | 24/24 Pass | Pass | なし / なし | 0 |
| D3 | 768×1024 | 12:01:50.653 | 24/24 Pass | Pass | なし / なし | 1 |
| D4 | 768×1024 | 12:01:58.909 | 22/22 Pass | Pass | なし / なし | 0 |

### C22-4. 数値Contrastの結果と限界

静的token比率ではなく、**対象Previewで実際の状態を作り採取したcomputed colorと祖先背景**を使用した。ChromiumのsRGB canvas（8bit RGBA）でLab / OKLab等を変換し、透明な背景を祖先順に既知の不透明面へsource-over合成した。通常文字4.5:1、24px以上又は18.67px以上・700以上の文字3:1、必要非文字3:1を用いる。600をboldとみなさない。比較は丸め前の比率、下表は表示用の丸め値。8bit変換・alphaの量子化を含む近似であり、glyphのantialias pixelや実画面の測色ではない。今回の判定値は閾値近傍ではない。

前景の実computed値は、F=`lab(7.77868 1.58516 -14.2876)` ≈ **rgb(15 23 42)**、M=`lab(35.5352 -1.674 -13.4708)` ≈ **rgb(71 85 105)**。body背景は `lab(98.2716 0 0)` ≈ rgb(250 250 250)、cardは `lab(100 0 0)` = rgb(255 255 255)、tagは `lab(91.713 -0.96944 -4.62384)` ≈ rgb(226 232 240)。以下は全3 viewportで同じ色組を実測した共通部品の整理で、個別の要素・状態はJSONに保持した。

| 対象・状態 | computed前景 | 実効背景 sRGB | font-size / weight | 比率 | 基準 / 結果 |
| --- | --- | --- | --- | --- | --- |
| L h1 / 詳細h1・Normal | F | 250,250,250 | L 24px/600、詳細375pxは24px/600、他30px/600 | 17.10 | 大文字3 / Pass |
| 組織名・説明・Created / Updated等・Normal | M | 250,250,250 | 12/14/16px、400 | 7.26 | 4.5 / Pass |
| 本文 / section h2・Normal | F | 250,250,250又は255,255,255 | 本文14px/400、h2 18px/600 | 17.10 / 17.85 | 4.5 / Pass |
| 一覧title / status・Normal | F | 255,255,255 | title16px/500、status12px/500 | 17.85 | 4.5 / Pass |
| 一覧説明・日付 / card内metadata・Normal | M | 255,255,255 | 12/14px、400又は補助label500 | 7.58 | 4.5 / Pass |
| 詳細status・Normal | F | 250,250,250 | 12px/500 | 17.10 | 4.5 / Pass |
| main内Tag・Normal / 一覧Tag・Hover | F | 226,232,240 | 12px/500 | 14.48 | 4.5 / Pass |
| 一覧title / status・Hover | F | 約234.439,241.467,251.506 | 16px/500、12px/500 | 15.77 | 4.5 / Pass |
| 一覧説明 / 日付・Hover | M | 同上 | 14px/400、12px/400 | **6.69** | 4.5 / Pass（今回の測定最小値） |
| Back・Normal / Focus | M | 250,250,250 | 14px/400 | 7.26 | 4.5 / Pass |
| Back・Hover | F | 250,250,250 | 14px/400 | 17.10 | 4.5 / Pass |
| Source title・Normal / Focus | F | 255,255,255 | 16px/500 | 17.85 | 4.5 / Pass |
| Source URL / Updated・Normal / Focus | M | 255,255,255 | 14px/400、12px/400 | 7.58 | 4.5 / Pass |
| Supporting Source・Normal / Hover / Focus | F | 255,255,255 | 14px/400 | 17.85 | 4.5 / Pass |
| Header内文字 / Demo Badge・各採取状態 | F又はM（Hover Source codeはF） | **未確定** | site16px/600、Demo12px/500、補助14px/400 | 未測定 | text4.5目安 / **Not verified**（半透明＋backdrop blur） |
| Source・Hover | F / Mを取得、group opacity=`0.8` | 背面cardは白、group合成後の前景は未確定 | title16px/500、URL14px/400、Updated12px/400 | 未測定 | 4.5 / **Not verified** |
| Focus indicator・全リンク | outline色は次節参照 | UA auto描画と半透明の実効pixel未確定 | outline auto 1px / offset 1px | 未測定 | 必要非文字3 / **Not verified** |

Hoverのcard背景は既知のbody面へのalpha合成が可能で、祖先opacity=1、background image / filter / blur / blendなしを採取して数値化した。header blur、Source hoverのgroup opacityは同じ処理で確定できないため数値判定を抑止した。opaqueなHeader Demo Badgeも保守的にheader祖先のblurを理由にNot verifiedとし、他のTagのPassで補完しない。

全3 viewportで各ページのsample数・判定件数は次のとおり同一。P=Pass、NV=Not verified。Focus textは実focus対象のBack / Source / Supporting Sourceと一覧説明のsampleで、**indicatorの比率ではない**。一覧title / tag / statusのFocus専用sampleは採取しておらず未確認。反復数は独立したWCAG適合項目数ではない。

| ページ（各viewport） | Normal P / NV | Hover P / NV | Focus text P / NV（両方向合計） | 数値Fail |
| --- | --- | --- | --- | --- |
| L | 29 / 4 | 26 / 2 | 8 / 4 | 0 |
| D1 | 53 / 4 | 6 / 11 | 30 / 4 | 0 |
| D2 | 55 / 4 | 7 / 11 | 32 / 4 | 0 |
| D3 | 54 / 4 | 7 / 11 | 32 / 4 | 0 |
| D4 | 54 / 4 | 6 / 11 | 30 / 4 | 0 |

合計: Normal **735 P / 60 NV**、Hover **156 P / 138 NV**、Focus text **396 P / 60 NV**、数値Fail 0。必要非文字情報の網羅判定は未完了であり、この文字測定の結果から3:1合格を宣言しない。

### C22-5. Visible Focus・Responsiveの結果と限界

実Tab順序はLで **Evidence Atlas → Source code → 一覧D1 → D2 → D3 → D4**。詳細は **Evidence Atlas → Source code → Back → Source各3件（DOM順）→ Supporting Source（DOM順）**。Supporting数はD1=5、D2=6、D3=6、D4=5。いずれもFindings 4件 / Discussion 1件で、全3 viewportで実リンク数はL=6、D1=11、D2=12、D3=12、D4=11。Shift+Tabは末尾を含む完全な逆順を実観測した。Sourceの実題名・href・各方向・順序はmeasurementsの`expectedOrder` / `focus`へ保持した。Source / Supporting SourceではEnterやclickをしていない。

全 **312観測**で実focus対象が期待リンクに一致、`:focus-visible=true`、9点hit testingによる部分露出あり、computed indicatorあり。outlineはすべて **`auto / 1px / offset 1px / oklab(0.546089 -0.026687 -0.213521 / 0.5)`**、box-shadowは **`none`**。操作後は実URL不変、ページ数はpreflight用＋検査用の2枚を維持しpopup増加なし。header高は1280 / 768幅で49px、375幅で81px。

4px余白は既存Source helperの保守的project検査を全リンクへ拡張した追加診断。全非空fragmentでheader下端以上かつviewport四辺内にoutline余白を要求した。**Source / Supporting Sourceの204観測とBackの24観測は全viewportでPass**、Header 60観測もPass。一覧24観測のうち4観測が下表のFail。最低4pxは実UA outlineの描画面積そのものの測定ではない。特に下端のFailは4px余白不足であり、それだけでWCAGの完全遮蔽・2.4.7違反と断定しない。

Codexは保存画像の一覧3幅、一覧Fail 4枚、D1の375px Source / Supporting Sourceの前後方向sample、375pxの4詳細等を補助的に目視確認した。一覧のheader下へ入った上部輪郭と、下端余白の乏しさを確認でき、D1 sampleのfocus枠を識別できた。これは人による全リンク・全状態の知覚レビューではなく、**全15条件の知覚的Focus合格はNot verified**。UA auto outlineのalpha・描画・adjacent colorを数値確定していないため、`:focus-visible`とoutline存在だけでcontrast合格にしない。

全15条件の横overflowは0、見出し・本文・Badge・補助文字に**非意図的なclippingの自動検出0**。主な文字はscrollしてRangeとclipping祖先を確認した。ただしviewport全域の全pixel・あらゆるscroll位置を証明するものではない。Back / SourceはTabで到達・余白内に露出した。375px一覧は4説明の2行clampとD4 titleのellipsisを観測し、全タイトルはDOMに保持されていた。Source URL previewはD1=375pxで2件/768pxで1件、D2=375pxで1件、D3=375pxで2件/768pxで1件の意図的truncateを観測した。省略を「全文が視覚表示できた」と報告しない。一覧カードの文字色は測定Passでも、keyboard時の重なりがあるため配置全体をPassとはしない。

### C22-6. Fail / Not verified・修正候補

全Failの実URLは **[Lの実Preview /demo](https://evidence-atlas-git-docs-demo-contrast-visi-627546-morimotodev93.vercel.app/demo)**。対象・値・期待・再現操作は以下。座標はCSS px、scrollはブラウザの実keyboard auto-scroll。上端は `top - 4 >= header.bottom`、下端は `bottom + 4 <= viewport.height` を期待する。

| ID / viewport | 対象・方向 | 実測値 / 期待値 | 再現手順 | 証拠 / 判定 |
| --- | --- | --- | --- | --- |
| F1 / 1280×720 | Developer Experience・Tab | top561、bottom719、scrollY0。`719+4=723 > 720`、下端の実余地1px / 4px以上 | fresh `/demo`、Tab×5（Header 2件→一覧3件目） | [画像](../planning/evidence/pr22-demo-browser-review/L-1280-forward-4.png)。**4px余白Fail**、実paintの全輪郭露出は未確定 |
| F2 / 1280×720 | Developer Productivity・Shift+Tab | top20、bottom178、scrollY201、header.bottom49。`20-4=16 < 49`、対象rectの上29pxがheader下 | fresh `/demo`、Tab×6でD4、Tabで境界、Shift+Tab×4でD1 | [画像](../planning/evidence/pr22-demo-browser-review/L-1280-reverse-3.png)。**部分重なりFail**、対象は一部露出 |
| F3 / 375×812 | Developer Experience・Tab | top642、bottom812、scrollY47。`812+4=816 > 812`、下端の実余地0px / 4px以上 | fresh `/demo`、Tab×5 | [画像](../planning/evidence/pr22-demo-browser-review/L-375-forward-4.png)。**4px余白Fail**、全輪郭の実paint判定は未確定 |
| F4 / 375×812 | Developer Productivity・Shift+Tab | top72、bottom242、scrollY253、header.bottom81。`72-4=68 < 81`、対象rectの上9pxがheader下 | fresh `/demo`、Tab×6、Tabで境界、Shift+Tab×4 | [画像](../planning/evidence/pr22-demo-browser-review/L-375-reverse-3.png)。**部分重なりFail**、対象は一部露出 |

4件とも`:focus-visible`・outline・部分露出のassertionはPassし、完全遮蔽は検出していない。**2.4.11 AAの完全遮蔽Failとは区別する**。一方、一覧の上部輪郭の部分遮蔽は実画像でも確認でき、プロジェクトの重なりなしの期待は満たさない。PR #21のユーザー報告を訂正せず、別browser / 条件の新観測として記録する。

修正候補（今回は未適用）: 詳細側にあるanchorの `scroll-mt-24 sm:scroll-mt-16 scroll-mb-2` 相当を一覧リンクにも適用し、49px / 81pxのsticky headerと最低4pxの余白を確保する。適用先はDemo表示内で検討し、共用Research listを不用意に変更しない。別タスクでF1〜F4と既存全詳細の順逆操作を再検査する。現時点では提案であり、解消・再検証済みとはしない。

| Not verified / Not rendered | 残す理由・追加確認 |
| --- | --- |
| Deployment ID / 配備SHA / HEAD一致 | 公開応答だけでは確定できない。別の配備identity証拠が必要 |
| Header内Normal / Hover / Focusの実効contrast | 半透明背景とbackdrop blur。computed前景を保持し、背面条件ごとのpixel / 合成確認が必要 |
| Source Hoverの実効contrast | group opacity 0.8の合成後の色をrunnerは確定しない。通常時の比率を転用しない |
| Focus indicator 3:1、面積・全輪郭の知覚的可視性 | auto outline＋alpha、UA描画・隣接色を未測定。312 assertion Passを知覚適合へ展開しない |
| 一覧title / tag / statusのFocus専用文字sample、Focus+Hover併存 | 今回は専用sample / 併存条件を採取していない。Normal / Hoverで補完しない |
| 非文字要素・リンクの非色手掛かりの全面判定 | border / iconの必要性を含む網羅的な1.4.1 / 1.4.11判定は未実施。Source codeのGithub iconは文字ラベルを補うaria-hidden装飾として観測したが、これで全要素を除外しない |
| 空状態、descriptionなし、無tag、Archived / In progress、不許可URLの非リンク分岐 | 今回の実表示で未確認。表示されたCompleted、3 Sources・4 Findings・1 Discussionだけを結果にする。DB / seedで分岐を出していない |
| その他の条件 | dark、他browser / 物理device / OS scaling、screen reader・全支援技術、全scroll位置・全pixel、通常SaaS / Chat。今回の100%条件をnative zoom / text-only / spacingの再実行結果にしない |

### C22-7. 変更・オフライン検証・Phase 10の残課題

変更は本節、Phase 10文書のPR #22追記、証拠ディレクトリ39ファイルのみ。アプリ・CSS・既存E2E・Playwright設定・package.json / lock・roadmapは変更していない。一時runnerとraw出力はgitignore対象の`test-results/`に置き、文書配下には監査用snapshot / JSON / PNGのみを保存した。

オフライン確認はrunnerの`node --check`、元の2文書がHEAD内容とbyte単位でprefix一致する追記限定検査、既存チェックボックス保持、Markdown表の列数・追加相対リンクの存在、JSONの15条件・件数 / 比率 / viewport / focus順序・通信境界・元観測との一致、全証拠SHA-256照合、`git diff --check`。新しい観測の検算であり、アプリのunit / integration / 全E2E / lint / typecheck / build成功報告ではない。

**Phase 10 Accessibility review / Responsive UI reviewは未完了。** 一覧focus余白の修正・同条件再確認、配備identityの確定、上記Not verifiedな合成色・focus indicatorと知覚レビューが残る。PR #17〜#19のnative 200% / text spacing / text-onlyは既存のユーザー結果として保持する。通常SaaS各画面の375 / 768 / desktop、Chat 1023 / 1024px境界・keyboard、既存の支援技術等deferred riskと他のPhase 10未完項目も継続する。roadmap・Phase 10の既存チェックボックスは変更しない。

DB操作・migration・seed、OAuth / Session / AI API、Cloud設定・deploy、サーバー起動・production build、外部Source / GitHubへのアクセス、commit / push / PR作成 / mergeは行っていない。**未コミットで停止する。**


<a id="pr-22-list-focus-offline-fix"></a>

## PR #22 follow-up — Research一覧Focusのオフライン修正（2026-10-20 JST）

**ローカル修正済み・ブラウザ再検証待ち。** [修正分析・証拠39件の安全確認・容量一覧](public-demo-list-focus-regression-fix.md)へ記録した。開始状態は `test/demo-contrast-focus-batch` / `c6d97ca`、既存の本書・Phase 10追記と証拠39件のみ。既存部分はbyte単位で保持し、証拠ファイルは変更していない。

一覧mainに詳細と同じ `[&_a]:scroll-mt-24 sm:[&_a]:scroll-mt-16 [&_a]:scroll-mb-2` を追加した。コード差分は `src/app/demo/page.tsx` の1行で、Demo内のanchorへ上96px / sm以上64px・下8px相当のscroll marginを指定する。共通cardと認証済みSaaS・Demo詳細・色 / font / outlineは変更しない。

C22のF1〜F4は**4px余白・部分重なりゼロのプロジェクト条件に対する修正前Failとして維持**する。WCAG AA違反の確定に読み替えず、解消済みPassにしない。修正後のContrastも未測定で、既存の数値結果を流用しない。

対象ESLint、既存mock renderer **12 tests**、Tailwindの3 utilityだけのメモリ内CSS生成、TXT 2件のsyntax、39件のSHA-256 / 構造・参照 / 画像安全確認、既存文書とcheckbox保持、追加表・リンクと `git diff --check` は確認済み。総容量6,342,845 bytes、PNG 32件（28種類）、JSON 5件、TXT 2件。確認範囲で公開commitを妨げる秘密情報・非公開画面は検出せず、4組の画像重複も削除しない。

今回はブラウザ起動・Previewアクセス・app server / production build・外部Source・DB / OAuth / Session / AI / Cloud操作を行っていない。新Previewと配備identityの確認・再検査は別途承認後で、旧Previewの再実行をローカル修正の検証にはしない。Phase 10の受入・既存checkbox・roadmapは変更せず、未コミットで停止する。


<a id="pr-22-browser-retest"></a>

## PR #22 — 修正後PreviewのChromium再検証 C22R（2026-10-20 JST）

**C22R: 今回Codexが実行した独立したブラウザ観測。F1〜F4と15条件の自動検査はPass。ただし配備identity未確認のため暫定結果**とする。修正前C22の4件Fail・測定値・39ファイル、PR #20 / #21の記録は変更していない。今回のPassはプロジェクトの4px余白・部分重なりゼロ条件の判定で、WCAG AA全面適合や知覚上の完全なfocus可視性の宣言ではない。

### 対象・preflight・環境

- 開始branch: `test/demo-contrast-focus-batch`、HEAD: **`1231b5af5bf8cbb03c08424fe51cecae73a359d1`**。`git status --short --branch`に変更なし。worktreeは `C:/Users/owner/Desktop/sm-dev/evidence-atlas` の1件で同branch / HEAD。検査中にアプリを変更していない。
- 対象は [指定の修正後Preview /demo](https://evidence-atlas-git-test-demo-contrast-focus-batch-morimotodev93.vercel.app/demo) のoriginだけ。HTTP **200**、h1=`AI-Assisted Software Development`、Read-only表示、Research list内の4タイトル・4リンク・Demo href形式を確認した。詳細URLは今回の一覧リンクから取得した。
- 公開応答はserver=`Vercel`、`x-vercel-id=kix1::iad1::nqd4v-1792467726390-1d47bc9a4a52`。これはrequest識別子でありDeployment IDとはみなさない。HTML内には **`dpl_67s8akZXvKz2SbuWxHdVSUYQqj2k`** の識別子候補を観測したが、明示的なGit SHA response header / meta / `VERCEL_GIT_COMMIT_SHA`等は得られず、**Deployment IDの正式な確認・`1231b5a`との対応は未確認**。SHA不一致は検出していないが、一致を推測しない。Cloud / GitHub / 管理APIへ照会していない。
- Windows NT `10.0.26200.0`、Node `v24.16.0`、既存 `pnpm@12.9.1`、Playwright **1.63.0** / headless Chromium **153.0.8010.12**。修正前と同じbrowser version / helperを使用。package.json / Playwright設定を確認し、設定のdefault originではなく上記originを一時runnerへ固定した。依存追加なし。
- 実行日時はNode実行時計で **2026-10-20 12:39:44.317〜12:41:50.488 JST**（`03:39:44.317Z`〜`03:41:50.488Z`）。preflightは12:39:50.070 JST。HTTP Dateは `03:42:09 GMT` で実行時計と約139秒差があり、時計同期は独立検証せず、測定時刻をHTTP Dateで補正していない。
- 全条件でLight、実viewport **1280×720 / 375×812 / 768×1024 CSS px**、DPR1、visual viewport scale1、root / body computed zoom1、dark classなし、body背景 `lab(98.2716 0 0)`、IBM Plex Sans / fonts loadedを確認。fresh contextの100%条件で、native browser UIの手動zoom検査ではない。

| ページID | ページ | 今回の実href（上記origin配下） |
| --- | --- | --- |
| L | Research一覧 | `/demo` |
| D1 | Developer Productivity | `/demo/research/v0313wclyankpmyo4ujhmza2` |
| D2 | Code Quality & Reliability | `/demo/research/c3q3cl35ne9iq5yuwxpx7bg5` |
| D3 | Developer Experience | `/demo/research/qyjy9por32pcwpg8mhevznmw` |
| D4 | Adoption & Organizational Impact | `/demo/research/ix53bd2y7be2zmk55h2sypn8` |

### 通信境界と再利用した方法

context全体で**GET・指定originのDemo / Demo詳細・表示用`/_next/static/`・faviconだけ**を許可した。非GET・その他の同一origin path・外部originをabortし、Service Workerをblock、WebSocketをclose、`route.fetch(maxRedirects:0)`とLocation検査で不許可redirectへの追従を防止した。全 **567件の許可GETは200**、通信エラー0。外部Vercel feedback script **35件は送信前に遮断**。外部Source / GitHub / Analyticsへ遷移・送信していない。Source hrefは属性として読み取り、Enter / clickはしていない。

旧 `batch-source.txt` の `install()`（色変換・祖先背景合成・Range clipping・9点hit testing・全fragment＋最低4px余白の処理）を内容変更せずexportして再利用した。今回のrunnerではfocusにcomputed scroll-margin-top / bottom・bounding rectangle・上下余地を追加し、**実Tab操作後にscroll位置 / rectが4フレーム連続で安定するまで待機**した。focusの代入やkeyboard検査中の手動scrollはしない。Normal採取のscroll後は先頭へ戻してreloadし、freshなkeyboard traversalと分けた。

Phase Aは**4ケースそれぞれ新しいcontextとfresh navigation**。F1 / F3はTab×5、F2 / F4はTab×6→Tabでdocument境界→Shift+Tab×4を使用し、全途中target・href・順序も記録した。全4件がPassした後にのみPhase Bへ進んだ。Phase Bは15条件それぞれ新しいcontextで、全リンクをTab順とdocument境界からの完全な逆順で観測した。旧E2Eの成功を流用せず、既存E2E全体も実行していない。

### Phase A — 修正前後の実測比較

F1 / F3の実focusはD3 Developer Experience、F2 / F4はD1 Developer Productivity。全4件でhref・操作順序・`:focus-visible=true`・indicator存在・部分露出・レイアウト安定を確認し、全非空fragmentの上下左右4px余白もPass。実URLは上記新Previewの `/demo`。下表の旧値は保存済み修正前C22、新値は今回の独立観測である。

| ケース / viewport | 採取時刻 JST | 主な改善（旧→新） | rect top / bottom（旧→新） | header.bottom | scrollY（旧→新） | computed margin top / bottom | 結果・画像 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F1 / 1280×720 | 12:39:55.912 | 下端余地 **1→8px** | 561/719 → 554/712 | 49 | 0→7 | 64px / 8px | Pass / [F1](../planning/evidence/pr22-demo-browser-retest/F1.png) |
| F2 / 1280×720 | 12:39:59.131 | header重なり **29→0px**、header下端からの余地 **−29→15px** | 20/178 → 64/222 | 49 | 201→157 | 64px / 8px | Pass / [F2](../planning/evidence/pr22-demo-browser-retest/F2.png) |
| F3 / 375×812 | 12:40:04.106 | 下端余地 **0→8px** | 642/812 → 634/804 | 81 | 47→55 | 96px / 8px | Pass / [F3](../planning/evidence/pr22-demo-browser-retest/F3.png) |
| F4 / 375×812 | 12:40:07.216 | header重なり **9→0px**、header下端からの余地 **−9→15px** | 72/242 → 96/266 | 81 | 253→229 | 96px / 8px | Pass / [F4](../planning/evidence/pr22-demo-browser-retest/F4.png) |

F1 / F3は `bottom+4 <= viewport.height` を満たし、F2 / F4も `top−4 >= header.bottom` を満たした。4枚を今回表示して、cardの上下輪郭と余白を補助的に確認した。画像からindicatorの数値contrastや全条件の知覚適合を推測しない。

### Phase B — 15条件の回帰結果

以下のPassは**focus対象・順逆順序・indicator存在 / 露出・全fragmentの4px余白・横overflowなし・非意図的clippingなし・リンク到達性**の自動判定。全15条件はHTTP 200で期待h1 / Read-only表示を確認し、詳細は4セクションの見出しも確認した。**配備identityは全行でNot verified（結果は暫定）、知覚上の完全な可視性も全行でNot verified**と分ける。時刻は2026-10-20 JST、focus件数は両方向合計。

| ページ | 実viewport | 採取開始 JST | 自動判定（暫定） | focus | Normal Contrast Pass / NV | 意図的省略要素 |
| --- | --- | --- | --- | --- | --- | --- |
| L | 1280×720 | 12:40:09.668 | Pass | 12 | 29 / 4 | 0 |
| D1 | 1280×720 | 12:40:15.266 | Pass | 22 | 53 / 4 | 0 |
| D2 | 1280×720 | 12:40:22.086 | Pass | 24 | 55 / 4 | 0 |
| D3 | 1280×720 | 12:40:29.098 | Pass | 24 | 54 / 4 | 0 |
| D4 | 1280×720 | 12:40:35.949 | Pass | 22 | 54 / 4 | 0 |
| L | 375×812 | 12:40:42.667 | Pass | 12 | 29 / 4 | 5 |
| D1 | 375×812 | 12:40:50.330 | Pass | 22 | 53 / 4 | 2 |
| D2 | 375×812 | 12:40:56.854 | Pass | 24 | 55 / 4 | 1 |
| D3 | 375×812 | 12:41:03.574 | Pass | 24 | 54 / 4 | 2 |
| D4 | 375×812 | 12:41:10.610 | Pass | 22 | 54 / 4 | 0 |
| L | 768×1024 | 12:41:17.986 | Pass | 12 | 29 / 4 | 0 |
| D1 | 768×1024 | 12:41:25.702 | Pass | 22 | 53 / 4 | 1 |
| D2 | 768×1024 | 12:41:32.452 | Pass | 24 | 55 / 4 | 0 |
| D3 | 768×1024 | 12:41:39.202 | Pass | 24 | 54 / 4 | 1 |
| D4 | 768×1024 | 12:41:45.907 | Pass | 22 | 54 / 4 | 0 |

新しいFail / 回帰は今回の測定範囲で0。全 **312観測**（Header 60、一覧card 24、Back 24、Source 72、Supporting Source 132）の対象・href・順序は修正前と一致した。すべて`:focus-visible` / outline / 露出 / 4px余白を確認。main内focusのheader下端からの最小余地は15px、全focusのviewport下端までの最小余地は8px。outlineはauto / 1px / offset 1px、色 `oklab(0.546089 -0.026687 -0.213521 / 0.5)`、shadow none。header高は375幅81px、他49px。

横幅は全行 `scrollWidth=clientWidth=viewport.width`、非意図的clipping 0。375px一覧の4説明clampとD4 titleのellipsis、Source URLのtruncateは修正前と同じ意図的省略として保持し、全文表示Passにしない。各条件でURL不変・popupなし（context内page数1）、Back / Source / Supporting Sourceを実keyboardで到達した。

### 今回のNormal ContrastとNot verified

旧比率の転用ではなく、今回の配信DOMから各文字をscrollしてcomputed foreground・font-size / weight・祖先背景を採取した。旧helperと同じsRGB canvasの8bit変換・既知の不透明面への合成とWCAG比率式を使用し、通常文字4.5:1、実24px以上の見出し3:1で判定した。半透明 / filter / blur / group opacity等を確定できないsampleは数値判定しない。

Normal **795 samples: 735 Pass / 0 Fail / 60 Not verified**。最小の測定値はM前景 `lab(35.5352 -1.674 -13.4708)` ≈ rgb(71 85 105) / body背景 ≈ rgb(250 250 250)の **約7.26:1**。他の今回の代表値は、通常前景rgb(15 23 42) / bodyで17.10、同前景 / 白cardで17.85、M / 白cardで7.58、通常前景 / tag rgb(226 232 240)で14.48。個別font・前景・背景・比率はresultsへ保持した。これは8bit変換を含む近似で、glyphのantialias pixelや物理画面の測色ではない。

60 NVはheader内の半透明背景＋blurを含む文字。**Source Hoverのopacity合成、focus indicatorの実効contrast、他Hover / Focus文字の再測定は今回未実施 / Not verified**。修正前Hover最小値6.69を今回の測定値として扱わない。必要非文字情報全体の3:1、知覚上の完全な可視性、Focus+Hover、空状態 / 無tag / description省略 / 不許可URL等の未表示分岐、dark / 他browser / 支援技術 / SaaS / Chatも未確認のまま。未表示の状態をPassで補完しない。

### 証拠保存・安全確認・オフライン検証

保存先は新規 `docs/planning/evidence/pr22-demo-browser-retest/`、**9ファイル / 1,927,769 bytes（約1.84 MiB）**。F1〜F4のPNG 4枚だけで重複画像なし。`results.json`にpreflight・環境・実URL・全時刻・前後比較・全15条件の個別focus / 通常色 / clipping観測を保持し、祖先背景だけ`backgroundChainId`で89件の辞書に重複排除した。raw観測との全値一致を検査した。通信はpath別 / status別集計だけで、query・request header・巨大な逐次ログは保存しない。

- [summary.json](../planning/evidence/pr22-demo-browser-retest/summary.json): 比較・15条件集計・暫定identity・未確認条件・通信集計。
- [results.json](../planning/evidence/pr22-demo-browser-retest/results.json): 個別観測とpreflight。背景辞書IDの参照795件を検算。
- [runner-source.txt](../planning/evidence/pr22-demo-browser-retest/runner-source.txt) / [helper-source.txt](../planning/evidence/pr22-demo-browser-retest/helper-source.txt): 今回実行した一時runnerと再利用helperのsnapshot。
- [sha256.json](../planning/evidence/pr22-demo-browser-retest/sha256.json): 自身を除く8件の名前・容量・SHA-256。

JSON / TXTのparse・syntaxと文字列 / URL / credential形式 / cookie・認証header等の検査で秘密情報・非公開メールは検出していない。保存URLにquery / userinfoなし。response headerは公開情報の限定keyのみ。4 PNGは全画像を表示し、Public Demo以外の非公開画面・認証情報・desktop映り込みは観測せず、text / EXIF等の付加metadataも0。証拠内のSource hrefは公開表示文字列であり、外部取得結果ではない。

オフライン確認は、新旧manifestと旧39件の全開始時hash一致、既存2文書のbyte prefix保持、保護対象（アプリ・既存E2E・依存 / 設定・roadmap・Phase 10）不変、rawと保存JSONの一致、F1〜F4の実href・操作順・全fragment、15条件 / 312観測の順逆順序・viewport・比率・件数検算、PNG容量 / 重複 / SHA、追加表・相対リンク、`node --check`、`git diff --check`。アプリテスト / buildを実行した報告ではない。

### マージ判断と残る条件

**ブラウザの限定した自動検査は全Passで、観測したPreviewでは一覧4件の症状は再現しなかった。ただしPR #22の無条件マージ可の確定判断は保留する。** 採取時のDeployment識別子候補を修正commit `1231b5a` に対応づける証拠が残る。branch aliasが別配備へ変わった場合はこの結果をそのまま転用せず、対象identityを固定して再評価する。知覚可視性・contrastのNot verifiedを含むPhase 10 Accessibility / Responsive全体は未完了のまま。

変更は既存レビュー2文書の末尾追記と上記新証拠だけ。アプリ・既存テスト・依存・Phase 10文書・roadmap / checkboxは変更していない。DB / OAuth / Session / AI API、Cloud設定 / deploy、server / production build、外部サイトへの遷移、commit / push / PR作成 / mergeは実行せず、**未コミットで停止する**。

<a id="pr-22-deployment-identity-2026-10-22"></a>

### 後日補足 — Deployment / Commit / Preview aliasの直接照合（2026-10-22）

ユーザー提供の独立確認結果として、**2026-10-22にChatGPTがGitHubおよびVercelの読み取り専用連携で直接照合した対応関係**を追記する。本追記作業で外部連携への再照会や新しいブラウザ検査は行っていない。

| 項目 | 2026-10-22の直接照合結果 |
| --- | --- |
| Repository / PR | `morimotodev93/evidence-atlas` / [PR #22](https://github.com/morimotodev93/evidence-atlas/pull/22)、Open |
| Branch | `test/demo-contrast-focus-batch` |
| GitHub PR HEAD（full SHA） | `1231b5af5bf8cbb03c08424fe51cecae73a359d1` |
| Vercel project | `evidence-atlas` |
| Deployment ID / status | `dpl_67s8akZXvKz2SbuWxHdVSUYQqj2k` / READY（[Deployment記録](https://vercel.com/morimotodev93/evidence-atlas/67s8akZXvKz2SbuWxHdVSUYQqj2k)） |
| Vercel記録のGit commit SHA | `1231b5af5bf8cbb03c08424fe51cecae73a359d1`。GitHub PR HEADと完全一致 |
| Preview alias | `evidence-atlas-git-test-demo-contrast-focus-batch-morimotodev93.vercel.app` |
| alias照会先のDeployment ID | `dpl_67s8akZXvKz2SbuWxHdVSUYQqj2k`。上記Deployment IDと一致 |

根拠はVercel `get_deployment`のgit metadataとalias、Vercel `get_alias`のDeployment ID、GitHub PR #22のHEADとcommit status、およびPR #22のVercel公式BotによるDeployment記録。修正commit・Deployment ID・Preview aliasの対応が独立に確認され、Deployment IDはC22RでHTML中に観測した識別子候補とも一致する。

**証拠の限界:** これは2026-10-22時点の直接照合であり、2026-10-20のCodex検査時点にブラウザへ配信されたバイト列を直接取得・保存した証拠ではない。検査時点の「Deployment identity未確認」・暫定結果・マージ判断は当時の履歴として保持し、後日の対応確認で遡及的に書き換えない。F1〜F4の実測値、15/15の自動判定結果、Contrast等のNot verified、Phase 10 Accessibility / Responsiveの未完了とcheckboxは変更しない。

本追記のオフライン確認では、新証拠9件の名称・容量（合計1,927,769 bytes）、保存済みSHA-256 manifestの8件の一致、manifest自身を含む9件の作業前後hash不変、既存2文書の追記前byte prefix、文書リンク・表・既存履歴、`git diff --check`を確認した。追記対象以外の追跡済みファイルは不変。証拠の削除・上書き、アプリ・テスト・依存・roadmapの変更、新しいテスト・ブラウザ操作・Vercel操作・deploy、commit / push / mergeは行わず、未コミットで停止する。
