# Public Demo — Contrast / Visible Focus Review（PR #20準備）

記録日: 2026-10-20 JST。静的調査と後日の手動検査計画であり、ブラウザ検査・色実測の成功報告ではない。[Phase 10受入条件](phase10-quality-acceptance.md)を補う。**Accessibility review / Responsive UI reviewは未完了。**

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
- 一次資料: [roadmap](roadmap.md)、[Phase 10受入条件](phase10-quality-acceptance.md)、[zoom / text spacingレビュー](public-demo-zoom-text-spacing-review.md)、[design system](../design/design-system.md)。
- 外部調査方針: [source-memo](source-memo.md)。外部参照は第4節のW3C公式仕様に限定し、配備先・外部リンク先は調べていない。

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
