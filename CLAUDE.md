# cypher-quiz

NordWind ワークショップの Cypher 教材（`../nordwind-workshop/guides/`）の 30 枚のカードを、
4 択のフラッシュカードとして解けるアプリ。

## 言語

やり取り・コミットメッセージ・ドキュメントはすべて**日本語**。

## 仕様と設計の正は `docs/`

| ファイル                  | 内容                                               |
| ------------------------- | -------------------------------------------------- |
| `docs/00_overview.md`     | 背景・決定事項の一覧                               |
| `docs/01_spec.md`         | 仕様のみ（技術要素を含まない）                     |
| `docs/02_architecture.md` | 関数型で MVC、境界の強制、ディレクトリ             |
| `docs/03_api.md`          | OpenAPI 自動追従、読み取り専用の多層防御、資格情報 |
| `docs/04_roadmap.md`      | フェーズ A〜D、検証項目、置いた判断                |
| `docs/05_reference.md`    | データセット、30 枚のカード、意匠の実値            |

**設計を変えるときは docs も直す。** 実装と docs が食い違ったら docs が正。

## コメントは "why" だけ

**コードを読めば分かることは書かない。** 名前と型で説明する。書くのは次の 2 つだけ。

- **なぜこの値・この手段なのか**（例: `opsz` を 20 で固定している理由）
- **なぜ書かなかったのか**（意図的な不在。コードに現れないので唯一これでしか残せない）

行頭に `why:` と書くと、後から読む人が「消してよいコメント」と区別できる。

**経緯は書かない。** 「以前は X だったが Y にした」は git log の役目。
設計の判断は `docs/`、作業の手順は `.claude/skills/` に置く。

## 進め方

**1 ステップ = 1 レビュー。各ステップの終わりで止まる。**

一度に大量のファイルを出すとレビューできない。原則 **1 ステップ 1〜3 ファイル**、
変更点が一目で追える量に留める。次のステップに勝手に進まない。

前のステップで固めたものを後のステップで黙って変えない。変える必要が出たら、
それは前のステップの設計ミスとして報告する。

## コンポーネントはアトミックデザインで置く

```
packages/web/src/view/
  atoms/  molecules/  organisms/  templates/  pages/   ← 上は下だけ import できる
```

トークンの一覧は層に属さないので `styles/TokenCatalog/`（`tokens.css` と co-locate）。

層を跨ぐ import は `vite.config.ts` の `lint.overrides` で落ちる（4 方向とも実測済み）。
判断の目安は `docs/02_architecture.md` の「View の中の層」。

**`*.stories.tsx` には story だけを書く。コンポーネントは実体ファイルから import する。**

```
view/atoms/Icon/
├─ Icon.tsx           # 実体
└─ Icon.stories.tsx   # import { Icon } from "./Icon"
```

story の中で JSX を組むと、アプリから使えないまま Storybook にだけ存在する部品ができる。

**見た目はインライン style が既定。`:hover` などの擬似クラスが要るものだけ CSS Modules**
（実体の隣に `X.module.css`）。詳細は `docs/02_architecture.md` の「見た目の書き方」。

**atoms / molecules / organisms は必ず story を作る。** ここまでが単体で見て判断できる粒度。
`templates` と `pages` は必要に応じて（`QuizScreen` は全状態を並べるので作る）。

**story は `既定` から始め、あとは見せる状態か比較軸に名前を付ける。**
全部を並べただけの `すべて` は作らない——状態でも軸でもないので、他の story の重複にしかならない。
比較したいなら `色調` `大きさ` のように軸を名前にする。`styles/トークン` はカタログなので例外。

## 見た目は自分で確認する

**見た目を変えたら、聞く前に撮って確認する。** 判断を仰ぐのは「どちらが好みか」だけに絞る。
手順は Skill の `storybook-shot`（Chrome を headless で叩く。依存の追加は不要）。

## コマンドは `vp`（Vite+）

`npm` / `pnpm` を直接叩かない（hook で `npm` は禁止してある）。

**Vite+ はパッケージマネージャではない。** `vp pm`（Forward a command to the package manager）が
示すとおり pnpm に委譲している。依存操作は `vp add` / `vp install` などで足りるが、
**`pnpm-lock.yaml` と `pnpm-workspace.yaml` は消さない。** 後者は catalog の定義そのもので、
`"vite": "catalog:"` が 4 か所から参照している。消すと vite / vite-plus 自身が解決できなくなる。

```
vp check                     fmt + lint + typecheck
vp -C packages/web build     root では対象パッケージが必要
vp run -F './packages/*' <t> packages 配下だけ
vp test run                  Vitest（root から全パッケージ）
vp dlx <pkg>                 npx の代わり
vp run storybook             Storybook（6006）
```

## テストは Vitest

`vp test run` で root から全パッケージ。DOM が要るものは各パッケージの `vite.config.ts` で
`test.environment` を指定する（root は `test.projects` で各設定を使わせているだけ）。

**`vitest` からではなく `vite-plus/test` から import する**（`vp lint` が落とす）。
`@testing-library/react` の自動 cleanup は globals を切っていると走らないので `afterEach(cleanup)` を書く。

**検証できるのは DOM の構造とイベントの結線まで。** happy-dom はレイアウトも描画もしないので、
`:hover` や配色は Skill の `storybook-shot` で撮って確かめる。

編集後は hook が `vp test related` で**影響範囲だけ**流す（全件だとテストが増えるほど重くなる）。
**`related` に渡すパスは root からの相対。** 絶対パスだと `No test files found` で
何も走らないまま exit 0 になり、通ったように見える。

**スクリプトはバイナリを直接叩かず `vp run` から呼ぶ。**
`node_modules/.bin/` を直に使うと package.json と実行内容がずれる。

**`-r` は root のパッケージも選ぶ。** root に同名スクリプトがあると二重に走り、
そのスクリプト自身が `vp run -r` を呼んでいると再帰する。root から全体に流したいときは
`-F './packages/*'` を使う。

**裸のタスク名は「今いるパッケージ」に対して解決される。** 別パッケージのスクリプトを
root から呼びたいときは、root の package.json に `vp -C <dir> run <script>` を足して橋渡しする
（`storybook` はそうしてある）。`vp run <pkg>#<script>` と書いてもよい。

**`vp` はシェル関数で、実体のバイナリは PATH を通す必要がある。**
通っていないと関数の中で `command not found: vp` になる。

```
export PATH="$HOME/.local/share/vite-plus/bin:$PATH"
```

`brew` と `gh` は素で引ける（`/opt/homebrew/bin`）。`gh` は認証済み。

## git

- **`main` への直 push は hook で禁止**（`~/.claude/hooks/deny-push-main.py`）。作業ブランチを切る
- **コミットと push は毎回確認が出る**（`permissions.ask`）。勝手に実行しない
- ブランチ名は `phase-a/...` のようにフェーズを含める

## `docs/` にフォーマッタを掛けない

`vite.config.ts` の `fmt.ignorePatterns` で除外済み。**理由を消さないこと。**

`docs/` は guide からの**逐語引用**を載せる参照資料で、整形すると
`rgba(15,26,36,.06)` が `rgba(15, 26, 36, 0.06)` に書き換わって「実測値」でなくなる。
`:root { /* light */ }` の 1 行スキーマも複数行に展開されて図解の意図が消える。

## macOS の罠

**BSD の `grep` は `\b`（単語境界）を解釈しない。** これで一度、フックが
23 ケース全て素通りする状態を作った。**テキスト解析は Python を使う。**

**設定やフックは、入れる前にテストする。** 標準入力を模して直接パイプで流し、
期待どおり動くことを確認してから settings.json に書く。

## 結論する前に確認する

- `which` が空でも「未インストール」と結論しない。**絶対パスで確認する**
  （`gh` を未インストールと誤判断し、不要なトークンを作らせた）
- **リポジトリを見れば分かることを質問しない**
  （パッケージマネージャを尋ねたが `pnpm-lock.yaml` が既にあった）
- 成果物のドキュメントに、頼まれていない用語訂正や注意書きを混ぜない
