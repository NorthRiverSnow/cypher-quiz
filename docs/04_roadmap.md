# 実装の順序と検証

仕様は [`01_spec.md`](./01_spec.md)、技術は [`02_architecture.md`](./02_architecture.md) / [`03_api.md`](./03_api.md)。

---

## 進め方の要点

```
A. Storybook で見た目を決める     ← ここから。確認をもらって一度止まる
B. モデル（純関数）
C. バックエンド（Docker + Hono）
D. 結線
```

2 つの原則で順番を決めている。

1. **見た目を先に固める** — フェーズ A で止めて雰囲気を見てもらう。DB も API もモデルも無し
2. **危険な部分を早く解消する** — [読み取り専用の強制](./03_api.md#2-読み取り専用の強制多層)が崩れると設計が変わるので、フェーズ C の最初に実測する

---

## フェーズ A — Storybook で見た目を決める

**固定データだけで画面を組み、雰囲気を調整する。** DB も API もモデルも要らない。

**1 ステップ = 1 レビュー。** 各ステップの終わりで止まり、その時点の story を見て判断をもらう（[CLAUDE.md](../CLAUDE.md) の「進め方」）。

| # | やること | story で見る state |
|---|---|---|
| A-0 | `docs/` の章 ID を [`SectionId`](./02_architecture.md#4-デッキ) に揃える。**コードは書かない** | — |
| A-1 | モノレポの足場（lint の層境界）/ `styles/tokens.css`（`:root` 3 ブロック）/ Storybook / `styles/TokenCatalog/` | light / dark |
| A-2 | `CodeBlock` / `Icon` / `Note` | 語句の種別、横に溢れる行、注記の色調 |
| A-3 | `Card` / `Button` / `ChoiceList` / `FlashCard`。**まだ裏面は作らない** | 正順 / 逆順、未選択 / 選択中、回答ボタンの有効 / 無効 |
| A-4 | `CardBack` / `fixtures/` | 正解 / 不正解、罠のあるカード |
| A-5 | `ResultTable` | 1 行、複数列、日付を含む表、ノードを含む表 |
| A-6 | `QueryEditor` | 通常 / 編集済み / 実行中 / 実行エラー / 書き込みで拒否 / 未接続 |
| A-7 | `ProgressBar` / `ConnectForm` / `Summary` | 未入力 / 入力中 / 接続中 / 接続失敗 / dev 自動接続中 |
| A-8 | `templates/QuizLayout` と 4 つの page、`routes.tsx` で結合 | 下の一覧 |

### なぜ light / dark の切替を最初に入れるのか

guides は**両方のパレットを持っている**（JS がないため切替 UI だけが無い）。両方を見ながら調整しないと、片方で破綻する。

### `fixtures/` を A-4 で作る理由

`fixtures/` は Storybook とテストが共有するサンプルデータなので、**共有する相手が 2 つ以上になってから形が決まる。**
A-3 までは story の中に置き、`CardBack` が `FlashCard` と同じカードを使う A-4 で切り出す。

中身は [`06_deck.md`](./06_deck.md) から引くが、**手で書く。** 抽出器（B-2）を先に作ると、
雰囲気を見る前にデータ形式が固まる。

### A-8 でできるようになること

ページが全状態を props で受ける純関数なので、Storybook で以下を**並べて見比べられる**。

```
出題中 / 正解直後 / 不正解直後 / 実行中 / 実行エラー / 未接続 / 完了
```

### ▶ ここで確認をもらう

---

## フェーズ B — モデル

| # | やること |
|---:|---|
| B-1 | `shared/schema/` の Zod と `result.ts` |
| B-2 | `model/deck.data.ts`（30 枚の固定データ）と `deck.ts` の型 |
| B-3 | `question.ts` / `leitner.ts` / `quiz.ts` / `rng.ts` / `progress.ts` |
| B-4 | 失敗の経路。lint の MVC 境界 / `useNotices` / `useProgress` / `Notice` と `NoticeList` / `ErrorBoundary` と `useGlobalErrors` |

**B-3 まで全て純関数なので、React 抜きでユニットテストが書ける。**

**B-4 をフェーズ C の前に置く理由。** `Result` を作っても、消費する側が無ければ失敗は画面に出ない。
[`/api/run` と `/api/connect`](./03_api.md) の失敗を受ける器が先に無いと、フェーズ C で同じ穴を掘る。

---

## フェーズ C — バックエンド

| # | やること | 備考 |
|---:|---|---|
| C-0 | **コンテナの中で `vp` が動くか実測** | 動かなければ以降の作り方が変わる。下の検証 2 |
| C-1 | Docker Compose（`neo4j` / `seed` / `neo4j-test`）+ `.env` / `.env.example` | 両方に投入して 73 / 153 |
| C-2 | **`readOnly.ts` と実測** | **下の検証 14 をここで通す。通らなければ先に進まない** |
| C-3 | ログの土台（`log.ts`）と `app.onError` | [ログ](./03_api.md#8-ログ) / [失敗の返し方](./03_api.md#7-失敗の返し方) |
| C-4 | `driverStore` / **`tx.ts`** / `/api/connect`（GET / POST / DELETE）/ `/api/run` / `toPlainJson` / `server.ts` | クッキーは httpOnly。**フロントに識別子を渡さない** |
| C-5 | 統合テスト（`test` サービスから `neo4j-test` へ） | vitest の project を分け、DB 要りをホストから外す |
| C-6 | dev 自動接続と歯止め 5 項目 | [`03_api.md`](./03_api.md#歯止め) |
| C-7 | OpenAPI | `/docs`（Scalar）、`openapi:write`、`openapi:check` |
| C-8 | **api をコンテナで動かす** | `Dockerfile` と compose の `api` サービス。**C-0 をここで実測する** |

**OpenAPI は最初のルートが 1 本できた時点で入れる。** 後から入れると、既に書いた
ルートを `createRoute` に書き直すことになる。C-4 の途中（`/api/connect` の直後）で
C-7 を先に済ませた。

### C-8 — api をコンテナで動かす

**今は api をホストで動かしている**（`vp run api` / `vp run dev`）。
[Docker で実行できること](#前提として置いた判断)を api まで広げる。

| やること | 中身 |
|---|---|
| **C-0 を実測する** | `docker compose run --rm api vp --version`。動かなければ `node_modules/.bin` を直に叩く形へ |
| `packages/api/Dockerfile` | linux/arm64 の `node_modules` を**イメージの中で作る**。ホストのものは native binary が合わない |
| compose の `api` サービス | 8787。ソースをバインドマウントして `tsx watch`。`node_modules` は**マウントで隠さない**（named volume で退避する） |
| `vp run api` / `vp run dev` | 中身をコンテナ経由に差し替える。**コマンド名は変えない** |
| `.env` | 今と同じ 1 つ。コンテナからは `neo4j:7687`、ホストからは `localhost:7687` |

**web と Storybook はホストのまま。** proxy の宛先は 8787 で変わらないので、
`packages/web/vite.config.ts` は触らない。

**`vp run test:api` は今の形を保つ。** テストのコンテナ化は C-5 で別に扱う。

**ログを API より先に作る。** 後から足すと、既に書いたルートに 1 本ずつ差し込むことになり、
差し込み漏れが**そのまま「出ないログ」**になる。土台を先に置けば、以降は書いた時点で出る。

**`web` と Storybook はホストのまま。** Docker に入れるのは DB と API。
理由は [`02_architecture.md`](./02_architecture.md#6-dockerdev)。

---

## フェーズ D — 結線

| # | やること |
|---:|---|
| D-1 | `controller/` で model と view を繋ぐ。**View は一切変えない**（変える必要が出たらフェーズ A の設計ミス） |
| D-2 | 通し確認 |

---

## 検証方法

### 見た目

1. `vp run storybook` で DB も API も無しに全コンポーネントが見え、**light / dark 両方**で崩れない

### 環境

2. **コンテナの中でツールチェーンが動く。** `docker compose run --rm test vp --version` が答える
   （動かなければ `node_modules/.bin/vp` を直に叩く形に切り替える。**C-0 で先に確かめる**）
3. `vp run db` → `http://localhost:7474`（Neo4j Browser）が開き、`vp run dev` の
   `http://localhost:5173` から `/api` がホストの api（8787）へ通る。
   `http://localhost:8787/docs` で API リファレンスが開く
4. `MATCH (n) RETURN count(n)` が **73**、`MATCH ()-[r]->() RETURN count(r)` が **153**
5. **`neo4j-test` にも同じ dataset が入る。** 別ポートで繋いで 73 / 153
6. `vp run test:api` が**api のテストを通し、終わったらテスト用のコンテナが残っていない。**
   `vp run test`（shared + web）は DB を立てずに通る
7. **`.env` を置いて `docker compose up` すると、接続画面を経ずに繋がった状態で始まる**
   画面に `dev-auto` である旨が出ている
8. **フロントに識別子が無いことを確認する**
   - DevTools の Application → Cookies に `HttpOnly` の印が付いている
   - コンソールで `document.cookie` を叩いて**そのクッキーが見えない**
   - `localStorage` に接続系のキーが無い（`box` の進捗だけがある）
   - **`POST /api/connect` の応答の本文にも識別子が無い**
9. 切断ボタンで手入力の接続画面に戻り、`bolt://localhost:7687` と dev 資格情報で接続できる（本番経路の確認）
10. **歯止めが働く**
   - `.env` の `NEO4J_PASSWORD` を変えて `docker compose up` → コンテナ側も変わるので**繋がる**（出どころが 1 箇所である証拠）
   - `NEO4J_URI` をリモートに向けて自動接続 → 拒否される
   - `NODE_ENV=production` かつ `DEV_AUTO_CONNECT=true` → **起動が失敗する**
   - 起動バナーに URI が出て、**パスワードは出ていない**

### クエリの実行と編集

11. `optional-match` カードで実行 → **`Killua Zoldyck 0`**（guides の実測値と一致）
12. 同じクエリを `OPTIONAL MATCH` → `MATCH` に**編集して再実行** → 29 行になり Killua が消える
13. `varlen` で `*1..3` → `*1..1` → 7 件が **4 件**になる

### ★ 書き込みが拒否されること（フェーズ C の最初にやる）

14. 以下を全て確認する。

    - `CREATE (x:Tmp)` に書き換えて実行 → **第 1 層で拒否される**
    - Neo4j Browser で `MATCH (x:Tmp) RETURN count(x)` が **0**（本当に実行されていない証拠）
    - 第 1 層を一時的に外し、**第 2 層だけで止まるか**を実測する
    - `tx.ts` の外に `driver.session()` の呼び出しが**無い**（grep で確認する）

    - **ユーザ作成・権限付与・データベース削除も拒否される**
      （`CREATE USER` / `GRANT` / `DROP DATABASE`。[実測した分類](./03_api.md#実測した分類)）
    - **`'r'` の抜け道が塞がっている**（`LOAD CSV` / `TERMINATE TRANSACTIONS` /
      `SHOW TRANSACTIONS` / `SHOW SETTINGS`。[抜け道](./03_api.md#r-に分類される抜け道)）

    分類と抜け道の実測は `vp run test:api` が毎回やり直す。

15. `create` カードには実行ボタンが無く、実行前後の状態が静的に出ている

### 学習フロー

16. 不正解のカードが数枚後に再出題され、全て 2 回正解するとサマリに到達する
17. リロードしても `box` は残る

### 失敗の伝わり方

18. **実際に壊して、画面に出るか見る。**
    - `localStorage.setItem` が throw する状態にして回答する → 金の帯が出る
    - 保存できる状態に戻して回答する → 帯が**手を触れずに取り下げられる**
    - 保存された進捗を壊す → 何も出さずに最初から始まる（[知らせない失敗](./01_spec.md#8-失敗の伝え方)）
19. **白い画面にならない。**
    - 描画中に throw させる → `ErrorScreen` と「読み込み直す」が出る
    - `Promise` を reject させる → 赤の帯が出る（境界は描画中しか拾わない）

**18 の保存まわりはフェーズ D で実測する。** `useProgress` を呼ぶのは `useQuiz` で、
それまでは保存する `Boxes` が存在しない。B-4 の時点では偽ストアを渡すユニットテストで代替する。

### ログ

20. **1 リクエストが追える。** `/api/run` を 1 回叩き、`req.start` → `query.run` → `req.end` が
    **同じ `reqId`** で並ぶ。**ルートも `tx.ts` も `reqId` を受け取っていない**
    （[持ち回さない](./03_api.md#reqid-を持ち回さない)。grep で確認する）
21. **実行したクエリが残る。** `query.run` の `cypher` が送った文字列と一致する。
    書き込みで拒否したときも残り、`req.end` が 403 になる
22. **ボディが出ていない。** `/api/connect` を叩いたあと、ログ全体からパスワードと
    生の接続 URI を検索して **1 件も出ない**。`/api/run` でも `cypher` 以外は残らない
23. **エラーが残る。** 想定外の例外を起こすと `error` の行にスタックが出る。
    **クライアントへの応答にはスタックが無い**

### 境界とテスト

24. `vp check`（fmt + lint + typecheck）が MVC 境界違反を検出する
    - `view/` から `../model/` を import してエラーになるか
    - `view/` から `../controller/` を import してエラーになるか
    - `routes.tsx` から `./model/` を import してエラーになるか
    - `model/` で `react` を import してエラーになるか
    - `controller/` から `../model/` は**エラーにならない**か（唯一の通り道を塞いでいないこと）
    - api の `routes/` から `../neo4j/` を import してエラーになるか
    - api の `controller/` から `hono` と `../cookie` を import してエラーになるか
    - `QuizState` を書き換えてみて**型エラー**になるか（`Readonly` を付けた所だけが対象。[運用ルール](./02_architecture.md#readonly-は付ける場所を選ぶ)）
    （`class` は機械では止めない。[理由](./02_architecture.md#何を機械が守り何を守らないか)）
25. `vp test` — DB を要らないユニットテスト（DB 要りは検証 6）
    - 不正解の肢が正解と重複しない
    - 同じシードで出題順が一致し、シードが違えば変わる
    - Leitner の遷移

    api は 2 段（[置き場所](./02_architecture.md#テストは-2-段に置く)）。`src/` は偽の依存を渡す
    ユニットテスト、`test/` は `app.request()` から叩く API 経路のテストで**偽物を渡さない**。
26. `vp run openapi:check` — スキーマを 1 箇所変えて `openapi.json` を更新せずに実行すると **エラーになる**
    （`vp run test:api` も同じ比較をする。`/doc` の中身とコミット済みの内容が一致すること）

### api のコンテナ（C-8）

27. **ホストに Node が無くても api が動く。** `vp run dev` で
    `http://localhost:5173` から `/api` がコンテナの api へ通り、
    `http://localhost:8787/docs` が開く
28. **ソースを 1 行直すとコンテナの中で再起動する**（バインドマウント越しの watch）
29. **api を止めても DB は残る**（`vp run db:stop` まで生きている）

### 結果の正規化

30. **ドライバの型が残らない**（`vp run test:api`。[対応表](./03_api.md#セル-1-つの対応)）
    - `count(n)` が `73`、2^53 を超える整数は文字列
    - `Incident.date` が `'2025-08-05'`
    - ノード・リレーション・パス・マップに `kind` のタグが付き、リストは中まで変換される
    - **0 行でも列名が残る**

### 再現性

31. `docker compose down -v && docker compose up` で全て再現する

---

## 前提として置いた判断

異論があれば言ってください。

| # | 判断 | 理由 | 代替案 |
|---:|---|---|---|
| 1 | `Result` は自前 | 必要な合成が浅い | `neverthrow` |
| 2 | **ESLint を入れず Oxlint だけにする** | 層境界は `no-restricted-imports` で守れ、不変性は `Readonly<>` で型が守る（付けた所だけ・浅くだけ）。クラス禁止だけ機械化を諦めた | Oxlint の JS プラグインで `ClassDeclaration` を検出してエラーにする |
| 3 | フロントは OpenAPI からコード生成しない | 同じ Zod が源なので `z.infer` で足りる | `openapi-typescript` |
| 4 | 書き込み系 5 枚は実行させない | 接続先で挙動が変わると説明が難しい | Docker のローカル DB のときだけ書き込ませる |
| 5 | UI 言語は日本語のみ | 英語版 guide が存在しないため、英語化は翻訳ではなく書き下ろしになる | ja / en 切替 |
| 6 | `§ Traps` の 10 行テーブルはスコープ外 | 今回の依頼（構文 → 目的）とは別物 | `症状 → 原因` の第 2 デッキとして追加 |
| 7 | セッション識別子は httpOnly クッキー | フロントに識別子を持たせない。JS から読めないので XSS で抜けない | body で `sessionId` を往復させる |
| 8 | **クッキーに `Max-Age` を付けない** | タブを閉じれば消える。ただし**リロードでは残る** | 起動時に `DELETE /api/connect` を打って厳密にリロードで切る |
| 9 | dev 自動接続は既定で無効、ローカル宛のみ | 事故らせないため。本番設定では起動を拒否する | 既定で有効にする |
