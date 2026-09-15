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
| C-0 | **コンテナの中で `vp` が動くか実測** | 動かなければ以降の作り方が変わる。下の検証 2。**C-5 で実測した** |
| C-1 | Docker Compose（`neo4j` / `seed` / `neo4j-test`）+ `.env` / `.env.example` | 両方に投入して 73 / 153 |
| C-2 | **`readOnly.ts` と実測** | **下の検証 14 をここで通す。通らなければ先に進まない** |
| C-3 | ログの土台（`log.ts`）と `app.onError` | [ログ](./03_api.md#8-ログ) / [失敗の返し方](./03_api.md#7-失敗の返し方) |
| C-4 | `driverStore` / **`tx.ts`** / `/api/connect`（GET / POST / DELETE）/ `/api/run` / `toPlainJson` / `server.ts` | クッキーは httpOnly。**フロントに識別子を渡さない** |
| C-5 | 統合テスト（`test` サービスから `neo4j-test` へ） | vitest の project を分け、DB 要りをホストから外す。ここで C-0 を実測した |
| C-6 | dev 自動接続と歯止め 5 項目 | [`03_api.md`](./03_api.md#歯止め) |
| C-7 | OpenAPI | `/docs`（Scalar）、`openapi:write`、`openapi:check` |
| C-8 | **api をコンテナで動かす** | compose の `api` サービス。`Dockerfile` は要らなかった |

**OpenAPI は最初のルートが 1 本できた時点で入れる。** 後から入れると、既に書いた
ルートを `createRoute` に書き直すことになる。C-4 の途中（`/api/connect` の直後）で
C-7 を先に済ませた。

### C-8 — api をコンテナで動かす

**`Dockerfile` は作らなかった。** `test` サービスで実測した形（`node:22` に
リポジトリを読み取り専用で渡し、`node_modules` は volume。入口で `pnpm install`）が
そのまま使えて、イメージのビルドと再ビルドが要らない。api は同じ入口を共有する。

**`tsx watch` も使わなかった。** Docker Desktop の共有はファイルイベントを
コンテナへ伝えないので、`inotify` に載る watch は反応しない（実測）。
ポーリングする `nodemon --legacy-watch` に替えた。
理由は [`02_architecture.md`](./02_architecture.md#watch-はポーリングでしか届かない)。

**ログを API より先に作る。** 後から足すと、既に書いたルートに 1 本ずつ差し込むことになり、
差し込み漏れが**そのまま「出ないログ」**になる。土台を先に置けば、以降は書いた時点で出る。

**`web` と Storybook はホストのまま。** Docker に入れるのは DB と API。
理由は [`02_architecture.md`](./02_architecture.md#6-dockerdev)。

---

## フェーズ D — 結線

| # | やること |
|---:|---|
| D-1 | `controller/` で model と view を繋ぐ。結線は `screens/` に置き、`routes.tsx` は経路表だけにする |
| | **View に足したもの** — `ReviewPage`（復習）、`CardBack` の `header` と `nextLabel`。いずれもフェーズ A に無かった導線（不正解カードを開き直す）のため |
| D-2 | 通し確認 |

---

## フェーズ E — 章を選ぶ

**フェーズ A と同じく Storybook から始める。** 章の一覧は状態が 3 つ（未着手・進行中・完了）あり、
先に見た目を決めないと、model がどの値を渡せばよいかが決まらない。

| # | やること |
|---:|---|
| E-1 | 仕様（[`01_spec.md#スタート画面--出す章を選ぶ`](./01_spec.md#スタート画面--出す章を選ぶ)） |
| E-2 | `view` — 章の行（`molecules`）。3 つの状態とリセットを story に並べる |
| E-3 | `view` — 章の一覧（`organisms`）。「全て」の行と選択の結線 |
| E-4 | `view` — `StartPage` に差し込む |
| E-5 | `model` — 出題・完了・進捗バー・成績を、選んだ章に限る |
| E-6 | `model/progress.ts` — 選んだ章を端末に残す |
| E-7 | `controller` と `screens/StartScreen` — 結線 |
| E-8 | 通し確認 |

---

## 検証方法

### 見た目

1. `vp run storybook` で DB も API も無しに全コンポーネントが見え、**light / dark 両方**で崩れない

### 環境

2. **コンテナの中でツールチェーンが動く。** `docker compose run --rm test ./node_modules/.bin/vp --version` が答える
   （`vp` はシェル関数なので、コンテナからは実体を叩く）
3. `vp run db` → `http://localhost:7474`（Neo4j Browser）が開き、`vp run dev` の
   `http://localhost:5173` から `/api` がホストの api（8787）へ通る。
   `http://localhost:8787/docs` で API リファレンスが開く
4. `MATCH (n) RETURN count(n)` が **73**、`MATCH ()-[r]->() RETURN count(r)` が **153**
5. **`neo4j-test` にも同じ dataset が入る。** 別ポートで繋いで 73 / 153
6. `vp run test` が**ホスト（shared + web）と api を順に通し、終わったらテスト用の
   コンテナが残っていない。** `vp test run` は DB を立てずに通る。
   **ホストの `node_modules` は変わらない**（コンテナから走らせた後に `vp check` がそのまま通る）
7. **`.env` を置いて `docker compose up` すると、接続画面を経ずに繋がった状態で始まる**
   画面に `dev-auto` である旨が出ている
8. **フロントに識別子が無いことを確認する**
   - DevTools の Application → Cookies に `HttpOnly` の印が付いている
   - コンソールで `document.cookie` を叩いて**そのクッキーが見えない**
   - `localStorage` に接続系のキーが無い（`cypher-quiz:progress` と `cypher-quiz:theme` だけ）
   - **`POST /api/connect` の応答の本文にも識別子が無い**
9. 切断ボタンで手入力の接続画面に戻り、**`bolt://neo4j:7687`** と dev 資格情報で接続できる（本番経路の確認）
   - **api はコンテナの中で動く**（[C-8](#c-8--api-をコンテナで動かす)）。`localhost` は
     コンテナ自身を指すので繋がらない。ホストのブラウザから見た名前ではなく、api から見た名前を入れる
   - **ローカル以外は暗号化される。** `bolt://` で Aura に繋ぎ、画面の接続先が
     `neo4j+s://` / `bolt+s://` になっている（[繋ぎ変え](./03_api.md#ローカル以外は暗号化スキームに繋ぎ変える)）
   - `http://…` を入れると 422 で、**ドライバを作りに行かない**
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
17-a. **1 章だけ選んで完走できる。** 出題がその章だけになり、進捗バーの分母もその章の分になる
17-b. **選ばなかった章の成績が消えない。** A 章を解いてから B 章を解き、
    A 章を選び直すとサマリに A 章の成績が元のまま出る
17-c. **選択がリロードをまたぐ。** 章を外して開き直すと、外したままになっている
17-d. **「もう一度」でスタート画面に戻る。** 章を選び直して始められ、
    押しただけでは成績が消えていない
17-e. **完了した章を選び直すと全問出る。** 間違いが残っていても、間違えた問題だけにはならない
17-e2. **「全て」は総ざらい。** 章ごとに進み具合が違う状態で全て選ぶと、60 問が最初から出る
17-f. **記録リセットで未着手に戻る。** 押した章だけが `10 問` に戻り、他の章は変わらない
17-g. **途中で章を変えても対象が入れ替わる。** A 章を途中まで解き、B 章だけを選び直すと
    B 章だけが出る

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
    - **クエリに書いた資格情報も出ない。** `LOAD CSV FROM 'https://u:p@x/f.csv'` と
      `CREATE USER b SET PASSWORD 'pw'` を実行して、ログを検索して 1 件も出ない
      （[取り除くもの](./03_api.md#redactts-が取り除くもの)）
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

30. **実行ボタンを出すカードは、本文がそのまま実行できる。** 注釈（`note`）が混ざっていないこと
   ——`runnable` な 16 枚を `/api/run` へ送って全て 200
31. **ドライバの型が残らない**（`vp run test:api`。[対応表](./03_api.md#セル-1-つの対応)）
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
| 10 | **ローカル以外は暗号化スキームに繋ぎ変える**（拒否しない） | 対応している相手ならそのまま繋がり、していなければドライバが失敗する。どちらにしても平文では出ない | 平文を拒否して入力し直させる |
