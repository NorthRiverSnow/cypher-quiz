# 技術提案 — アーキテクチャ

仕様は [`01_spec.md`](./01_spec.md)。API とセキュリティは [`03_api.md`](./03_api.md)。

---

## 1. スタック

| 層 | 採用 | 理由 |
|---|---|---|
| 言語 | TypeScript（全層） | 指定 |
| 設計様式 | **関数型。クラスを使わない** | 指定 |
| フロント | Vite + React | 指定 |
| コンポーネント開発 | **Storybook**（`@storybook/react-vite`） | 指定。ここから着手する |
| バックエンド | **Hono** + `@hono/zod-openapi` | 指定。OpenAPI がルート定義から導出される |
| スキーマ / 検証 | Zod（`@hono/zod-openapi` 経由） | 型・実行時検証・OpenAPI の唯一の真実にできる |
| DB ドライバ | `neo4j-driver` v5 | |
| dev 環境 | Docker Compose | 指定。環境差をなくす |
| 構成 | npm workspaces のモノレポ | `shared` の Zod を web と api の両方から参照するため |

---

## 2. 関数型で MVC をやる

MVC は本来 OOP の語彙だが、**「層を分ける」という主張自体はパラダイムに依存しない**。層は保ったまま、各層を関数型で実現する。

| 層 | OOP なら | 本提案（関数型） |
|---|---|---|
| **Model** | `class QuizSession` が状態を持ち、メソッドで遷移 | **不変の状態値** + **純粋な遷移関数** `(state, event) => state` + セレクタ |
| **View** | 状態を参照するコンポーネント | **純関数コンポーネント**。props を受け取り JSX を返すだけ |
| **Controller** | コントローラオブジェクト | **`useReducer` の配線**と、端に寄せた副作用 |

### Model — クラスも `this` も出てこない

```ts
// packages/web/src/model/quiz.ts

export type QuizState = Readonly<{
  queue:    readonly QuestionKey[];
  boxes:    Readonly<Record<QuestionKey, Box>>;
  answered: readonly AnsweredRecord[];
  revealed: boolean;
}>;

export type QuizEvent =
  | { readonly type: 'answered';  readonly choiceIndex: number }
  | { readonly type: 'advanced' }
  | { readonly type: 'restarted'; readonly scope: 'all' | 'wrong-only' };

export const initQuiz   = (deck: Deck, opts: QuizOptions): QuizState => ...;
export const reduceQuiz = (state: QuizState, event: QuizEvent): QuizState => ...;

// セレクタも純関数
export const currentQuestion = (s: QuizState, deck: Deck): Question | null => ...;
export const progressOf      = (s: QuizState): Progress => ...;
```

**React を一切 import しないので、Node でそのままユニットテストできる。**

### バックエンド — クロージャを返すファクトリ

状態を持つ必要があるもの（ドライバの保管庫）も、クラスではなくクロージャで組む。

```ts
// packages/api/src/neo4j/driverStore.ts

export type DriverStore = Readonly<{
  open:  (creds: Credentials) => Promise<Result<SessionId, ConnectError>>;
  get:   (id: SessionId) => Option<Driver>;
  close: (id: SessionId) => Promise<void>;
  sweep: () => Promise<number>;
}>;

// クラスではない。Map への変更はこの関数の中だけに閉じる
export const createDriverStore = (deps: StoreDeps): DriverStore => { ... };
```

### 副作用の扱い

**想定内の失敗は例外を投げず `Result` で返す。**

| 分類 | 例 | 扱い |
|---|---|---|
| 想定内の失敗 | 接続失敗、書き込み拒否、構文エラー、タイムアウト | `Result` の `err` |
| 想定外 | バグ | 例外として上げる |

`shared` に 30 行程度の自前 `Result` / `Option` を置く。

```ts
// packages/shared/src/result.ts
export type Result<T, E> =
  | { readonly ok: true;  readonly value: T }
  | { readonly ok: false; readonly error: E };
```

> `neverthrow` も候補だが、必要な合成が浅いので依存を増やさない。

### 時刻・乱数を注入する

- **TTL 判定** — `Clock = () => number` を受け取る
- **出題順** — シード付き擬似乱数を使う

どちらもテストで固定でき、かつ「同じシードなら同じ出題順」という[仕様 6](./01_spec.md#6-復習間隔反復)の要求をそのまま満たす。

---

## 3. 境界を機械で守る

**規約ではなく ESLint で落とす。** React は View と Controller が混ざりやすいので、人の注意力に頼らない。

```js
// packages/web/.eslintrc.cjs（抜粋）
overrides: [
  {
    files: ['src/model/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: ['react', 'react-dom', '../view/*', '../controller/*'],
      }],
      'no-restricted-globals': ['error', 'document', 'window'],
      'functional/no-classes':     'error',
      'functional/immutable-data': 'error',
      'functional/no-let':         'error',
    },
  },
  {
    files: ['src/view/**'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: ['../model/*', '../controller/*'],
      }],
    },
  },
]
```

### 各層の禁止事項

| 層 | 禁止 | 許可 |
|---|---|---|
| **Model** | `react` / `react-dom` の import、`document` / `window`、クラス、`let`、破壊的変更 | `localStorage` は `progress.ts` の 1 ファイルのみ |
| **View** | `model/` と `controller/` の import、`fetch`、`useEffect` | ローカルな入力エコー用の `useState` のみ |
| **Controller** | — | Model と View の両方を知ってよい唯一の層 |

### `functional/*` の適用範囲

**`model/**` にだけ強く掛ける。** View の JSX や api の I/O 境界にまで `no-let` を強制すると、得るものより摩擦のほうが大きい。api 側は `functional/no-classes` のみ全域に掛ける。

### 型は共有、ロジックは非共有

View は Model の**型**は要るがロジックは要らない。型を `shared` に置き、View は `@cypher-quiz/shared` から型だけを取る。

---

## 4. デッキ生成

`guides/03_cypher_reference_ja.html` を単一の真実として扱い（`nordwind-workshop` 側の運用思想と揃える）、そこから `deck.generated.ts` を吐く。

**生成物はコミットする**ので、このリポジトリは単体で完結する。

章は 6 つ。**id は安定した slug、日本語は表示ラベルとして別に持つ。** `section` は「誤答肢を同じ章から引く」（[`01_spec.md` §2](./01_spec.md#2-出題形式)）ために使う機能上のキーなので、文言を直しても壊れない値にする必要がある。

```ts
export type SectionId =
  | 'skeleton' | 'patterns' | 'shaping' | 'lists' | 'writing' | 'subqueries';

// 値は guide 03 の h2 見出しそのまま
export const SECTION_LABELS: Readonly<Record<SectionId, string>> = {
  skeleton:   '読み取りの骨格',
  patterns:   'パターンの書き方',
  shaping:    '結果の整形',
  lists:      'リストと集約',
  writing:    '書き込み',
  subqueries: 'サブクエリ・スキーマ・診断',
};
```

View は日本語を直書きせず `SECTION_LABELS` 経由で引く。

```ts
export type Card = Readonly<{
  id:       CardId;      // 'optional-match'
  section:  SectionId;   // 'skeleton' → 表示は SECTION_LABELS[section]
  name:     string;      // 'OPTIONAL MATCH'
  role:     string;      // '見つからなくても行を捨てず、変数を null にして通す。SQL の LEFT OUTER JOIN。'
  sample?:  Sample;
  note?:    string;      // 解説
  warn?:    string;      // 罠
}>;

export type Sample = Readonly<{
  cypher:     string;                  // タグを剥がした素のクエリ
  highlights: readonly Token[];        // span.kw/.rel/.hl/.bad/.cm の範囲
  expected?:  string;                  // 期待される実行結果
  runnable:   boolean;                 // 22 枚が true
  mutates:    boolean;                 // 5 枚が true
}>;
```

### `runnable` / `mutates` は自動判定しない

`tools/extract_deck.ts` の**明示テーブル**で持つ。30 枚しかなく、誤判定のほうが高くつく。

### 抽出元はこのリポジトリの外

`../nordwind-workshop/guides/03_cypher_reference_ja.html`。パスは引数で渡し、既定値をそこに向ける。

**guide が無い環境ではコミット済みの `deck.generated.ts` が使われるので、ビルドは壊れない。**

---

## 5. ディレクトリ

```
cypher-quiz/
├─ docs/                            # このドキュメント
├─ docker-compose.yml
├─ package.json                     # workspaces: packages/*
├─ tsconfig.base.json
├─ openapi/openapi.json             # 生成物。乖離を CI で検出
├─ seed/dataset/                    # nordwind-workshop/dataset/ のスナップショット
├─ tools/extract_deck.ts
└─ packages/
   │
   ├─ shared/src/
   │  ├─ schema/                    # ★ Zod。型・検証・OpenAPI の唯一の真実
   │  │  ├─ card.ts
   │  │  ├─ query.ts
   │  │  ├─ connect.ts
   │  │  └─ error.ts
   │  ├─ result.ts                  # Result / Option
   │  └─ index.ts
   │
   ├─ api/src/
   │  ├─ app.ts                     # OpenAPIHono の組み立て（純粋）
   │  ├─ server.ts                  # 起動だけ（副作用の端）
   │  ├─ routes/
   │  │  ├─ connect.ts
   │  │  └─ run.ts
   │  └─ neo4j/
   │     ├─ driverStore.ts          # クロージャ。状態はここだけ
   │     ├─ readOnly.ts             # EXPLAIN 判定。純粋関数と実行関数を分離
   │     └─ toPlainJson.ts          # 純粋
   │
   └─ web/
      ├─ .storybook/
      └─ src/
         ├─ model/                  # ★ React も DOM も知らない純粋 TS
         │  ├─ deck.generated.ts
         │  ├─ deck.ts
         │  ├─ question.ts          # 出題生成・誤答肢選択
         │  ├─ quiz.ts              # QuizState / reduceQuiz / セレクタ
         │  ├─ leitner.ts           # box 遷移
         │  ├─ rng.ts               # シード付き擬似乱数
         │  └─ progress.ts          # localStorage はここだけ
         │
         ├─ view/                   # ★ 純関数。props in / callback out
         │  ├─ primitives/
         │  │  ├─ CodeBlock.tsx     # guides の .kw/.rel/.hl/.cm 体系
         │  │  ├─ ResultTable.tsx
         │  │  ├─ Chip.tsx
         │  │  └─ ProgressBar.tsx
         │  ├─ FlashCard.tsx
         │  ├─ ChoiceList.tsx
         │  ├─ CardBack.tsx
         │  ├─ QueryEditor.tsx
         │  ├─ ConnectForm.tsx
         │  ├─ Summary.tsx
         │  └─ screens/
         │     └─ QuizScreen.tsx    # 画面まるごと純関数
         │
         ├─ controller/
         │  ├─ useQuiz.ts
         │  └─ useConnection.ts
         │
         ├─ fixtures/               # Storybook とテストが共有するサンプルデータ
         ├─ styles/
         │  ├─ tokens.css
         │  └─ app.css
         └─ api/client.ts           # fetch のみ
```

### `screens/QuizScreen.tsx` が純関数であることの意味

画面全体が「全状態を props で受ける純関数」なので、**Storybook で状態を並べて見比べられる**。

```
出題中 / 正答直後 / 誤答直後 / 実行中 / 実行エラー / 未接続 / 完了
```

これがフェーズ A（見た目を先に決める）を成立させる要。

---

## 6. Docker（dev）

```yaml
services:
  neo4j:    # neo4j:5。7474 / 7687 を公開。NEO4J_AUTH は .env の変数から
  seed:     # 一度だけ走り dataset を投入して終了
  api:      # Hono を watch 起動。同じ .env の変数で自動接続する
  web:      # Vite dev server。/api を api へ proxy（クッキーが同一オリジンで通る）
```

### `.env` は 1 つ。資格情報の出どころを分けない

`neo4j` コンテナの `NEO4J_AUTH` と、api の自動接続が**同じ `NEO4J_PASSWORD` を読む**。ズレて繋がらなくなる余地を作らない。`.env` は `.gitignore` に入れ、`.env.example` だけをコミットする。詳細は [`03_api.md`](./03_api.md#4-開発時の自動接続dev-限定)。

### データセットはスナップショットとしてコピーする

`seed/dataset/` に置く。`nordwind-workshop` は**兄弟の別リポジトリ**で、Docker のビルドコンテキストから素直に参照できないため。

元との一致は `manifest.json` の checksum で検証できる：

```
9d4eb12de6e731df3ee4d050df931922
```

### Storybook は Docker を要らない

DB も api も参照しないので、`docker compose` を上げずに単体で動く。フェーズ A の作業が軽い。
