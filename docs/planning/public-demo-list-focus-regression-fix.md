# PR #22 — Research list focus regressionのオフライン修正

記録日: 2026-10-20 JST。**ローカル修正済み・ブラウザ再検証待ち**。本作業ではブラウザ・Preview・外部Sourceへアクセスしていない。[C22ブラウザ検査](public-demo-contrast-visible-focus-review.md#pr-22-codex-browser-batch)の4件のFail・色測定・画像・Not verifiedは修正前の証拠として保持し、Passへ変更しない。**4px余白・部分重なりゼロというプロジェクト条件のFailであり、WCAG AA違反の確定ではない。**

## 開始状態と証拠保全

- branch: `test/demo-contrast-focus-batch`、HEAD: `c6d97caac748457bcaa042eda883ff342fffe9f8`。
- worktree: `C:/Users/owner/Desktop/sm-dev/evidence-atlas` の1件、同branch / HEAD。
- 開始時のtracked変更は `docs/planning/phase10-quality-acceptance.md`（31行追記）、`docs/planning/public-demo-contrast-visible-focus-review.md`（161行追記）。untrackedは `docs/planning/evidence/pr22-demo-browser-review/` の39ファイルのみ。想定外の変更なし。
- 上記2文書の開始時byte列と証拠39件の名前・bytes・SHA-256をgitignore対象の一時領域へ記録した。既存文書へは末尾追記だけを行い、証拠は削除・移動・改変していない。manifestの記録対象38件を照合し、manifest自体も開始時digestとの一致を検査した。

## 4件のFailと原因

共通の修正前条件はheadless Chromium 153.0.8010.12 / Playwright 1.63.0、Light、zoom 100%相当・DPR1、2026-10-20 JST。対象は [C22の実一覧URL](https://evidence-atlas-git-docs-demo-contrast-visi-627546-morimotodev93.vercel.app/demo)。これは既存証拠の参照で、今回のアクセス先ではない。SourceリンクやGitHubへ遷移せず、fresh documentの実Tab / Shift+Tabを使った測定である。

| Fail | 実viewport / 採取開始 JST | 対象・方向 | 修正前実測 / 期待条件 | 再現操作 |
| --- | --- | --- | --- | --- |
| F1 | 1280×720 / 12:00:00.709 | Developer Experience / Tab | bottom719、scrollY0、下端余地1px。`bottom+4=723 <= 720` を満たさない | fresh `/demo`、Tab×5（Header 2件→一覧3件目） |
| F3 | 375×812 / 12:00:45.147 | Developer Experience / Tab | bottom812、scrollY47、下端余地0px。`bottom+4=816 <= 812` を満たさない | fresh `/demo`、Tab×5 |
| F2 | 1280×720 / 12:00:00.709 | Developer Productivity / Shift+Tab | top20、scrollY201、header下端49、上29pxがheader下。`top-4=16 >= 49` を満たさない | Tab×6でD4→Tabでdocument境界→Shift+Tab×4でD1 |
| F4 | 375×812 / 12:00:45.147 | Developer Productivity / Shift+Tab | top72、scrollY253、header下端81、上9pxがheader下。`top-4=68 >= 81` を満たさない | Tab×6→Tabでdocument境界→Shift+Tab×4 |

Fail画像は [F1](evidence/pr22-demo-browser-review/L-1280-forward-4.png) / [F3](evidence/pr22-demo-browser-review/L-375-forward-4.png) / [F2](evidence/pr22-demo-browser-review/L-1280-reverse-3.png) / [F4](evidence/pr22-demo-browser-review/L-375-reverse-3.png)。4件ともfocus対象・順序・`:focus-visible`・computed indicator・部分露出のassertionは成功し、完全遮蔽は検出していない。上端の部分遮蔽は画像でも確認できる。下端は最低4pxの保守的余白条件を満たさない観測であり、実paint面積やAA違反の確定ではない。

### 実装差分との照合

- `src/app/demo/layout.tsx` のheaderは `sticky top-0 z-10` で、幅による折返しがある。修正前の実測高は375pxで81px、1280 / 768pxで49px。
- `src/components/research/research-list-items.tsx` のcard全体が1リンクで、scroll margin指定はない。`/demo/research` と認証済み `/research` が共用するため、ここへ一律にDemo用header寸法を入れる必要はない。
- 修正前の `src/app/demo/page.tsx` のmainにはanchor向けscroll marginがなく、詳細のmainには `[&_a]:scroll-mt-24 sm:[&_a]:scroll-mt-16 [&_a]:scroll-mb-2` がある。
- 詳細では既存C22のBack / Source / Supporting Sourceの全fragment＋4px余白検査が成功しており、一覧で不足した上下の余白を明示する既存手法がある。
- `e2e/public-demo.spec.ts` の一覧はfocusと部分露出を検査するが、厳密な全fragment＋4pxのhelperはSource向けで、一覧には適用していない。このため既存の部分露出assertionの成功とC22の4件Failは矛盾しない。既存E2Eは今回変更・実行していない。

原因判断: sticky overlayとoutline余白が一覧のkeyboard auto-scrollに考慮されるような明示指定がなく、ブラウザがcard本体を露出させても上部がheader下、又は下端がviewport端に寄る。outlineはauto / 1px / offset 1pxで、全非空fragmentに最低4px余白を加えるプロジェクト検査は本体の部分露出より厳しい。**この実装差と既存観測はscroll marginの局所修正を選ぶ十分な根拠であるが、修正後の挙動の実証ではない。** 配備SHA未確認のためローカルHEADと修正前Previewの完全一致も推測しない。

## 最小修正と影響範囲

コード変更は `src/app/demo/page.tsx` のmainのclassName **1行のみ**。既存の `ResearchListItems` をそのまま使い、詳細と同じ3 utilityをDemo一覧内のanchorへ適用した。

```text
[&_a]:scroll-mt-24 sm:[&_a]:scroll-mt-16 [&_a]:scroll-mb-2
```

既存Tailwind 4.3.3の `--spacing: 0.25rem` / `--breakpoint-sm: 40rem` では、上6rem、sm以上で上4rem、下0.5remとなる。root 16px換算で **上96px / 64px・下8px**。C22で観測したheader 81px / 49pxに最低4pxを加えた85px / 53pxより余裕を持ち、下8pxも最低4pxより大きい。これは静的な設計値の照合であり、実auto-scrollでの修正成功を意味しない。

適用範囲はDemo一覧main配下のリンク。headerのリンクはmain外にある。共通card、認証済みSaaSのResearch一覧、Demo詳細、global CSS、色・font・outline・通常レイアウト・href・Tab順序・データ取得処理は変更していない。新しい抽象化・依存追加なし。scroll marginは通常flowの余白ではなくscroll時の対象領域を調整する指定で、今回の既存Contrast比率を修正後の測定値として転用しない。

## オフライン検証

| 確認 | 今回の結果・限界 |
| --- | --- |
| `pnpm --version` | 宣言と同じ12.9.1。依存追加・installなし |
| `pnpm exec eslint src/app/demo/page.tsx` | exit 0、指摘なし。対象コードのみ |
| `pnpm exec vitest run src/app/demo/pages.test.ts --maxWorkers=1 --no-file-parallelism` | **1 file / 12 tests Pass**。既存rendererはDemo read / auth / next navigation等をmockし、DB・Session・ネットワークを使わない。初回はesbuild子プロセスの`spawn EPERM`で開始前に失敗し、権限付き再試行で成功した |
| Tailwind utilityのメモリ内生成 | 既存compiler・theme値と3 utilityだけで378-byte CSSを生成。anchor descendant selector、sm media query、上下scroll-margin宣言を確認。アプリのbuild / サーバー / ブラウザではない |
| TXT source snapshotのsyntax | 一時 `.mjs` コピーを `node --check` し2件成功。sourceは実行していない |
| 証拠・履歴保持 | 39件の開始時hash・manifest照合、JSON参照・集計・画像参照、既存2文書のbyte prefix、保護対象ファイル・既存checkbox保持を確認 |
| 文書・Git | 追加表の列数・相対リンク・inventory容量、`git diff --check`を確認 |

新しいappテストやE2Eケースは追加していない。小規模CSS生成確認の初回では検査側がnested selector出力を想定して失敗したが、既存compilerが出力するflattened descendant selectorを確認し検査側を修正した。アプリ修正に起因する失敗ではない。全体lint / 全体型検査 / 全E2E / production buildは実行していない。

## 証拠39件の安全性・構造・必要性

**合計6,342,845 bytes（約6.05 MiB）**。PNG 32件 / 3,831,866 bytes、JSON 5件 / 2,491,822 bytes、TXT 2件 / 19,157 bytes。全件の名称・容量は末尾表に保持する。

- JSON 5件はすべてparse可能。`measurements`は15条件・全sample・4 failures・背景辞書124件、`summary`は15条件の派生集計、`network`は許可 / 遮断 / response / errors、`preflight`は環境・応答headers・4一覧href、`sha256`は自身を除く38件の名前・bytes・digest配列。背景辞書ID・画像パス計1,584参照の存在・範囲、集計値と個別観測の一致、manifestの全38件を検算した。
- manifest自体の開始時SHA-256は `0b11b53f88168568208e1c1bb11774bfd1d19ce8c40be2327f83198abe940b38`。自己hashをmanifestへ追加しない。39件すべての開始時digestと作業後digestを比較し不変を確認した。
- TXTはUTF-8のES module source snapshotで、Playwrightの起動・通信制限・採取方法を含む。構文確認のみで実行しない。API key・credential埋込みは見つかっていない。
- JSON / TXT全体の文字列・key・URLを検査した範囲では、URL userinfo、署名URL、API key / JWT / Bearer / private key、password / secret / cookie / authorization値、非公開メールアドレス等は見つかっていない。URLは指定Preview / 公開Source・GitHub / 遮断されたVercel feedback等。queryは `_rsc` だけで、NextのRSC cache識別用の短い値と判断した。Source URLは既存文字列として確認し、外部へアクセスしていない。
- 保存されたheadersはpreflightの**response headers** 15 keyだけで、request header dumpはない。`authorization` / `cookie` / `set-cookie`等はない。`x-vercel-id`は公開応答のrequest識別子で、秘密の認証情報・Deployment IDとしては扱わない。日時・browser UA・公開Preview / Research ID等の実行情報は保持されている。
- PNG 32件はSHA重複を除く**全28画像を今回表示して確認**した。同一bytesの残り4件もhash一致で同じ内容を確認できる。Public Demoのカード・公開Source情報・demo名義のDiscussion以外の非公開情報、認証画面、メール、secret、OS desktop / browser chromeの映り込みは観測していない。PNG chunkも検査し、text / EXIF等の付加metadataは0件。

**公開Repositoryへの内容面の判断:** 上記のローカル確認範囲で公開commitを妨げる秘密情報・非公開画面は見つからず、39件とも証拠として含められると判断する。配備SHA・元データの由来や第三者資料の権利をこの検査で独立認証したものではないが、公開可否を保留する具体的な秘密情報は検出していない。本作業ではcommitしない。

### 必要性と重複

- 4枚の一覧Fail画像、`measurements` / `summary` / `sha256`が不具合・値・整合性の中心証拠。`preflight` / `network`は環境・対象・GET-only境界、TXT 2件は採取方法を監査する補助証拠。
- Normal 15枚は5ページ×3幅の修正前baseline、D1 focus sample 12枚はSource / Supporting Sourceの方向別baseline。今回の一覧修正の原因説明には全数必須ではないが、元batchの範囲・限界の確認に役立つ。新しい修正後の証拠にはしない。
- bytesが同じ4組: `D1-1280-forward-10.png` / `D1-1280-reverse-0.png`、375幅の同組、768幅の同組、`L-1280-normal.png` / `preflight.png`。重複分は342,032 bytes。画像情報として冗長でも、順方向・逆方向・preflightという取得文脈が異なる。**削除・移動・改変しない**。
- `summary`と`measurements`内の集計・failuresにも重複があるが、前者は参照しやすい派生記録、後者は対象・方向と詳細観測を保持する原記録として区別する。

## ブラウザ再検証待ち・未確認事項

新Previewへの配備とブラウザ実行は別途承認後に行う。**修正を含む新PreviewのURL・Deployment ID・配備SHAを確認できること**が前提で、既存Previewへの再実行でローカル修正を検証したことにしない。

再検査では5ページ×3 viewportを同じbatch条件で記録し、特に一覧4リンクとheaderの順逆Tab、document境界からの逆順、F1〜F4の操作、768pxの非回帰、詳細のBack / Source / Supporting Sourceを確認する。pointerは外し、途中のfocus代入・手動scrollを使わず、実auto-scrollの全fragmentが `top-extent >= header.bottom` / `bottom+extent <= viewport.height`（extent最低4px）を満たすか採取する。横overflow・clipping・header高・computed scroll margin・outline / shadowと画像も記録する。Source / GitHubの外部遷移はしない。

今回未確認なのは、修正後の4件解消・実際の配備 / computed CSS・知覚上の可視性・contrast全状態。従来のheader blur / Source hover opacity / focus indicatorの合成色、未表示分岐、dark / 他browser / 支援技術、通常SaaS / Chat等のNot verifiedもそのまま残す。**Phase 10 Accessibility / Responsiveは未完了で、checkbox・roadmapは変更しない。**

## 証拠ファイル名・容量一覧

以下は既存ディレクトリ内の39件で、この文書は証拠ディレクトリ外に追加した。容量は圧縮後のdisk使用量ではなくファイルのbyte長。

| ファイル | bytes | 主な役割 |
| --- | --- | --- |
| D1-1280-forward-10.png | 72196 | Focus baseline |
| D1-1280-forward-3.png | 73515 | Focus baseline |
| D1-1280-normal.png | 204861 | Normal baseline |
| D1-1280-reverse-0.png | 72196 | Focus baseline |
| D1-1280-reverse-5.png | 78567 | Focus baseline |
| D1-375-forward-10.png | 65434 | Focus baseline |
| D1-375-forward-3.png | 62748 | Focus baseline |
| D1-375-normal.png | 191494 | Normal baseline |
| D1-375-reverse-0.png | 65434 | Focus baseline |
| D1-375-reverse-5.png | 64153 | Focus baseline |
| D1-768-forward-10.png | 109912 | Focus baseline |
| D1-768-forward-3.png | 103553 | Focus baseline |
| D1-768-normal.png | 200614 | Normal baseline |
| D1-768-reverse-0.png | 109912 | Focus baseline |
| D1-768-reverse-5.png | 117029 | Focus baseline |
| D2-1280-normal.png | 177926 | Normal baseline |
| D2-375-normal.png | 166315 | Normal baseline |
| D2-768-normal.png | 177586 | Normal baseline |
| D3-1280-normal.png | 198242 | Normal baseline |
| D3-375-normal.png | 183539 | Normal baseline |
| D3-768-normal.png | 192261 | Normal baseline |
| D4-1280-normal.png | 169376 | Normal baseline |
| D4-375-normal.png | 161015 | Normal baseline |
| D4-768-normal.png | 168229 | Normal baseline |
| L-1280-forward-4.png | 76659 | Fail F1 |
| L-1280-normal.png | 94490 | Normal baseline |
| L-1280-reverse-3.png | 73820 | Fail F2 |
| L-375-forward-4.png | 65830 | Fail F3 |
| L-375-normal.png | 81852 | Normal baseline |
| L-375-reverse-3.png | 63308 | Fail F4 |
| L-768-normal.png | 95310 | Normal baseline |
| batch-source.txt | 14711 | 採取source snapshot |
| measurements.json | 2275857 | 構造化記録 |
| network.json | 189342 | 構造化記録 |
| preflight.json | 2227 | 構造化記録 |
| preflight.png | 94490 | preflight画像 |
| runner-source.txt | 4446 | 採取source snapshot |
| sha256.json | 5490 | 38件のmanifest |
| summary.json | 18906 | 構造化記録 |
| **合計39件** | **6342845** | 変更なし |
