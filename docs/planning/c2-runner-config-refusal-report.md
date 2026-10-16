# C2 Smoke / Chat 設定拒否の原因調査レポート

調査日: 2026-10-16 JST。対象: 提供された実行ログと、調査時の checkout `111edba`。
確認環境: Windows、Node.js `v24.16.0`、pnpm `12.9.1`、インストール済み `@playwright/test` / `playwright` `1.63.0`。

## 結論

**両スイートに共通する、ブラウザー設定と検査コードの不整合をオフラインで再現した。**

Smoke / Chat のプロジェクト設定は `devices["Desktop Chrome"]` を展開している。
このデバイス設定には `defaultBrowserType: "chromium"` がある一方、
`browserName` の明示値はない。実際の Playwright 設定ローダーが生成した
`FullConfig.projects[0].use.browserName` も `undefined` だった。

しかし、共通の `requireC2Config()` は `use.browserName === "chromium"` を必須としている。
したがって、現行設定は必ずこの条件で拒否される。両スイートとも、読み込んだ設定の
メモリ上の値に **`browserName: "chromium"` だけ** を追加すると、同じ検査に通過した。
原因はアプリケーションの画面テストより前の設定検査にある。

この調査では原因確認と修正案の提示までを行い、実装は変更していない。
修正後のブラウザー起動や E2E 成功は未検証である。

## 提供ログの判定

以下はユーザー提供ログの解釈であり、実 DB や HTTP に再接続して追認した結果ではない。

| 観測 | 判定と範囲 |
| --- | --- |
| `Create exit: 0`、session created | Route B のセッション作成 CLI が成功を報告。Google OAuth は実施されていない。 |
| `Preflight exit: 0` | 独立した HTTP/session preflight が成功。実装上、期待ユーザーの session、Google provider 設定、Inngest 無効化、Workspace の HTML 表示などを検査する。 |
| 両方で `CONFIG_ENTERED` → `CONFIG_REFUSED` | 共通 global setup に入り、`requireC2Config()` の検査中に拒否された。 |
| `CONFIG_OK` / `STATE_OK` / `PREFLIGHT_OK` がない | 子 runner 内の設定検査後の認証状態読み込み、HTTP preflight には到達していない。独立 preflight の成功とは別の段階。 |
| `CASES_ZERO` | この失敗では global setup がテストファイルの読み込みより先に停止した。テストファイルが存在しないことの証明ではない。 |
| `RUNNER_SETUP_ERROR` / `RUNNER_FAILED` / `CHILD_NONZERO` | 設定拒否に続く reporter と親 CLI の失敗通知。各々が別の根本原因を表すものではない。 |
| `Smoke exit: 1` / `Chat exit: 1` | Smoke 4 件・Chat mock 6 件の成功は確認されていない。今回のログはシナリオ実行前の失敗を示す。 |
| `Revoke exit: 0`、state file removed、`Auth state exists: False` | revoke CLI は対象セッションの失効処理と state ファイル削除の成功を報告。最終確認時のファイル不存在とも整合する。全認証行の監査結果ではない。 |
| `mode: "verify", present: 8, plannedInserts: 0, plannedDeletes: 8`、exit 0 | fixture 検査は 8 件の存在・期待値一致などを確認して成功。`plannedDeletes: 8` は共通サマリーの既存件数であり、この verify による削除実行数ではない。 |

`PostgreSQL container identity is not proven.` は、HTTP preflight が証明できる範囲を示す
成功時の定型メッセージである。コンテナー同一性の失敗を検出したメッセージではなく、
今回の `CONFIG_REFUSED` の直接原因でもない。コンテナー同一性の現在の状態は本調査では未確認。

## 原因のコード上の根拠

1. [Smoke 設定](../../playwright.c2.config.ts) の末尾は次の定義になっている。

   ```ts
   projects: [{ name: "c2-chromium", use: { ...devices["Desktop Chrome"] } }],
   ```

2. [Chat 設定](../../playwright.c2.chat.config.ts) は Smoke を継承するが、
   `projects` は独自に定義し直している。こちらにも `browserName` の明示値はない。

   ```ts
   { name: "c2-chat-chromium", use: { ...devices["Desktop Chrome"] } },
   ```

3. [global setup](../../e2e-c2/global-setup.ts) の 22 行目は、
   `use.browserName !== "chromium"` の場合に `refuse("configuration")` を実行する。
   この例外が 29–30 行目で捕捉されて `CONFIG_REFUSED` にまとめられる。
   `loadC2State()` と `preflight()` はその後にあるため、拒否時には実行されない。

4. インストール済み Playwright の `lib/common/index.js` は、
   `FullProjectInternal` で設定の `use` をマージするが、fixture のデフォルト値を
   すべて `use` の明示プロパティへ展開する処理ではない。
   `lib/index.js` の 187–188 行目では、実行時 fixture として
   `browserName` が `defaultBrowserType` から決まる定義になっている。
   **実行時 fixture のブラウザー種別と、設定オブジェクトの明示値を混同した検査**である。

5. Playwright `lib/runner/index.js` の 6946–6953 行目では、通常実行は
   global setup → test load の順になっている。一方 `--list` は global setup を実行しない。
   過去の `--list` 成功だけでは今回の不整合を検出できない。

## オフライン再現結果

Playwright 自身の `configLoader.loadConfigFromFile()` で実設定を読み込み、
実際の `requireC2Config()` に渡した。global setup 本体や E2E runner は呼び出していない。
環境変数は子 Node プロセス内だけで検査用に整え、設定の変更もメモリ上だけに限定した。

| スイート | 読み込まれた `testMatch` | `use.browserName` | `use.defaultBrowserType` | 元設定 | `browserName` だけ追加後 |
| --- | --- | --- | --- | --- | --- |
| Smoke | `authenticated-smoke.spec.ts` | `undefined` | `chromium` | `configuration` で拒否 | 通過 |
| Chat | `chat.spec.ts` | `undefined` | `chromium` | `configuration` で拒否 | 通過 |

両方について Node.js の `assert` で元設定の拒否理由と追加後の通過を検証し、終了コードは 0。
同じ現象は `FullConfigInternal` による設定構築でも再現した。
`testMatch` は期待する文字列のままであり、この環境で配列への変換が拒否原因になっているわけではない。

再現用の中核処理は以下。`configLoader` はインストール済み Playwright の
`lib/common/index.js` から、`requireC2Config` は本リポジトリの global setup から読み込んだもの。
Chat では別途 `C2_E2E_ALLOW_CHAT_MOCK=1` を検査用プロセス内に設定した。

```ts
const { config } = await configLoader.loadConfigFromFile(file);
const use = config.projects[0].use;
assert.equal(use.browserName, undefined);
assert.equal(use.defaultBrowserType, "chromium");
assert.throws(() => requireC2Config(config), /C2 E2E refused: configuration\./);
config.projects[0].use = { ...use, browserName: "chromium" };
assert.doesNotThrow(() => requireC2Config(config));
```

この確認は現行 checkout について原因を立証する。提供ログには当時の全設定値がないため、
実行時に別の不正設定も併存していなかったことまでは断定しない。

## 既存テストで見逃した理由

[suite-selection テスト](../../scripts/c2-playwright-suite-selection.test.ts) の
`fixtureConfig()` は `browserName: "chromium"` を最初から含む手作りの `FullConfig` を返す。
実設定も import するが、検査関数に渡すのはその手作り設定である。
[既存 C2 テスト](../../scripts/c2-playwright.test.ts) の 429 行目も同じ明示値を含む。

このため、手作り設定の検査成功と実際の Playwright 設定の検査成功に差が生じた。
既存テストの意図する「解決済み設定」のモデルが、実ローダーの出力に一致していない。

## 推奨修正と確認方法

最小の修正案は、**両方**のプロジェクトの `use` にデバイス設定の展開後で
`browserName: "chromium"` を明示すること。

```ts
use: { ...devices["Desktop Chrome"], browserName: "chromium" }
```

Chat は `projects` を上書きしているため、Smoke のプロジェクトだけを直しても Chat には反映されない。
既存の厳格なブラウザー検査は維持できる。

回帰確認では、手作り設定に加えて、実際の両 config を Playwright の設定構築経路に通し、
得られた `FullConfig` が `requireC2Config()` に通ることをオフラインで確認する。
Chromium 以外の明示指定、suite の取り違え、記録有効化などの拒否条件も維持する。
Playwright 内部 API をテストに使う場合は、バージョン更新時の追随が必要になる。

その後の実 E2E では `CONFIG_OK` → `STATE_OK` → `PREFLIGHT_OK`、
Smoke 4 / Chat 6 件の期待件数、各シナリオと runner の成功を確認する必要がある。
今回の設定検査の通過だけで、その後の HTTP・ブラウザー・UI の成功を保証するものではない。

## 調査の実施範囲と制約

- 実施: リポジトリ仕様・実装・インストール済み依存ソースの確認、両 config のオフライン読み込みと assertion。
- 既存の関連 Vitest 3 ファイルも実行を試みたが、Vite 設定読み込み時に esbuild の
  `spawn EPERM` で起動できなかった。この調査環境の制約は、提供ログの設定拒否とは別の問題。
  この実行についてテスト合格は主張しない。
- ブラウザー、OAuth、HTTP preflight、DB 接続、セッション作成・失効、fixture 操作は実行していない。
  private state ファイル、環境ファイルの秘密値も読み出していない。
- 実装、認証仕様、ロードマップの完了判定は変更していない。本調査の変更成果物は本レポートのみ。
- 提供ログにより独立 preflight と cleanup の成功報告は得られたが、認証済み Playwright E2E は設定検査で停止している。
  [Route B の検証方針](./c2-e2e-session-route-b.md) にある実 E2E の検証完了とは扱わない。

資料は対象 checkout のソースとインストール済み Playwright `1.63.0` を一次根拠とした。
外部仕様や最新版への一般化は行っていない。
