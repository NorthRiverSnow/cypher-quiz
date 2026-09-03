# 技術提案 — アーキテクチャ

仕様は [`01_spec.md`](./01_spec.md)。API とセキュリティは [`03_api.md`](./03_api.md)。

---

## 1. スタック

| 層 | 採用 | 理由 |
|---|---|---|
| 言語 | TypeScript（全層） | 指定 |
| 設計様式 | **関数型。クラスを使わない** | 指定 |
| ツールチェーン | **Vite+ 0.3.0**（`vp`） | 指定。vite 8 / vitest 4 / oxlint 1 / oxfmt / rolldown / tsdown が 1 依存に収まる |
| フロント | Vite + React | 指定 |
| コンポーネント開発 | **Storybook**（`@storybook/react-vite`） | 指定。ここから着手する |
| バックエンド | **Hono** + `@hono/zod-openapi` | 指定。OpenAPI がルート定義から導出される |
| スキーマ / 検証 | Zod（`@hono/zod-openapi` 経由） | 型・実行時検証・OpenAPI の唯一の真実にできる |
| DB ドライバ | `neo4j-driver` v5 | |
| dev 環境 | Docker Compose | 指定。環境差をなくす |
| lint / format | **Oxlint / Oxfmt**（`vp lint` / `vp fmt`） | Vite+ 同梱。`typeAware` で型情報を使うルールも効く |
| テスト | **Vitest**（`vp test`） | Vite+ 同梱 |
| 構成 | pnpm workspaces のモノレポ | `shared` の Zod を web と api の両方から参照するため。Vite+ が pnpm を検出してそのまま使う |

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

// イベントは dispatch で作ってすぐ消える短命な値なので readonly は付けない
export type QuizEvent =
  | { type: 'answered'; choiceIndex: number }
  | { type: 'advanced' }
  | { type: 'restarted'; scope: 'all' | 'wrong-only' };

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

export type DriverStore = {
  open:  (creds: Credentials) => Promise<Result<SessionId, ConnectError>>;
  get:   (id: SessionId) => Option<Driver>;
  close: (id: SessionId) => Promise<void>;
  sweep: () => Promise<number>;
};

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
  | { ok: true;  value: T }
  | { ok: false; error: E };
```

> `neverthrow` も候補だが、必要な合成が浅いので依存を増やさない。

### 時刻・乱数を注入する

- **TTL 判定** — `Clock = () => number` を受け取る
- **出題順** — シード付き擬似乱数を使う

どちらもテストで固定でき、かつ「同じシードなら同じ出題順」という[仕様 6](./01_spec.md#6-復習間隔反復)の要求をそのまま満たす。

---

## 3. 境界を機械で守る

**規約ではなく `vp lint`（Oxlint）で落とす。** React は View と Controller が混ざりやすいので、人の注意力に頼らない。設定は root の `vite.config.ts` 1 箇所に置く。

```ts
// vite.config.ts（抜粋）
lint: {
  options: { typeAware: true, typeCheck: true },
  overrides: [
    {
      files: ["packages/web/src/model/**"],
      rules: {
        // Model は React も DOM も知らない
        "no-restricted-imports": ["error", {
          patterns: ["react", "react-dom", "../view/*", "../controller/*"],
        }],
        "prefer-const": "error",
      },
    },
    {
      files: ["packages/web/src/view/**"],
      rules: {
        // View はロジックを知らない。型は @cypher-quiz/shared から取る
        "no-restricted-imports": ["error", {
          patterns: ["../model/*", "../controller/*"],
        }],
      },
    },
    // アトミックデザインの層。下の層しか import できない
    {
      files: ["packages/web/src/view/atoms/**"],
      rules: {
        "no-restricted-imports": ["error", {
          patterns: ["**/molecules/**", "**/organisms/**", "**/templates/**", "**/pages/**"],
        }],
      },
    },
    {
      files: ["packages/web/src/view/molecules/**"],
      rules: {
        "no-restricted-imports": ["error", {
          patterns: ["**/organisms/**", "**/templates/**", "**/pages/**"],
        }],
      },
    },
    // organisms は templates / pages を、templates は pages を禁止（以下同様）
  ],
}
```

`**/molecules/**` のような glob が `../../molecules/Note` のような相対 import にも効くことは実測済み。
**4 方向すべて確認した**——atoms→molecules は落ち、molecules→atoms は通り、
organisms→molecules は通り、organisms→pages は落ちる。

### 各層の禁止事項

| 層 | 禁止 | 許可 |
|---|---|---|
| **Model** | `react` / `react-dom` の import、`document` / `window`、クラス、`let`、破壊的変更 | `localStorage` は `progress.ts` の 1 ファイルのみ |
| **View** | `model/` と `controller/` の import、`fetch`、`useEffect` | ローカルな入力エコー用の `useState` のみ |
| **Controller** | — | Model と View の両方を知ってよい唯一の層 |

### View の中の層（アトミックデザイン）

**上の層は下の層だけを import できる。** 横（同じ層どうし）も禁止。

| 層 | 何を置くか | 判断の目安 |
|---|---|---|
| **atoms** | それ以上割れない見た目 | 状態を持たない。`Icon` / `Chip` / `ProgressBar` / `CodeBlock` |
| **molecules** | atoms を組んだ 1 つの役割 | 名前を付けると 1 語で言える。`Note` / `ChoiceList` / `ResultTable` |
| **organisms** | 画面の中の意味のあるかたまり | 単体で「何の部品か」が分かる。`FlashCard` / `CardBack` |
| **templates** | 配置だけ | データを一切知らない。`QuizLayout` |
| **pages** | 全状態を props で受ける | `QuizScreen` のみ |
| **catalog** | 意匠の確認用 | 層の外。アプリに出ないので上下の制約を受けない |

`catalog/` を層に入れないのは、`TokenCatalog` が全トークンを並べる**資料**であって
アプリの部品ではないため。ここを `pages/` に置くと、アプリの画面と資料が同じ棚に並んでしまう。

### story はコンポーネントを定義しない

**`*.stories.tsx` には story だけを書く。** コンポーネントは同じ階層の実体ファイルから import する。

```
view/atoms/Icon/
├─ Icon.tsx           # 実体
└─ Icon.stories.tsx   # import { Icon } from "./Icon"
```

story の中で JSX を組むと、そのコンポーネントは**アプリから使えないまま Storybook にだけ存在する**。
見た目を決めてから中身を作る進め方（フェーズ A）では、ここが崩れると
「Storybook では出来ているのにアプリに無い」状態が量産される。

### 何を機械が守り、何を守らないか

**ESLint は使わない。** Vite+ が同梱する Oxlint で足り、2 つ目の linter とその依存を抱える価値がない。ただし `eslint-plugin-functional` にあった規則の一部は Oxlint に無いので、担保の手段が変わる。

| 守りたいこと | 手段 | 状態 |
|---|---|---|
| 層境界（Model ↛ React、View ↛ Model） | Oxlint `no-restricted-imports` + `overrides` | **実測で動作確認済み** |
| 不要な `let` | Oxlint `prefer-const` | **実測で動作確認済み** |
| 不変性 | **TypeScript の `Readonly<>` / `readonly`** | 型で落ちる。ただし付けた所だけ・浅くだけ（下記） |
| クラス禁止 | — | **機械では守らない**（下記） |

**クラス禁止だけは機械化していない。** Oxlint に該当ルールが無く、クラスは「うっかり書く」ものではないので、レビューで足りると判断した。どうしても止めたければ Oxlint の JS プラグイン（`vite.config.ts` の `lint.jsPlugins`。Vite+ 自身も 1 つ登録している）で `ClassDeclaration` を弾く 15 行程度のプラグインを書けば済む。

### `Readonly` は付ける場所を選ぶ

**`Readonly` は「ここは共有され、書き換えたら壊れる」という設計上の宣言として使う。`const` で足りる所には付けない。** 全部に機械的に付けると、本当に不変であるべき箇所が埋もれて意味を失う。

付ける（共有され、書き換えると他所に波及する）:

| 型 | なぜ |
|---|---|
| `QuizState` とその中身 | reducer の状態。`(state, event) => state` で回すので、書き換えると React の変更検知と Model の純粋性が同時に壊れる |
| `Card` / `Sample` | `deck.generated.ts` はモジュール共有データ。1 箇所で書き換えると全出題に波及する |

付けない（短命、または誰も書き換えない）:

| 型 | なぜ |
|---|---|
| `QuizEvent` | dispatch で作ってすぐ消える |
| `Result<T, E>` | 関数の戻り値 |
| `DriverStore` | ファクトリが 1 度作るクロージャの束。メソッドを再代入する者はいない |
| `SECTION_LABELS` | ただの定数表。`const` で足りる |
| `ConnectionStatus` | React state。丸ごと差し替えるだけ |

### 型による不変性の限界を 2 つ

**浅い。** `Readonly<>` は 1 段目しか守らない。付けるなら**全階層に付ける**必要がある。

```ts
Readonly<{ nested: { deep: number } }>            // nested の差し替えは禁止、中身は書き換え自由
Readonly<{ nested: Readonly<{ deep: number }> }>  // これで中身も守られる
```

`QuizState` が `queue: readonly QuestionKey[]` と `boxes: Readonly<Record<...>>` まで書いてあるのはこの理由。**付け忘れると静かに穴が開く** — ここが `functional/immutable-data` に対して弱い点で、lint と違って「付け忘れ」自体は誰も検出してくれない。

**コンパイル時だけ。** 実行時の保護は無い。`as unknown as` で外せるし、`JSON.parse` の戻りは型が付いていない。ただし `model/` は純関数で新しい状態を返す設計なので、そもそも書き換えるコードを書かない。実行時まで固めたければ dev 限定で `Object.freeze` を挟む余地はある。

落ちたときの効果は lint 警告より強い（**ビルドが止まる**）が、「付け忘れには弱い」。そこは等価な置き換えではない。

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
export const SECTION_LABELS: Record<SectionId, string> = {
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
├─ package.json                     # スクリプトと vite-plus 依存
├─ pnpm-workspace.yaml              # packages/* と catalog（vite → vite-plus-core）
├─ vite.config.ts                   # ★ Vite+ の fmt / lint 設定。境界ルールもここ
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
         │  │                       #   アトミックデザイン。下の層しか import できない
         │  ├─ atoms/               # 最小単位。状態を持たない
         │  │  ├─ Icon/             # Material Symbols のラッパ
         │  │  ├─ Chip/
         │  │  ├─ ProgressBar/
         │  │  └─ CodeBlock/        # guides の .kw/.rel/.hl/.cm 体系
         │  ├─ molecules/           # atoms の組み合わせ。1 つの役割
         │  │  ├─ Note/             # Icon + 本文。注意・補足
         │  │  ├─ ChoiceList/
         │  │  ├─ ResultTable/
         │  │  └─ QueryEditor/
         │  ├─ organisms/           # 意味のあるかたまり
         │  │  ├─ FlashCard/
         │  │  ├─ CardBack/
         │  │  ├─ ConnectForm/
         │  │  └─ Summary/
         │  ├─ templates/           # 配置だけ。データを知らない
         │  │  └─ QuizLayout/
         │  ├─ pages/               # 全状態を props で受ける
         │  │  └─ QuizScreen/       # 画面まるごと純関数
         │  └─ catalog/             # 意匠の確認用。アプリには出ない（層の外）
         │     └─ TokenCatalog/
         │
         ├─ controller/
         │  ├─ useQuiz.ts
         │  └─ useConnection.ts
         │
         ├─ fixtures/               # Storybook とテストが共有するサンプルデータ
         ├─ styles/                 # css と、その入口の index.ts だけ
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
