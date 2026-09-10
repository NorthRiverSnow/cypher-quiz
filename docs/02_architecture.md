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
| lint / format | **Oxlint / Oxfmt**（`vp lint` / `vp fmt`） | Vite+ 同梱。`typeAware` で型情報を使うルールも使える |
| テスト | **Vitest**（`vp test`） | Vite+ 同梱 |
| 構成 | pnpm workspaces のモノレポ | `shared` の Zod を web と api の両方から参照するため。Vite+ が pnpm を検出してそのまま使う |

### api が使うもの

**全てのルートが同じものを通る。** ルートを足すときに選び直さない。

| 何に | 何を | どこで |
|---|---|---|
| ルーティング・OpenAPI | `@hono/zod-openapi` | 器は [`createRouter()`](./03_api.md#器は-createrouter-から作る)。`new OpenAPIHono()` を直に書かない |
| ドキュメント UI | `@scalar/hono-api-reference` | `api.ts` の `/docs`。ルートは触らない |
| HTTP サーバ | `@hono/node-server` | `server.ts` だけ。**終了の合図もここで受ける** |
| スキーマ・検証 | `zod`（素の。Hono に依存しない） | `shared/src/schema/`。OpenAPI の付加情報は `.meta()` で載せる |
| DB | `neo4j-driver` v5 | `neo4j/` だけ。**`driver.session()` は [`tx.ts`](./03_api.md#9-トランザクション) が唯一の呼び出し元** |
| 実行 | `tsx`（watch と スクリプト） | `vp run api` と `openapi:write` |

**web は Hono も neo4j-driver も知らない。** `shared` の Zod から `z.infer` で型を取るだけ。

書き方は Skill の `api-new`。

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
  open:  (request: OpenRequest) => Promise<Result<string, ApiError>>;
  get:   (id: string | undefined) => Promise<Session | undefined>;
  close: (id: string | undefined) => Promise<void>;
  sweep: () => Promise<number>;
};

// クラスではない。Map への変更はこの関数の中だけに閉じる
export const createDriverStore = (deps: StoreDeps): DriverStore => { ... };
```

`get` が非同期なのは、**失効した接続をその場で閉じる**ため。同期にすると、閉じる相手を
別の誰かに預けることになる。`id` が `undefined` を取るのは、クッキーが無い要求をそのまま
渡せるようにするため。

時刻（`now`）・識別子（`newId`）・ドライバの生成（`createDriver`）は[注入する](#時刻乱数を注入する)。
**保管庫が持つのは `driver` / `uri` / `database` / `mode` だけで、`password` は持たない。**

### 副作用の扱い

**想定内の失敗は例外を投げず `Result` で返す。**

| 分類 | 例 | 扱い |
|---|---|---|
| 想定内の失敗 | 接続失敗、書き込み拒否、構文エラー、タイムアウト | `Result` の `err` |
| 想定外 | バグ | `throw` する。`Result` に包まない |

### 失敗の経路

```
model            Result で返す。throw する API は shared の attempt / recover で包む
controller       report(kind, result, describe) に渡す。err で積み、ok で取り下げる
view             通知を props で受けて描くだけ
```

**`try` を書くのは `shared/result.ts` の 2 つだけ。** どちらを使うかは
[利用者に知らせるか](./01_spec.md#8-失敗の伝え方)で決まる。

| | 使うもの | 返るもの |
|---|---|---|
| 知らせる | `attempt` | `Result`。controller が `report` に渡す |
| 知らせない | `recover` | 値そのもの。throw したら代わりの値 |

**`recover` は握り潰しではない。** 握り潰しは、知らせるべき失敗が誰にも見えない状態のこと。
`recover` は知らせないと決めた失敗にだけ使い、決めた理由をコードに `why:` で書く。

**通知の帯は `routes.tsx` が `<Routes>` の外で組み、ページに props で渡す。**
ページの中で組むと遷移のたびに作り直され、読む前に消える。context は使わない——
View が controller を知らない構造を保つため、渡すのは `ReactNode` の穴だけにする。

**想定外の例外は 2 箇所で受ける。どちらも 1 度きりの仕掛け。**

| | 拾うもの | 置き場所 |
|---|---|---|
| `view/templates/ErrorBoundary` | 描画中の例外 | `main.tsx` が `AppRoutes` を包む |
| `controller/useGlobalErrors` | `window` の `error` / `unhandledrejection` | `routes.tsx` で 1 回だけ呼ぶ |

`shared` に自前の `Result` を置く（`ok` / `err` / `isOk` / `map` / `mapErr` / `flatMap` / `unwrapOr` / `attempt` / `recover`）。

**バックエンドも同じ道具で同じ形にする。**

```
neo4j / 検証     Result で返す。throw する API は attempt で包む
tx.ts            セッションを開き、閉じ、失敗を ApiError に変える。ルートは session() を呼ばない
ルート           Result を HTTP に変える。ここだけが status を決める
app.onError      すり抜けた例外。500 と error ログ。スタックは外に出さない
```

**1 リクエスト = 1 トランザクション。** 並行処理が無いので、それ以上の粒度を持たない。
読み取りモード・タイムアウト・クエリログを 1 箇所に寄せられる（[`03_api.md`](./03_api.md#9-トランザクション)）。

返す形とログの規約は [`03_api.md`](./03_api.md#7-失敗の返し方)。**フロントは `code` で分岐し、
`message` の文言では分岐しない。**

```ts
// packages/shared/src/result.ts
export type Result<T, E> =
  | { ok: true;  value: T }
  | { ok: false; error: E };
```

> `neverthrow` も候補だが、必要な合成が浅いので依存を増やさない。

### 時刻・乱数を注入する

- **TTL 判定** — `Clock = () => number` を受け取る
- **出題順** — シード付き擬似乱数を使う。シードはセッションの初めに引く

**`reqId` だけは注入しない。** 渡させると、呼ぶ側が「今どのリクエストか」を知っている
必要が出る。`AsyncLocalStorage` に載せて、ログが書き出す直前に引く
（[`03_api.md`](./03_api.md#reqid-を持ち回さない)）。

出題順は[毎回ランダム](./01_spec.md#6-復習間隔反復)だが、シードを渡せば同じ並びを再現できる。
テストは固定シードで並びを確かめる。

---

## 3. 境界を機械で守る

**規約ではなく `vp lint`（Oxlint）でエラーにする。** React は View と Controller が混ざりやすいので、人の注意力に頼らない。設定は root の `vite.config.ts` 1 箇所に置く。

```ts
// vite.config.ts（抜粋）
const NO_LOGIC = ["**/model/**", "**/controller/**"];

lint: {
  options: { typeAware: true, typeCheck: true },
  overrides: [
    {
      // Model は React も DOM も、上の層も知らない
      files: ["packages/web/src/model/**"],
      rules: {
        "no-restricted-imports": ["error", {
          patterns: ["react", "react-dom", "**/view/**", "**/controller/**"],
        }],
      },
    },
    {
      // View はロジックも副作用も知らない。型は types.ts と @cypher-quiz/shared から取る
      files: ["packages/web/src/view/**"],
      rules: { "no-restricted-imports": ["error", { patterns: NO_LOGIC }] },
    },
    {
      // 結線の層。controller は呼ぶが、model には触らない
      files: ["packages/web/src/routes.tsx", "packages/web/src/main.tsx"],
      rules: { "no-restricted-imports": ["error", { patterns: ["**/model/**"] }] },
    },
    // アトミックデザインの層。下の層しか import できない
    {
      files: ["packages/web/src/view/atoms/**"],
      rules: {
        "no-restricted-imports": ["error", {
          patterns: [...NO_LOGIC, "**/molecules/**", "**/organisms/**", "**/templates/**", "**/pages/**"],
        }],
      },
    },
    // molecules / organisms / templates も同じ形（上の層と NO_LOGIC を並べる）
    {
      // api のルートは HTTP だけ。DB には controller を通してしか触らない
      files: ["packages/api/src/routes/**"],
      rules: { "no-restricted-imports": ["error", { patterns: ["**/neo4j/**"] }] },
    },
    {
      // api の controller は HTTP を知らない。Hono もクッキーも import しない
      files: ["packages/api/src/controller/**"],
      rules: {
        "no-restricted-imports": ["error", {
          patterns: ["hono", "hono/*", "**/routes/**", "**/cookie"],
        }],
      },
    },
  ],
}
```

**View の各層には `NO_LOGIC` を書き足す。** 同じファイルに override が 2 つ当たると
**後の設定が前を置き換える**（マージされない）ので、アトミックデザインの規則だけを書くと
MVC の禁止が消える。

`**/molecules/**` のような glob が `../../molecules/Note` のような相対 import にも一致することは実測済み。
**7 方向を確認した**——`view` → `model`、`view` → `controller`、`pages` → `model`、
`routes.tsx` → `model`、`model` → `react`、`atoms` → `molecules` はすべてエラーになり、
`controller` → `model` は通る。

api 側も **3 方向を確認した**——`routes` → `neo4j`、`controller` → `hono`、
`controller` → `cookie` はエラーになり、`controller` → `neo4j` と `routes` → `controller` は通る。

### api も同じ形にする

| 層 | 何を置くか | 禁止 |
|---|---|---|
| **routes** | クッキーの読み書き、ボディの検証、`Result` → ステータス | `neo4j/` の import |
| **controller** | 手順の判断（繋ぐ順番、失効の扱い） | `hono` / `cookie` の import |
| **neo4j** | ドライバとの往復 | — |

**ルートに手順を書かない。** 書くと、繋ぐ順番のような判断が HTTP の組み立てに埋もれ、
別のルートから同じ手順を呼べなくなる。ルートを読んで分かるのは
「何を受け取り、何を返し、どのステータスにするか」だけにする。

### テストは 2 段に置く

| 置き場所 | 何を渡すか | 何を確かめるか |
|---|---|---|
| `src/**/*.test.ts` | 偽の依存（偽の `DriverStore` など） | その部品の契約 |
| `test/*.test.ts` | **本物だけ**（ミドルウェア → ルート → controller → store → ドライバ） | HTTP の入口と出口 |

**`test/` は `app.request()` から叩く。** 偽物を 1 つも置かないので、層の繋ぎ間違い
（クッキー名の食い違い、渡し忘れ）がここで出る。**境界の lint は `src/` にだけ掛かる**
——`test/` は全ての層を組むのが仕事なので、掛けると組めない。

組み立ては `test/api.ts` の `createTestApi()` に 1 本化する。**ルートを足したらここに載せる**
——テストごとに組むと、載せ忘れたルートがテストの中だけ存在しない状態になる。
`send(method, path, { cookie, body })` と、`Set-Cookie` を次の要求に渡す `jar(res)` も
ここに置く。開いたドライバは `api.ts` の `afterEach` が閉じる。

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
| **atoms** | それ以上割れない見た目 | 状態を持たない。`Icon` / `Text` / `ProgressBar` / `CodeBlock` |
| **molecules** | atoms を組んだ 1 つの役割 | 名前を付けると 1 語で言える。`Note` / `ChoiceList` / `ResultTable` |
| **organisms** | 画面の中の意味のあるかたまり | 単体で「何の部品か」が分かる。`FlashCard` / `CardBack` |
| **templates** | 配置だけ | データを一切知らない。`QuizLayout` |
| **pages** | 全状態を props で受ける | `StartPage` / `ConnectPage` / `QuizPage` / `ResultPage` |

トークンの一覧（`styles/TokenCatalog/`）はこの層に入れない。**どの部品にも属さないので
部品の story に置けず、アプリの画面でもないので `pages/` にも置けない。**
`tokens.css` の story として、対象と同じ `styles/` に co-locate する。
部品を specimen として import してよい——色は文脈に置かないと判断できないため
（コードブロックに並べて初めて青と緑の紛らわしさが分かった）。

### 見た目の書き方——インライン style と CSS Modules

**既定はインライン style。** トークンを `var(--accent)` でそのまま参照でき、部品が 1 ファイルで完結する。

**文字は [`atoms/Text`](../packages/web/src/view/atoms/Text/Text.tsx) から引く。**
`font-family` / `font-size` / `line-height` / `letter-spacing` を部品に書かない。
太さは `tokens.css` の `--weight-*` で選ぶ。
段階表は `Text.tsx` の `TEXT` で、値の一覧は [`07_design.md`](./07_design.md) にある。

`Text` は `style` も `className` も受け取らない——受け取れる口を作ると、そこから値が再び散る。
余白が要るときは `marginBottom` だけを持つラッパの div に出す。

**擬似クラスとアットルールが要るものだけ CSS Modules。** `:hover` `:active`
`@media` はインライン style では書けない。コンポーネントの `.tsx` の隣に `X.module.css` を置く。

**フォーカスリングは部品に書かない。** `tokens.css` の `:where(:focus-visible)` が
キーボードで辿れる要素すべてに出す（[`07_design.md`](./07_design.md)）。

```
view/molecules/ChoiceList/
├─ ChoiceList.tsx
├─ ChoiceList.module.css   # :hover / [aria-checked] / @media (hover: hover)
└─ ChoiceList.stories.tsx
```

`useState` で hover を持つ方法は採らない。`:focus-visible` を再現できず、
キーボード操作時の表示が劣るため。

**`*.module.css` の型宣言は `*.css` より先に書く**（`src/css.d.ts`）。
どちらもワイルドカードの接頭辞が空なので、後に書くと中身が空の `*.css` に食われて
class 名が引けなくなる（実測）。

**選択状態は `aria-checked` を CSS のセレクタにも使う。** `[aria-checked="true"]` で引けば、
状態を class と属性の二重に持たずに済む。`:hover` より後に書いて、選択中の面が上書きされないようにする。

**ただし `Text` が色を付ける要素はこの方法で塗れない。** `tone` はインライン style になり、
CSS Modules に勝つため。その場合は色を props で決める（`ChoiceList` の肢の番号）。

### story はコンポーネントを定義しない

**story を作れるのは、`*.stories.tsx` の外の `.tsx` で定義・export された React コンポーネントだけ。**
**Storybook にしか存在しないコンポーネントを許さない。**

```
view/atoms/Icon/
├─ Icon.tsx           # コンポーネントはここで定義して export する
└─ Icon.stories.tsx   # import { Icon } from "./Icon"
```

story ファイルに書いてよいのは、被写体の並べ方（`render`）・配置（`decorators`）・
サンプルデータだけ。JSX を書くこと自体は禁じていない。

見た目を決めてから中身を作る進め方（フェーズ A）では、ここが崩れると
「Storybook では出来ているのにアプリに無い」部品が量産される。

### 何を機械が守り、何を守らないか

**ESLint は使わない。** Vite+ が同梱する Oxlint で足り、2 つ目の linter とその依存を抱える価値がない。ただし `eslint-plugin-functional` にあった規則の一部は Oxlint に無いので、担保の手段が変わる。

| 守りたいこと | 手段 | 状態 |
|---|---|---|
| 層境界（Model ↛ React、View ↛ Model） | Oxlint `no-restricted-imports` + `overrides` | **実測で動作確認済み** |
| 不要な `let` | Oxlint `prefer-const` | **実測で動作確認済み** |
| 不変性 | **TypeScript の `Readonly<>` / `readonly`** | 型エラーになる。ただし付けた所だけ・浅くだけ（下記） |
| クラス禁止 | — | **機械では守らない**（下記） |

### クラスを使う唯一の場所

`view/templates/ErrorBoundary`。**React に hook 版の境界が無い**ため、ここだけクラスで書く。
境界が無いと、描画中の例外で React が木ごと外して**白い画面**になる。

持たせるのは `componentDidCatch` と `getDerivedStateFromError` だけで、出す画面は
`fallback` として外から渡す（中身を知らないまま包む）。**スタックはコンソールに残し、
画面には文言だけを出す。**

**クラス禁止だけは機械化していない。** Oxlint に該当ルールが無く、クラスは「うっかり書く」ものではないので、レビューで足りると判断した。どうしても止めたければ Oxlint の JS プラグイン（`vite.config.ts` の `lint.jsPlugins`。Vite+ 自身も 1 つ登録している）で `ClassDeclaration` を検出してエラーにする 15 行程度のプラグインを書けば済む。

### `Readonly` は付ける場所を選ぶ

**`Readonly` は「ここは共有され、書き換えたら壊れる」という設計上の宣言として使う。`const` で足りる所には付けない。** 全部に機械的に付けると、本当に不変であるべき箇所が埋もれて意味を失う。

付ける（共有され、書き換えると他所に波及する）:

| 型 | なぜ |
|---|---|
| `QuizState` とその中身 | reducer の状態。`(state, event) => state` で回すので、書き換えると React の変更検知と Model の純粋性が同時に壊れる |
| `Card` | `deck.data.ts` はモジュール共有データ。1 箇所で書き換えると全出題に波及する |

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

エラーになったときの効果は lint 警告より強い（**ビルドが止まる**）が、「付け忘れには弱い」。そこは等価な置き換えではない。

### 型は共有、ロジックは非共有

View は Model の**型**は要るがロジックは要らない。型を `shared` に置き、View は `@cypher-quiz/shared` から型だけを取る。

---

## 4. デッキ

30 枚は `model/deck.data.ts` の**固定データ**として持つ。値の出どころは
[`06_deck.md`](./06_deck.md)（guide 03 の本文）。

**抽出器は置かない。** 教材はこのリポジトリの外にあり、生成器を持つと外部への依存が残る。
30 枚は動かないデータなので、更新するときは手で直す。

**デッキはフロントだけが持つ。** API を通らないので `shared/schema/` にも入れない。
バックエンドの仕事はグラフクエリの実行だけで、[接続しなくても解ける](./01_spec.md#5-db-への接続)
という仕様がこれで成立する。

章は 6 つ。**id は安定した slug、日本語は表示ラベルとして別に持つ。** `section` は「不正解の肢を同じ章から引く」（[`01_spec.md` §2](./01_spec.md#2-出題形式)）ために使う機能上のキーなので、文言を直しても壊れない値にする必要がある。

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

出題の向きも同じ理由で型にする。View は設問と肢の書体をこの 1 つから決める——`promptKind` と `choiceKind` を別々に受けると、構文の設問に構文の肢が並ぶ組み合わせを作れてしまう。

```ts
export type Direction = 'forward' | 'reverse';   // 正順（構文 → 目的）/ 逆順（目的 → 構文）
```

習熟度は向きごとに別々に数える（[`01_spec.md` §2](./01_spec.md#2-出題形式)）。

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

// src/types.ts — Model と View が共有する
export type CodeKind = 'kw' | 'rel' | 'hl' | 'bad' | 'cm';
export type CodeSegment = { text: string; kind?: CodeKind };
```

`code` は `CodeBlock` がそのまま描けるセグメントの列で持つ。範囲（開始位置と長さ）で
持つと、View に変換の処理が要る。

**`CodeSegment` は `src/types.ts` に置く。** View は lint で `model/**` を import できないので、
`model/deck.ts` に置くと View 側が同じ型を二重に定義することになる。

### `runnable` / `mutates` はデータに書く

判定の処理を持たない。30 枚しかなく、誤判定のほうが高くつく。

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
└─ packages/
   │
   ├─ shared/src/
   │  ├─ schema/                    # ★ Zod。API を通るものだけ。型・検証・OpenAPI の源
   │  │  ├─ query.ts
   │  │  ├─ connect.ts
   │  │  └─ error.ts
   │  ├─ result.ts                  # Result
   │  └─ index.ts
   │
   ├─ api/
   │  ├─ scripts/openapi.ts            # openapi.json の書き出しと乖離検出
   │  ├─ test/                         # ★ API 経路のテスト。src の外。偽物を渡さない
   │  │  ├─ api.ts                     # createTestApi / send / jar。テストの土台
   │  │  ├─ connect.test.ts
   │  │  ├─ run.test.ts
   │  │  ├─ shutdown.test.ts            # 後始末。サーバ側の接続が消えること
   │  │  └─ openapi.test.ts
   │  └─ src/
   │     ├─ api.ts                     # ★ 全ルート + /doc + /docs。組み立てはここだけ
   │     ├─ app.ts                     # 器（ログ・例外・検証 hook）
   │     ├─ server.ts                  # 起動だけ（副作用の端）
   │     ├─ log.ts                     # ★ JSON 1 行 = 1 イベント。時刻と出力先は注入
   │     ├─ reqContext.ts              # ★ reqId を AsyncLocalStorage に載せる。引数に足さない
   │     ├─ redact.ts                  # ★ 外へ出る文字列から資格情報を取り除く唯一の関数
   │     ├─ cookie.ts                  # ★ クッキーの名前と属性。読み書きはここだけ
   │     ├─ controller/                # ★ 手順の判断。HTTP もクッキーも知らない
   │     │  ├─ connect.ts
   │     │  └─ run.ts
   │     ├─ routes/                    # ★ HTTP だけ。neo4j/ を import できない
   │     │  ├─ http.ts                 # kind → ステータスの表。ボディの検証
   │     │  ├─ connect.ts
   │     │  └─ run.ts
   │     └─ neo4j/
   │        ├─ driverStore.ts          # クロージャ。状態はここだけ
   │        ├─ tx.ts                   # ★ session() を呼ぶ唯一の場所。1 API 1 トランザクション
   │        ├─ uri.ts                  # ★ 繋ぐ前にスキームを決める純粋関数
   │        ├─ readOnly.ts             # EXPLAIN の分類を通すかに変える純粋関数
   │        ├─ toApiError.ts           # ドライバの例外を ApiError に変える。想定外だけログに残す
   │        ├─ closeQuietly.ts         # 閉じる失敗を warn に残して続ける。session も driver も
   │        └─ toPlainJson.ts          # 純粋
   │
   └─ web/
      ├─ .storybook/
      └─ src/
         ├─ main.tsx               # BrowserRouter と ErrorBoundary を張る。副作用の端
         ├─ routes.tsx             # URL とページの対応。通知の帯と道具もここで組む
         ├─ types.ts               # ★ 層をまたぐ型。model も view も import できる
         ├─ model/                  # ★ React も DOM も知らない純粋 TS
         │  ├─ deck.data.ts          # 30 枚の固定データ
         │  ├─ deck.ts               # Card の型。API を通らない
         │  ├─ question.ts          # 出題生成・不正解の肢選択
         │  ├─ quiz.ts              # QuizState / reduceQuiz / セレクタ
         │  ├─ leitner.ts           # box 遷移
         │  ├─ rng.ts               # シード付き擬似乱数
         │  └─ progress.ts          # localStorage はここだけ
         │
         ├─ view/                   # ★ 純関数。props in / callback out
         │  │                       #   アトミックデザイン。下の層しか import できない
         │  ├─ atoms/               # 最小単位。状態を持たない
         │  │  ├─ Icon/             # Material Symbols のラッパ
         │  │  ├─ ProgressBar/
         │  │  └─ CodeBlock/        # guides の .kw/.rel/.hl/.cm 体系
         │  ├─ molecules/           # atoms の組み合わせ。1 つの役割
         │  │  ├─ Note/             # Icon + 本文。注意・補足
         │  │  ├─ Notice/           # Note + 閉じるボタン
         │  │  ├─ ChoiceList/
         │  │  ├─ ResultTable/
         │  │  └─ QueryEditor/
         │  ├─ organisms/           # 意味のあるかたまり
         │  │  ├─ FlashCard/
         │  │  ├─ CardBack/
         │  │  ├─ ConnectForm/
         │  │  ├─ NoticeList/       # 通知を縦に積む。空なら何も描かない
         │  │  ├─ ErrorScreen/      # 描画に失敗したときの全面表示
         │  │  └─ Summary/
         │  ├─ templates/           # 配置だけ。データを知らない
         │  │  ├─ ErrorBoundary/    # クラスを使う唯一の場所
         │  │  ├─ Corner/           # 画面の隅に道具を固定する
         │  │  └─ QuizLayout/       # 1 カラム。通知と進捗の穴を持つ
         │  └─ pages/               # 全状態を props で受ける
         │     ├─ StartPage/
         │     ├─ ConnectPage/
         │     ├─ QuizPage/         # 表か裏のどちらか
         │     └─ ResultPage/
         │
         ├─ controller/             # model の副作用を呼べる唯一の層
         │  ├─ useNotices.ts        # 通知の一覧。report が失敗の唯一の入口
         │  ├─ useGlobalErrors.ts   # 境界が拾えない例外を通知に積む
         │  ├─ useProgress.ts       # model/progress を呼ぶ唯一の場所
         │  ├─ useTheme.ts          # data-theme と localStorage。View の外
         │  ├─ useQuiz.ts
         │  └─ useConnection.ts
         │
         ├─ fixtures/               # Storybook とテストが共有するサンプルデータ
         ├─ styles/
         │  ├─ index.ts             # CSS の入口。アプリと Storybook が同じものを読む
         │  ├─ tokens.css
         │  └─ TokenCatalog/        # tokens.css の story。層の外なので view に置かない
         └─ api/client.ts           # fetch のみ
```

### ページが純関数であることの意味

ページが「全状態を props で受ける純関数」なので、**Storybook で状態を並べて見比べられる**。

```
出題中 / 正解直後 / 不正解直後 / 実行中 / 実行エラー / 未接続 / 完了
```

これがフェーズ A（見た目を先に決める）を成立させる要。

### URL とページの対応

`src/routes.tsx` が持つ。**ページは URL も遷移も知らない。**

| URL | ページ | 進む先 |
|---|---|---|
| `/` | `StartPage` | `/connect` |
| `/connect` | `ConnectPage` | 接続 / 接続せずに始める → `/quiz` |
| `/quiz` | `QuizPage` | 最後の 1 枚の次 → `/result` |
| `/result` | `ResultPage` | もう一度 / 不正解だけ → `/quiz` |
| 上記以外 | — | `/` へ送る |

**ページに `useNavigate` を持たせない。** 持たせると story とテストに Router が必要になり、
View が遷移を知ることになる。`routes.tsx` が薄い包みを作り、そこで `navigate` に繋ぐ。

router は `react-router`（`BrowserRouter` + `Routes`）。`main.tsx` が `BrowserRouter` を張る。

テーマの切替も `routes.tsx` に置く。**どのページにも属さない道具**なので、
`templates/Corner` で画面の隅に固定し、状態は `controller/useTheme` が持つ
（`data-theme` と `localStorage` は View の外）。

---

## 6. Docker（dev）

```yaml
services:
  neo4j:       # neo4j:5。7474 / 7687。NEO4J_AUTH は .env の変数から
  neo4j-test:  # テスト専用。7475 / 7688。同じグラフを投入する
  seed:        # 一度だけ走り、両方に投入して終了する
  api:         # Hono を watch 起動。8787。C-8 で入れる
  test:        # vitest をコンテナの中で走らせる。neo4j-test に繋ぐ
```

**`api` は今ホストで動いている。** コンテナへ移すのは
[C-8](./04_roadmap.md#c-8--api-をコンテナで動かす)。コマンド名（`vp run api` / `vp run dev`）は
そのままで、中身だけ差し替える。

### 起動と終了は `vp run` から

**`docker compose` を直に叩かない。** compose のサービス名とプロファイルを覚えないと使えず、
テスト用 DB の片付けを忘れる。

| コマンド | 何が起きるか |
|---|---|
| `vp run db` | dev の DB を起動して投入する。**既に動いていても同じ結果**になる |
| `vp run api` | `db` のあと api を前面で起動する（8787。watch 付き）。**今はホスト、C-8 でコンテナへ** |
| `vp run web` | web だけ（5173）。`/api` は 8787 へ proxy される |
| `vp run dev` | `db` のあと **api と web を並行**で前面に起動する |
| `vp run db:stop` | dev の DB を止める。**データは残る**ので次の `db` で続きから |
| `vp run db:clean` | コンテナと volume を消す。次は空から投入し直す |
| `vp run test:api` | テスト用 DB を立てて api のテストを実行し、**結果に関わらず消す** |

**web や api を終了しても DB は残る。** `vp run dev` は DB を `--detach` で起動してから
前面のプロセスを動かすので、`Ctrl-C` で止まるのは前面だけ。止めたいときは `db:stop`。

**テスト用のコンテナはテスト中しか存在しない。** `profiles: [test]` を付けてあるので
`docker compose up` の対象から外れ、片付けは `trap` で必ず走る。
volume を持たないので、コンテナが消えればデータも残らない。

**片付けに `down -v` を使わない。** project の named volume を全て消すので、
dev の `neo4j-data` まで消える。テスト用のサービスだけを名指しで消す。

### コンテナの外側

**必要なのは `docker` と `docker compose` だけ。** VM の提供元は問わない
（Docker Desktop / colima / OrbStack のどれでもよい）。**`vp` は linux/arm64 でも動く**ので、
コンテナの中でもホストと同じコマンドが使える。

### api をコンテナへ移すときに要るもの

**先に片付ける 3 つ**（[C-8](./04_roadmap.md#c-8--api-をコンテナで動かす)）。

| | |
|---|---|
| `node_modules` | linux/arm64 のものを**イメージの中で作る**。ホストのものは native binary が合わない |
| watch | ソースはバインドマウント。**`node_modules` はマウントで隠さない**（named volume で退避する） |
| ツールチェーン | `vp` がコンテナの中で動くかを実測する（[C-0](./04_roadmap.md#フェーズ-c--バックエンド)） |

**`web` と Storybook はホストのまま。** Vite の dev proxy が `/api` を 8787 へ送るので、
クッキーは同一オリジンのまま通る（実測）。宛先はコンテナへ移しても 8787 のままなので、
`packages/web/vite.config.ts` は触らない。
[Storybook は今まで通り Docker 抜きで動く](#storybook-は-docker-を要らない)。

### テスト用の DB はコンテナを分ける

**Neo4j Community Edition はユーザ DB を 1 つしか持てない**（`neo4j` と `system` だけ）。
dev と分けるにはインスタンスを分けるしかない。

分ける理由は、**dev の DB がどんな状態でもテストが同じ結果を出すこと。**
`73 / 153` のような実数を検証に使う以上、手で触れる DB を相手にはできない。

**web と api のテストは分ける。** 混ぜると、フロントを 1 行直しただけで DB が立ち上がる。

| コマンド | 対象 | DB |
|---|---|---|
| `vp run test` | `shared` + `web` | 要らない。ホストで数秒 |
| `vp run test:web` | `web` だけ | 要らない |
| `vp run test:api` | `api` だけ | `neo4j-test` を立て、終わったら消す |

**`api` を root の `test.projects` に並べない。** 並べると `vp run test` が DB を求めて失敗する。
走らせる口は `test:api` の 1 つだけにする。

### `.env` は 1 つ。資格情報の出どころを分けない

`neo4j` コンテナの `NEO4J_AUTH` と、api の自動接続が**同じ `NEO4J_PASSWORD` を読む**。ズレて繋がらなくなる余地を作らない。`.env` は `.gitignore` に入れ、`.env.example` だけをコミットする。詳細は [`03_api.md`](./03_api.md#4-開発時の自動接続dev-限定)。

### データセットは投入用の Cypher に焼き込む

`seed/nordwind.cypher` の 1 ファイル。`nordwind-workshop` は**兄弟の別リポジトリ**で、
Docker のビルドコンテキストから素直に参照できない。

**JSON を置いて読み込み器を書く形は取らない。** 読み込み器を動かすために seed コンテナへ
Node か Python を入れることになる。焼き込めば `neo4j:5` の `cypher-shell` だけで投入でき、
依存が 1 つも増えない（デッキを固定データで持つのと同じ判断）。

投入の順序と `MERGE` の形は nordwind-workshop の session3 と同じ。ノードを先に作り、
リレーションシップは両端が揃ってから繋ぐ。元との一致はファイル先頭の checksum で辿れる：

```
9d4eb12de6e731df3ee4d050df931922
```

**先頭で `MATCH (n) DETACH DELETE n` する。** 何度流しても同じ 73 / 153 になる。

### Storybook は Docker を要らない

DB も api も参照しないので、`docker compose` を上げずに単体で動く。フェーズ A の作業が軽い。
