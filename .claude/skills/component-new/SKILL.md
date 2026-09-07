---
name: component-new
description: view/ にコンポーネントを新しく作る手順。層の決め方、値の引き方（Text の段階表と tokens.css）、CSS Modules を使う条件、story とテストの範囲、壊して確かめる方法。既存のコンポーネントを直すときにも読む。
---

# コンポーネントを作る

## 1. 層を決める

**割ったときに何が残るかで決める。** 何を組んだかでは決めない。

| 層          | 判断                                   | 例                                        |
| ----------- | -------------------------------------- | ----------------------------------------- |
| `atoms`     | 割ると役目を失う                       | `Icon` `Button` `Card` `CodeBlock` `Text` |
| `molecules` | 割ると、それぞれ単独で使える部品に戻る | `Note`（= `Icon` + 本文）`ChoiceList`     |
| `organisms` | 画面の中の意味のあるかたまり           | `FlashCard`                               |

**`Text` と `Card` を使っても層は上がらない。** 字の型と器はどの層も引く。

上は下だけ import できる。層を跨ぐと `vp lint` がエラーにする（`vite.config.ts` の `lint.overrides`）。

## 2. 値は引く。書かない

- **文字** → `atoms/Text` の variant。`font-family` / `font-size` / `line-height` /
  `letter-spacing` を部品に書かない
- **色・幅・影** → `tokens.css` の `var(--*)`
- 新しい数値が要ると思ったら、**まず段階表に無いか見る。**
  足すなら `docs/07_design.md` も直す（docs が正）

## 3. インライン style が既定

**`:hover` `:active` `@media` が要るときだけ `X.module.css`** を隣に置く。

- `@media (hover: hover)` で囲む。指で触る端末は hover が張り付く
- **フォーカスリングは書かない。** `tokens.css` の `:where(:focus-visible)` が全要素に出す
- **選択状態は `aria-checked` を CSS のセレクタにも使う。** class を二重に持たない

### インライン style は CSS Modules に勝つ

状態で色が変わる要素に `Text` の `tone` を渡さない。渡すと
`[aria-checked="true"] .x { color: … }` で上書きできなくなる。**色を props で決める**
（`ChoiceList` の肢の番号）。

### `em` の解決先を間違えない

`Text` の**中**なら本文の字で解決される。**外なら body の字**になる。
外から本文の 1 行分の高さが欲しいときは段階表から計算する。

```tsx
const ICON_BOX = `calc(${TEXT.annotation.fontSize} * ${TEXT.annotation.lineHeight})`;
```

## 4. story

- **被写体は `*.stories.tsx` の外で定義・export された React コンポーネントだけ。**
  Storybook にしか存在するコンポーネントを作らない
- **`既定` から始める。** `すべて` は作らない
- 見せる**状態**か**比較軸**に名前を付ける
- `atoms` / `molecules` / `organisms` は必ず作る
- 書いてよいのは並べ方（`render`）・配置（`decorators`）・サンプルデータだけ
- 層の境界と見た目の書き方は `docs/02_architecture.md`、意匠の実値は `docs/07_design.md`

## 5. テスト

**書くのは振る舞い。** イベントの結線、状態の反映、データの変換——
壊れても画面を見ただけでは気づけないもの。

**書かないのは見た目。** 色・字送り・折り返しは happy-dom では検証できない
（`scrollWidth` も `clientWidth` も 0 になる。実測）。

- `vite-plus/test` から import する（`vitest` からは `vp lint` がエラーにする）
- `afterEach(cleanup)` を書く。globals を切っているので自動 cleanup が実行されない
- `vp test run` で root から全パッケージ。DOM が要るものは各パッケージの `vite.config.ts` の
  `test.environment` で指定する（root は `test.projects` で各設定を使わせているだけ）
- **例外**: 消えても画面で気づけない指定は 1 件だけ置いてよい（`CodeBlock` の `overflowX`）。
  そのときは**テスト名に「指定が残っている」と書く**——効果を検証していないことを明示する

## 6. 壊して確かめる

**わざと壊してテストが失敗しなければ、そのテストは何も守っていない。**

```
vp test related packages/web/src/view/atoms/X/X.test.tsx
```

**パスは root からの相対。** 絶対パスだと `No test files found` で 1 件も実行されずに
exit 0 になり、通ったように見える。

編集後はフックが `vp test related` で影響範囲だけ実行する（全件だとテストが増えるほど重くなる）。

## 7. 撮る

Skill の `storybook-shot`。**light / dark の両方。** 聞く前に自分で見る。
