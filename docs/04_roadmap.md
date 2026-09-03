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
2. **危険な部分を早く潰す** — [読み取り専用の強制](./03_api.md#2-読み取り専用の強制多層)が崩れると設計が変わるので、フェーズ C の最初に実測する

---

## フェーズ A — Storybook で見た目を決める

**固定データだけで画面を組み、雰囲気を調整する。** DB も API もモデルも要らない。

| # | やること | 備考 |
|---:|---|---|
| 1 | モノレポの足場 | pnpm workspaces / `tsconfig.base.json` / Vite+ の lint 境界ルール |
| 2 | `styles/tokens.css` | guides の `:root` 3 ブロックを移植（light / `prefers-color-scheme` / `[data-theme]`） |
| 3 | Storybook セットアップ | **light / dark を切り替えるツールバー**を decorator で入れる |
| 4 | `fixtures/` | サンプルの Card / Question / 実行結果。**実データを使う**（`OPTIONAL MATCH` と Killua Zoldyck の例） |
| 5 | プリミティブ | `CodeBlock` → `ResultTable` → `Chip` → `ProgressBar` |
| 6 | コンポーネント | `FlashCard` / `ChoiceList` / `CardBack` / `QueryEditor` / `ConnectForm` / `Summary` |
| 7 | `screens/QuizScreen` | 画面まるごと。全状態を props で受ける |

### なぜ light / dark の切替を最初に入れるのか

guides は**両方のパレットを持っている**（JS がないため切替 UI だけが無い）。両方で見ながら詰めないと、片方で破綻する。

### 7 でできるようになること

`QuizScreen` が全状態を props で受ける純関数なので、Storybook で以下を**並べて見比べられる**。

```
出題中 / 正答直後 / 誤答直後 / 実行中 / 実行エラー / 未接続 / 完了
```

### ▶ ここで確認をもらう

---

## フェーズ B — モデル

| # | やること |
|---:|---|
| 8 | `shared/schema/` の Zod と `result.ts` |
| 9 | `tools/extract_deck.ts` → `deck.generated.ts`（30 枚） |
| 10 | `question.ts` / `leitner.ts` / `quiz.ts` / `rng.ts` / `progress.ts` |

**全て純関数なので、React 抜きでユニットテストが書ける。**

---

## フェーズ C — バックエンド

| # | やること | 備考 |
|---:|---|---|
| 11 | Docker Compose（`neo4j` + `seed`）+ `.env` / `.env.example` | 投入後に 73 / 153 を確認 |
| 12 | **`readOnly.ts` と実測** | **下の検証 8 をここで通す。通らなければ先に進まない** |
| 13 | `driverStore` / `/api/connect`（GET / POST / DELETE）/ `/api/run` / ログ抑制 / `toPlainJson` | クッキーは httpOnly。**フロントに識別子を渡さない** |
| 14 | dev 自動接続と歯止め 5 項目 | [`03_api.md`](./03_api.md#歯止め) |
| 15 | OpenAPI | `/docs`（Scalar）、`openapi:write`、`openapi:check` |

---

## フェーズ D — 結線

| # | やること |
|---:|---|
| 15 | `controller/` で model と view を繋ぐ。**View は一切変えない**（変える必要が出たらフェーズ A の設計ミス） |
| 16 | 通し確認 |

---

## 検証方法

### 見た目

1. `vp run storybook` で DB も API も無しに全コンポーネントが見え、**light / dark 両方**で崩れない

### 環境

2. `docker compose up` → `http://localhost:5173` と `http://localhost:7474` が開く
3. `MATCH (n) RETURN count(n)` が **73**、`MATCH ()-[r]->() RETURN count(r)` が **153**
4. **`.env` を置いて `docker compose up` すると、接続画面を経ずに繋がった状態で始まる**
   画面に `dev-auto` である旨が出ている
5. **フロントに識別子が無いことを確認する**
   - DevTools の Application → Cookies に `HttpOnly` の印が付いている
   - コンソールで `document.cookie` を叩いて**そのクッキーが見えない**
   - `localStorage` に接続系のキーが無い（`box` の進捗だけがある）
6. 切断ボタンで手入力の接続画面に戻り、`bolt://localhost:7687` と dev 資格情報で接続できる（本番経路の確認）
7. **歯止めが効く**
   - `.env` の `NEO4J_PASSWORD` を変えて `docker compose up` → コンテナ側も変わるので**繋がる**（出どころが 1 箇所である証拠）
   - `NEO4J_URI` をリモートに向けて自動接続 → 拒否される
   - `NODE_ENV=production` かつ `DEV_AUTO_CONNECT=true` → **起動が失敗する**
   - 起動バナーに URI が出て、**パスワードは出ていない**

### クエリの実行と編集

8. `optional-match` カードで実行 → **`Killua Zoldyck 0`**（guides の実測値と一致）
9. 同じクエリを `OPTIONAL MATCH` → `MATCH` に**編集して再実行** → 29 行になり Killua が消える
10. `varlen` で `*1..3` → `*1..1` → 7 件が **4 件**になる

### ★ 書き込みが拒否されること（フェーズ C の最初にやる）

11. 以下を全て確認する。

    - `CREATE (x:Tmp)` に書き換えて実行 → **第 1 層で拒否される**
    - Neo4j Browser で `MATCH (x:Tmp) RETURN count(x)` が **0**（本当に実行されていない証拠）
    - **`EXPLAIN CREATE (x:Tmp)` の `queryType` を実際に出力して確認する**
      `'r'` なら第 1 層を `summary.plan` の演算子判定に切り替える（[03_api.md 参照](./03_api.md#第-1-層--explain-によるサーバ権威の分類主防御)）
    - 第 1 層を一時的に外し、**第 2 層だけで止まるか**を実測する

12. `create` カードには実行ボタンが無く、実行前後の状態が静的に出ている

### 学習フロー

13. 誤答したカードが数枚後に再出題され、全て 2 回正答するとサマリに到達する
14. リロードしても `box` は残る

### 境界とテスト

15. `vp check`（fmt + lint + typecheck）が MVC 境界違反を検出する
    - `view/` から `../model/` を import してみて赤くなるか
    - `model/` で `react` を import してみて赤くなるか
    - `model/` の `Readonly<>` な状態を書き換えてみて**型エラー**になるか
    （`class` は機械では止めない。[理由](./02_architecture.md#何を機械が守り何を守らないか)）
16. `vp test` — `model/` と `toPlainJson` のユニットテスト
    - 誤答肢が正解と重複しない
    - 同じシードで出題順が一致する
    - Leitner の遷移
    - Neo4j 型の変換
17. `vp run openapi:check` — スキーマを 1 箇所変えて `openapi.json` を更新せずに走らせると **落ちる**

### 再現性

18. `docker compose down -v && docker compose up` で全て再現する

---

## 前提として置いた判断

異論があれば言ってください。

| # | 判断 | 理由 | 代替案 |
|---:|---|---|---|
| 1 | `Result` は自前 30 行 | 必要な合成が浅い | `neverthrow` |
| 2 | **ESLint を入れず Oxlint だけにする** | 層境界は `no-restricted-imports` で守れ、不変性は `Readonly<>` で型が守る。クラス禁止だけ機械化を諦めた | Oxlint の JS プラグインで `ClassDeclaration` を弾く |
| 3 | フロントは OpenAPI からコード生成しない | 同じ Zod が源なので `z.infer` で足りる | `openapi-typescript` |
| 4 | 書き込み系 5 枚は実行させない | 接続先で挙動が変わると説明が難しい | Docker のローカル DB のときだけ書き込ませる |
| 5 | UI 言語は日本語のみ | 英語版 guide が存在しないため、英語化は翻訳ではなく書き下ろしになる | ja / en 切替 |
| 6 | `§ Traps` の 10 行テーブルはスコープ外 | 今回の依頼（構文 → 目的）とは別物 | `症状 → 原因` の第 2 デッキとして追加 |
| 7 | セッション識別子は httpOnly クッキー | フロントに識別子を持たせない。JS から読めないので XSS で抜けない | body で `sessionId` を往復させる |
| 8 | **クッキーに `Max-Age` を付けない** | タブを閉じれば消える。ただし**リロードでは残る** | 起動時に `DELETE /api/connect` を打って厳密にリロードで切る |
| 9 | dev 自動接続は既定で無効、ローカル宛のみ | 事故らせないため。本番設定では起動を拒否する | 既定で有効にする |
