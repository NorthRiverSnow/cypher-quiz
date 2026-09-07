# 意匠の現行仕様

**このファイルが意匠の正。** 実装（`packages/web/src/styles/tokens.css` と
`packages/web/src/view/atoms/Text/Text.tsx`）はここに従う。

値は下の制約（[§3](#3-色を決めるときの制約)）を満たすように決めてある。

---

## 1. テーマは 3 ブロック

```css
:root                                 /* light を既定にする */
@media (prefers-color-scheme: dark)   /* OS 設定に追従。[data-theme="light"] で打ち消せる */
:root[data-theme="dark"]              /* 手動切替を OS 設定より優先させる */
```

`@media` 側のセレクタが `:root:not([data-theme="light"])` なのは、OS が dark でも
手動で light を選べるようにするため。

**dark は light と同じ色相を使う。** 揃えないとテーマ切替で色味が飛ぶ（色相のずれは最大 4.5°）。
暗い面の上なので明度は高く取り、コントラストは 7.0〜8.7 になる。

---

## 2. パレット

### 面と文字

| トークン | light | dark | 役割 |
|---|---|---|---|
| `--ground` | `#eef5fa` | `#0a1119` | ページの地 |
| `--panel` | `#ffffff` | `#111c28` | カードの面 |
| `--panel-sunken` | `#f4f8fb` | `#16222f` | くぼんだ面。コードブロック、肢の hover |
| `--ink` | `#15232f` | `#dce7f1` | 本文 |
| `--ink-soft` | `#394f65` | `#b3c4d3` | 弱い本文 |
| `--muted` | `#647789` | `#8ba0b5` | ラベル、コメント |
| `--rule` | `#c8d6e2` | `#27384a` | 罫線 |
| `--rule-soft` | `#e0e9f1` | `#1d2c3b` | 弱い罫線 |

### 意味色

| トークン | light | dark | 役割 |
|---|---|---|---|
| `--accent` | `#006bf0` | `#86baff` | 構造・キーワード → 選択中の肢、進捗バー |
| `--keep` | `#008509` | `#44d94e` | 正解 → 正答の罫線、正しい肢、コード中のリレーション型 |
| `--alarm` | `#de1f2d` | `#ff938b` | 誤り → 誤答の罫線、誤った肢 |
| `--warn` | `#8f6d00` | `#e3af00` | 注意 → 罠、引っかけの注記 |

### 淡い面

| トークン | light | dark | 役割 |
|---|---|---|---|
| `--accent-bg` | `#dbe9ff` | `#0d2444` | 選択中の肢の面 |
| `--keep-bg` | `#dcf5d5` | `#082c0c` | 正解の面 |
| `--alarm-bg` | `#ffe3e1` | `#3c1614` | 誤答の面 |
| `--warn-bg` | `#faeed1` | `#302200` | 注意の面 |

### エンティティ色

結果表のノード種別チップにしか出ない。

| トークン | light | dark | ノード |
|---|---|---|---|
| `--team` | `#bf5000` | `#ff8d44` | Team |
| `--engineer` | `#a144d8` | `#d798ff` | Engineer |
| `--service` | `#008076` | `#00d4c5` | Service |
| `--incident` | `#da1d69` | `#ff8dab` | Incident |

### 影・版面・書体

| トークン | 値 |
|---|---|
| `--shadow`（light） | `0 1px 2px rgba(15, 26, 36, 0.06), 0 8px 24px -16px rgba(15, 26, 36, 0.35)` |
| `--shadow`（dark） | `0 1px 2px rgba(0, 0, 0, 0.5), 0 10px 30px -18px rgba(0, 0, 0, 0.9)` |
| `--col` | `40rem`（本文の measure） |
| `--wide` | `62rem`（コンテナ幅） |
| `--font-serif` | `"Zen Old Mincho", "Hiragino Mincho ProN", serif` |
| `--font-sans` | `"Zen Kaku Gothic New", "Hiragino Sans", "Yu Gothic", system-ui, sans-serif` |
| `--font-mono` | `"IBM Plex Mono", "Zen Kaku Gothic New", ui-monospace, monospace` |
| `--font-icon` | `"Material Symbols Rounded"` |

書体は Google Fonts から読む。`packages/web/index.html` と
`packages/web/.storybook/preview-head.html` の両方に置く（Storybook はアプリの HTML を使わない）。

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Zen+Old+Mincho:wght@700;900&family=Zen+Kaku+Gothic+New:wght@400;500;700&family=IBM+Plex+Mono:wght@400;600&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL@20,400..700,0..1&display=block">
```

`Material Symbols` は `display=block` にする。`swap` だと**フォント到着前にコードポイントが
豆腐で見える**。本文の 3 書体は `swap` でよい（フォールバックが読める字形になる）。

---

## 3. 色を決めるときの制約

OKLCH（知覚均等空間）で測る。

1. **同時に画面に出る色は OKLab 距離 0.12 以上離す**
2. **文字として出る色は `--panel-sunken` の上で AA（4.5:1）を満たす**

### 群の扱い

意味色は本文・罫線として出るので互いに 0.12 以上。**実測の最小は `--keep` ↔ `--warn` の 0.150。**

エンティティ色はチップにしか出ないので、**群内でのみ** 0.12 を要件にする。
実測の最小は dark の `--team` ↔ `--incident` の 0.122。

要件には置いていないが、**4 色とも `--panel-sunken` 上で AA を満たしている**
（light 4.51〜4.54 / dark 7.01〜8.61）。チップは塗りつぶさず、文字と罫線に色を使う。

群を跨いだ距離はこれより近い。許容している水準は次のとおり。

| 組 | light | dark |
|---|---|---|
| `--incident` ↔ `--alarm` | 0.077 | 0.050 |
| `--team` ↔ `--alarm` | 0.091 | 0.074 |

### 淡い面に自色を載せない

`*-bg` の上に対の自色を載せると、light では **3.92〜4.18 で AA に届かない**
（淡い面が `--panel-sunken` より暗いぶんコントラストが下がる。dark は 7.4〜8.2 で問題ない）。

**淡い面に文字を置くときは `--ink` / `--ink-soft` を使う。** 自色は罫線とアイコンに限る
——非テキストなので要件は 3:1（WCAG 1.4.11）で、そちらは満たしている。

### sRGB で取れない色

- **緑は 1 本しか置けない。** 緑帯で AA を満たしつつ互いに 0.12 以上離れる緑は sRGB に 2 つ取れない
  （ティールへの退避も C=0.094 が上限で、灰から 0.071 しか離れない）。
  よってコード中のリレーション型と正解は同じ `--keep` を使う
- **金は AA を保つ限り C=0.114 が上限。** `#8f6d00` が既に天井

---

## 4. 状態への割り当て

| 状態 | 使う色 |
|---|---|
| 選択中の肢 | `--accent`（罫線と `--accent-bg` の面） |
| 正答 | `--keep` |
| 誤答 | `--alarm` |
| 注意・罠 | `--warn` |
| 進捗バー | box 0 は `--rule`、box 1 は `--accent`、box 2（完了）は `--keep` |
| 結果表のノード種別チップ | `--team` / `--engineer` / `--service` / `--incident` |

**「正解」を名乗る色は `--keep` だけ。** 金（`--warn`）は注意・罠の専任で、正解には使わない。

---

## 5. 文字の段階

`view/atoms/Text/Text.tsx` の `TEXT` がこの表を持つ。**小さい順。この順序を崩さない。**

**コンポーネントに `font-size` / `line-height` / `letter-spacing` を書かない。**
段階を跨ぐ差だけが意図で、段の中の差は事故として扱う。

| variant | 書体 | 大きさ | 太さ | 行送り | 字送り | 用途 |
|---|---|---|---|---|---|---|
| `micro` | mono | `0.72rem` | 400 | 1.6 | `0.14em` | 章ラベル、`問題`、`選択肢`、カタログの見出し |
| `numeral` | mono | `0.8rem` | 400 | 1.9 | — | 肢の番号 |
| `code` | mono | `0.8rem` | 400 | 1.75 | — | コード、トークン名、実行結果 |
| `annotation` | sans | `0.875rem` | 400 | 1.75 | — | `Note` の本文、補足 |
| `prose` | sans | `1rem` | 400 | 1.75 | — | 肢の散文、本文 |
| `syntax` | mono | `1rem` | 600 | 1.9 | — | 肢の構文 |
| `titleProse` | serif | `1.125rem` | 400 | 1.75 | — | 逆順の設問 |
| `title` | mono | `1.3rem` | 600 | 1.5 | — | 正順の設問 |
| `display` | serif | `1.9rem` | 900 | 1.32 | — | カタログの見出し |

`micro` は `text-transform: uppercase` を持つ（guide の大文字マイクロラベルの型）。
和文のラベルには何も起きない。

**`Text` は `tone` を渡さないかぎり `color` を書かない。** インライン style は CSS Modules に
勝つので、常に書くと親の状態で色を変える規則が効かなくなる。

### body の既定

```css
font-size: 16.5px;
line-height: 1.9;
font-feature-settings: "palt" 1;
-webkit-font-smoothing: antialiased;
```

---

## 6. 余白の段階

`gap` / `padding` / `margin` はこの 6 段から選ぶ。**部品に rem を直接書かない。**

| トークン | 値 | 用途 |
|---|---|---|
| `--space-2xs` | `0.15rem` | 記号と文字の間、道具の隙間 |
| `--space-xs` | `0.4rem` | ラベルと中身、アイコンと本文、肢の間 |
| `--space-sm` | `0.7rem` | 器の内側（コード・注記・肢） |
| `--space-md` | `1.15rem` | 塊と塊の間 |
| `--space-lg` | `1.5rem` | カードの内側 |
| `--space-xl` | `2.5rem` | 節と節の間、ページの余白 |

**幅と高さはこの段階に含めない。** `IconButton` の 1.9rem 角のような寸法は部品が持つ。

---

## 7. コードのハイライト

**ライブラリを使わない。** 色分けは字句解析では再現できない
（変数 1 文字に強調が当たる、`ASC LIMIT` が 1 つのまとまりになる、といった編集判断がある）ので、
`CodeBlock` は色分け済みのセグメント配列を受け取る。

| 種別 | 色 | 太さ | 意味 |
|---|---|---|---|
| `kw` | `--accent` | 600 | キーワード |
| `rel` | `--keep` | 600 | リレーション型 |
| `hl` | `--warn` | 600 | 強調・リテラル |
| `bad` | `--alarm` | 600 | 誤り |
| `cm` | `--muted` | 400 | コメント |

`rel` が `--keep` なのは、[緑が 1 本しか置けない](#srgb-で取れない色)ため。

---

## 8. 面と罫線、質感

角丸 3〜4px、罫線 1px、影は極めて淡い。**アプリ UI ではなく編集物／印刷レポートの佇まい。**

**罫線と角丸も直接書かない。**

| トークン | 値 | 用途 |
|---|---|---|
| `--border-width` | `1px` | 器の罫線、章ラベルの罫線 |
| `--border-width-bold` | `2px` | 左の帯（結果・注記・肢）、フォーカスリング |
| `--radius` | `3px` | 部品（ボタン・肢・コードブロック） |
| `--radius-card` | `4px` | カード |
| `--radius-pill` | `999px` | チップ、スクロールバーの帯 |

| 要素 | 面 | 罫線 | 角丸 |
|---|---|---|---|
| カード | `--panel` | `--rule` 1px + `--shadow` | 4px |
| くぼんだ面（コードブロック） | `--panel-sunken` | `--rule-soft` 1px | 3px |
| 肢 | `--panel` → hover で `--panel-sunken` | `--rule` 1px | 3px |
| ボタン | `--accent`（無効時 `--muted`） | なし | 3px |
| 注意・補足（`Note`） | `--<tone>-bg` | 左に `--<tone>` 2px | なし |
| 道具の行（`Toolbar`） | `--ground` | 下だけ `--rule-soft` 1px | なし |

**章ラベルは `§ ラベル` の後を罫線で埋める。**

フォーカスリングは `2px solid var(--accent)` を `outline-offset: 2px` で外側に置く。
**`tokens.css` の `:where(:focus-visible)` 1 箇所だけで、キーボードで辿れる要素すべてに出す。**
部品ごとには書かない。

### スクロールバー

細い帯にする。溝は透明、帯は `--rule`、hover で `--muted`。

**溝は 12px のまま、余白で帯を細く見せる。** 掴む的は溝の幅で決まるので、
溝を細くすると帯だけでなく的も小さくなる。

**道具と本文は 1 つの枠に収める**（ツールバーと本編）。枠は組む側が持ち、
`Toolbar` と `CodeBlock`（`bare`）は面と仕切りだけを描く。

道具を本文に**重ねない**。重ねるとスクロールバーの上にボタンが乗り、
避けるために本文を削ると折り返しが早まって器が縦に伸びる。

入力欄には `scrollbar-gutter: stable` を当てる。スクロールバーが出た瞬間に字が横へ動かない。

**折り返せない連なりの扱いは要素で違う。** `pre`（`CodeBlock`）は溢れて横スクロールし、
`textarea` は強制的に割る。**編集中に横スクロールは起きない。**
枠を持つ側が `overflow: hidden` で溢れを閉じる——中の要素だけに任せると枠が中身の幅まで広がる。

| | 値 |
|---|---|
| 溝の幅 | `--scrollbar-size`（`12px`） |
| 帯の見え幅 | `4px`（透明な `4px` の罫線 + `background-clip: padding-box`） |
| 角丸 | `999px`（完全な丸） |

**標準プロパティ（`scrollbar-width` / `scrollbar-color`）と `::-webkit-scrollbar` の両方を書く。**
前者は Firefox が読み、後者があると Chrome / Safari はそちらを優先する。
片方だけだと、もう片方のブラウザで既定のままになる。

**見え方はブラウザで違う。** Firefox に太さを px で指定する手段はない。

| | Firefox | Chrome / Safari |
|---|---|---|
| 太さ | `thin`（px 指定は不可） | `4px` |
| 色 | `--rule` / 溝は透明 | 同じ |
| 角丸 | 付かない | `999px` |

`prefers-reduced-motion: reduce` のとき `animation` と `transition` を無効にする。
