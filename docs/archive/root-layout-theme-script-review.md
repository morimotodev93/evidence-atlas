# PR #47: RootLayout theme script investigation

調査日: 2026-10-29 (Asia/Tokyo)。開始時点は `main` / `a66ed16` / clean。

結論: **アプリコードは変更しない。Console Errorの解消は未確認。**
`next/script`への単純置換では、既存の初回テーマ適用と不正保存値の処理順序を維持できず、警告の発生源もRootLayoutの1タグに限定できないため、今回の最小修正として採用しない。

## 確認したローカル一次資料

- `src/app/layout.tsx`, `src/lib/theme.ts`, `src/components/theme-provider.tsx` とテーマ関連テスト。
- インストール済み Next.js **16.3.8**:
  - 同梱React / React DOMは **19.3.0-canary-cbb046ab-20260731**。アプリの直接依存React / React DOM **19.2.8**と区別し、ブラウザfixtureではNext同梱版へaliasした。
  - `node_modules/next/dist/client/script.d.ts`: `ScriptProps`のstrategyとinline scriptの型。
  - `node_modules/next/dist/client/script.js`: App Routerのinline `beforeInteractive`は本体を直接実行せず、`self.__next_s`へ登録する。
  - `node_modules/next/dist/client/app-bootstrap.js`: キューのスクリプトを順番にDOMへ追加して実行し、その後hydrationを呼ぶ。
  - `node_modules/next/dist/client/app-index.js`: 通常の`hydrateRoot`と、サーバー描画失敗時の`createRoot`フォールバック。
  - `node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js`: `script`のクライアント新規作成時に報告された警告を出し、`innerHTML`経由で作った非実行script要素を使用する。data blockは別扱い。`suppressHydrationWarning`はこの警告の抑制条件ではない。
- インストール済み `next-themes` **0.4.6**の`dist/index.mjs`: Provider自身も同期inline scriptをSSR出力する。初回scriptはlocalStorageを読み、Systemを解決してHTMLクラスとcolorSchemeを設定する。クライアントの切替・OS追従は別のeffectで処理する。
- `next.config.ts`, `tsconfig.c2.json`, `src/lib/c2/app-font.ts`: C2も同じRootLayoutとThemeProviderを使う。C2のaliasはfont等を差し替えるが、テーマ初期化は差し替えない。

外部サイト・外部サービスは参照していない。上記は、このインストール済みバージョンについての実装確認であり、他バージョンの仕様保証には一般化しない。

## 原因と再現条件

既存のSSR実行順序は、保存値検証script → next-themesの初回テーマscript → Providerのクライアント初期化。検証script自体はテーマを設定せず、不正な保存値を除去する。

隔離Chromiumで、SSR HTMLを解析した後の通常hydrationでは警告を再現しなかった。同じRootLayoutを`createRoot(document)`でクライアント新規描画すると、報告された警告を再現した。RootLayoutの検証scriptだけを除いた比較でも、next-themes自身のscriptで同じ警告を再現した。Reactはこの警告を一度だけ出すため、RootLayoutが最初のスタック表示元でも、唯一の発生源とは判断できない。

**実際のPublic Demoでどの経路によりクライアント新規作成が発生したかは未特定。** サーバー描画失敗、hydration回復、再マウント等は調査候補であり、この実行で実環境の原因として確認したものではない。警告だけを根拠にSSRのテーマscriptが実行されなかったとは判断しない。

## 候補を採用しない理由

`next/script`の`beforeInteractive`はhydrationより前の実行を提供するが、既存next-themesのparser実行scriptより前とは限らない。RootLayoutの検証タグだけをinline `beforeInteractive`へ置き換え、App Routerと同じ`HeadManagerContext` (`appDir: true`)でSSRした比較では、保存値`old`・OS Darkに対し、HTML解析後・Nextのクライアントbootstrap前に次を観測した。

```text
html.className = "c2-system-font antialiased old"
html.style.colorScheme = ""
localStorage.theme = "old"
self.__next_s.length = 1
```

検証はキュー待ちだが、next-themesは既に不正保存値を適用している。これは現行のSystemフォールバックを壊す。`beforeInteractive`という名前やhydration前という保証だけでは、first-paint script同士の順序を保証できない。`afterInteractive`やeffectへの移動も既存scriptより後になるため採用しない。RootLayout側だけの変更ではnext-themes側のクライアント新規script警告も残る。

Providerの初回scriptを置き換える等の変更は、初期テーマ処理を含む別の設計・検証が必要になる。この調査ではライブラリの内部scriptの無効化、警告抑制、依存更新を行わない。

## 検証結果と限界

| 検証 | 結果 |
| --- | --- |
| 関連Vitest | `pnpm exec vitest run src/components/theme-provider.test.tsx src/components/appearance-select.test.tsx`: 2 files / 15 tests成功 |
| 通常TypeScript | `pnpm exec tsc --noEmit --incremental false`: 成功 |
| C2 TypeScript | `pnpm exec tsc --project tsconfig.c2.json --noEmit --incremental false`: 成功 |
| ESLint | layout / theme / provider / appearance-selectと関連テストの6ファイル: 成功 |
| whitespace | `git diff --check`: 成功 |
| Chromium: 現行SSR → hydration | 保存値なし、Light、Dark、System、`old`、`dark light`、`__proto__`、空文字 × OS Light/Darkの16ケース成功 |
| Chromium: 切替・OS追従 | 上記各ケースでDark → Light → Systemをクリックし、続けてOS配色を反転。HTMLのcolorScheme更新を確認 |
| Chromium: Console / hydration | 上記16ケースでconsole error、page error、recoverable hydration errorなし |
| Chromium: クライアント新規描画 | 現行RootLayoutと検証script除去版の両方で報告された警告を再現 |
| Chromium: beforeInteractive候補 | 前述の初期実行順序の問題を確認。不採用 |

ブラウザ検証は、インストール済みPlaywrightのheadless ChromiumとNext同梱React / React DOMを用いた**隔離fixture**。実RootLayout・ThemeProviderをメモリ内でバンドルし、HTMLはSSR出力をroute fulfillmentで配信した。fontだけは既存C2のローカルfontモジュールへaliasし、CSSは読み込まない。外部リクエストは遮断し、通常16ケースでは想定外リクエストもなかった。初期確認はHTML解析後・hydration前のclass/colorSchemeであり、実画面のfirst paintの時刻測定・ちらつきの視覚検査ではない。ブラウザfixtureは調査用一時ファイルとして実行し、成果物には含めない。

Vitestとfixtureの初回実行はsandboxの子プロセス起動制限（`spawn EPERM`）で起動できず、許可されたsandbox外実行で完了した。fixture作成中のReact二重ロードはaliasとバンドル方法を修正してから、上記結果を取得した。

実Public Demo・通常SaaS・C2アプリのE2E、実リロード/ルート遷移、実配備CSP、nonce/hash制約、画面のちらつきは未確認。CSP設定は調査対象のアプリコードに見つからなかったが、実配備ヘッダーにCSPがないという証明ではない。候補ではキュー用inline内容と動的script挿入が変わるため、既存のhashやnonce方針との互換性も別途確認が必要。

アプリコードを変更していないため、既存のLight / Dark / System、ストレージキー、テーマ切替、SSR markup、CSPおよび実行順序に変更はない。共有RootLayout由来の警告リスクはPublic Demo・通常SaaS・C2すべてで残る。今回の隔離再現を実アプリでの解消確認として扱わない。

Production Build、DB / Groq / Redis / Turnstileへの接続、公開フラグ変更、ブランチ変更、Git add / commit / push / mergeは行っていない。ロードマップの完了条件は変更しない。
