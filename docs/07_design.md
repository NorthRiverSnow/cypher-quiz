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

**手動で選ぶまで `data-theme` を書かない。** 書いた時点で OS 設定への追従が止まる。
選んだ後は端末に残り、次回もその選択で開く。

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
| `--keep` | `#008509` | `#44d94e` | 正解 → 罫線と正しい肢、コード中のリレーション型 |
| `--alarm` | `#de1f2d` | `#ff938b` | 誤り → 不正解の罫線、誤った肢 |
| `--warn` | `#8f6d00` | `#e3af00` | 注意 → 罠、引っかけの注記 |

### 淡い面

| トークン | light | dark | 役割 |
|---|---|---|---|
| `--accent-bg` | `#dbe9ff` | `#0d2444` | 選択中の肢の面 |
| `--keep-bg` | `#dcf5d5` | `#082c0c` | 正解の面 |
| `--alarm-bg` | `#ffe3e1` | `#3c1614` | 不正解の面 |
| `--warn-bg` | `#faeed1` | `#302200` | 注意の面 |

### エンティティ色

結果表で、ノードとして返った値の字にしか出ない。

| トークン | light | dark | ノード |
|---|---|---|---|
| `--team` | `#bf5000` | `#ff8d44` | Team |
| `--engineer` | `#a144d8` | `#d798ff` | Engineer |
| `--service` | `#008076` | `#00d4c5` | Service |
| `--incident` | `#da1d69` | `#ff8dab` | Incident |

### 進捗バー

| 区画 | トークン | 中身 |
|---|---|---|
| 左 | `--accent` | 正解した回答 |
| 中 | `--alarm` | 間違えた回答 |
| 右 | `--rule-soft` | 完了までに残る回答 |

**数えるのは回答で、問題ではない**（[§7 の進捗バー](01_spec.md#7-画面と導線)）。

**数字を出さない。** 内訳は `aria-valuetext` で読み上げに渡す。

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
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Zen+Old+Mincho:wght@400;900&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,400..700,0..1,0&display=block">
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

エンティティ色は結果表の字にしか出ないので、**群内でのみ** 0.12 を要件にする。
実測の最小は dark の `--team` ↔ `--incident` の 0.122。

要件には置いていないが、**4 色とも `--panel-sunken` 上で AA を満たしている**
（light 4.51〜4.54 / dark 7.01〜8.61）。**面は塗らず、字の色だけで種別を示す。**
囲みを付けると 1 行の中で強く目立ち、表の他の列より重く見える。

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
| 正解 | `--keep` |
| 不正解 | `--alarm` |
| 注意・罠 | `--warn` |
| 結果表のノード | `--team` / `--engineer` / `--service` / `--incident` |

**「正解」を名乗る色は `--keep` だけ。** 金（`--warn`）は注意・罠の専任で、正解には使わない。

---

## 5. 文字の段階

`view/atoms/Text/Text.tsx` の `TEXT` がこの表を持つ。**小さい順。この順序を崩さない。**

**コンポーネントに `font-size` / `line-height` / `letter-spacing` を書かない。
太さも数値では書かない**（下の「太さ」）。
段階を跨ぐ差だけが意図で、段の中の差は事故として扱う。

| variant | 書体 | 大きさ | 太さ | 行送り | 字送り | 用途 |
|---|---|---|---|---|---|---|
| `micro` | mono | `0.72rem` | regular | 1.6 | `0.14em` | 章ラベル、`問題`、`選択肢`、カタログの見出し |
| `numeral` | mono | `0.8rem` | regular | 1.9 | — | 肢の番号 |
| `code` | mono | `0.8rem` | regular | 1.75 | — | コード、トークン名、実行結果、入力欄 |
| `annotation` | sans | `0.875rem` | regular | 1.75 | — | `Note` の本文、補足 |
| `prose` | sans | `1rem` | regular | 1.75 | — | 肢の散文、本文 |
| `syntax` | mono | `1rem` | semibold | 1.9 | — | 肢の構文 |
| `titleProse` | serif | `1.125rem` | regular | 1.75 | — | 逆順の設問 |
| `title` | mono | `1.3rem` | semibold | 1.5 | — | 正順の設問 |
| `display` | serif | `1.9rem` | black | 1.32 | — | サマリの正解率、カタログの見出し |

`micro` は `text-transform: uppercase` を持つ（guide の大文字マイクロラベルの型）。
和文のラベルには何も起きない。

**入力欄も `code`。** 入れるのは URI や識別子で、`l` と `1`、`O` と `0` を読み分けられる字が要る。

### 太さ

**数値を書かない。** `tokens.css` のトークンで面の名前を指す。

| トークン | 値 | 使う書体 | 用途 |
|---|---|---|---|
| （既定） | 400 | 全て | 本文、コード、ラベル |
| `--weight-medium` | 500 | sans、アイコン | アイコンの `wght` 軸 |
| `--weight-semibold` | 600 | mono | 肢の構文、正順の設問、コードの語句 |
| `--weight-bold` | 700 | sans | 主ボタンの文字 |
| `--weight-black` | 900 | serif | サマリの正解率、カタログの見出し |

**太いほうの面は書体ごとに 1 つずつしか読み込んでいない。** そしてその番号が書体で違う。

| 書体 | 読み込んでいる面 | 「太字」に当たる面 |
|---|---|---|
| IBM Plex Mono | 400 / 600 | **600** |
| Zen Kaku Gothic New（sans） | 400 / 500 / 700 | **700**（600 の面を持たない書体） |
| Zen Old Mincho（serif） | 400 / 900 | **900** |
| Material Symbols Rounded | 400〜700 の可変 | 任意の値が出る |

**持っていない番号を書くと近い面に丸められる。** sans に `600` と書くと 700 で描かれ、
serif に `500` と書くと 400 で描かれる。**書いた数値と出る字が食い違うので、名前で選ぶ。**

アイコンは可変書体で、`wght` 軸が `font-weight` で動く。太さだけ `font-variation-settings` から
出して、他の段と同じトークンで選べるようにしている（`FILL` と `opsz` は軸のまま）。
**アイコンは medium。** regular にすると本文と並べたときに線が細く見える。

入力できない欄は不透明度で薄くする。色を別に用意しないのは、一時的に止めているだけで
`--alarm` のような意味を持たせたくないため。

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
| `--space-2xs` | `0.15rem` | 記号と文字の間、道具の隙間、ボタンの上下 |
| `--space-xs` | `0.4rem` | ラベルと中身、アイコンと本文、肢の間 |
| `--space-sm` | `0.7rem` | 器の内側（コード・注記・肢） |
| `--space-md` | `1.15rem` | 塊と塊の間 |
| `--space-lg` | `1.5rem` | カードの内側 |
| `--space-xl` | `2.5rem` | 節と節の間、ページの余白 |

**幅と高さはこの段階に含めない。** `--tool-size` の角や進捗バーの帯の太さは部品の寸法。

---

## 7. コードのハイライト

**ライブラリを使わない。** 色分けは字句解析では再現できない
（変数 1 文字に強調が当たる、`ASC LIMIT` が 1 つのまとまりになる、といった編集判断がある）ので、
`CodeBlock` は色分け済みのセグメント配列を受け取る。

| 種別 | 色 | 太さ | 意味 |
|---|---|---|---|
| `kw` | `--accent` | semibold | キーワード |
| `rel` | `--keep` | semibold | リレーション型 |
| `hl` | `--warn` | semibold | 強調・リテラル |
| `bad` | `--alarm` | semibold | 誤り |
| `cm` | `--muted` | regular | コメント（`//`。**Cypher の一部**） |
| `note` | `--muted` | regular | 読み手への注釈（矢印・言い換え）。**Cypher ではない** |

**`note` は実行するとき落とす。** 見た目は `cm` と同じだが、そのまま送ると構文エラーになる
（`model/deck.ts` の `cypherOf`）。

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
| `--radius-pill` | `999px` | 進捗バー、スクロールバーの帯 |

| 要素 | 面 | 罫線 | 角丸 |
|---|---|---|---|
| カード | `--panel` | `--rule` 1px + `--shadow` | 4px |
| くぼんだ面（コードブロック） | `--panel-sunken` | `--rule-soft` 1px | 3px |
| 肢 | `--panel` → hover で `--panel-sunken` | `--rule` 1px | 3px |
| 押せる一覧の行 | なし → hover で `--panel-sunken` | なし | 3px |
| 結果表の行 | なし | 下に `--rule-soft` 1px | なし |

**結果表の列見出しは `code`。** 列名は Cypher の識別子（`e.name`、`up`）で、
`micro` の大文字化を通すと別の名前になる。
| ボタン（主） | `--accent`（無効時 `--muted`） | なし | 3px |
| ボタン（副） | なし → hover で `--panel-sunken` | `--rule` 1px | 3px |
| 注意・補足（`Note`） | `--<tone>-bg` | 左に `--<tone>` 2px | なし |
| 道具の行（`Toolbar`） | `--ground` | 下だけ `--rule-soft` 1px | なし |
| 入力欄（`TextField`） | `--panel-sunken` | `--rule-soft` 1px | 3px |

### 注記のアイコンの位置

**アイコンは本文の 1 行目と光学中心を合わせる。** ベースラインで揃えるだけでは合わない——
Material Symbols の字面はベースラインより上に浮いていて、字の中心より高い位置に来る。

| | 字面の上 | 字面の下 | 光学中心（ベースラインから） |
|---|---:|---:|---:|
| 本文（`annotation` 14.4px） | 11.98 | 1.07 | **5.46px** |
| アイコン（1.25rem = 20px） | 17.29 | −3.01 | **10.15px** |

差の 4.7px（`0.29rem`）だけアイコンを下げる。**折り返した 2 行目以降はアイコンの下に回らない**
（`Note` は flex の別の項目なので、字下げが保たれる）。

**閉じるボタンのような「箱」は字面ではなく箱の中心を合わせる。** 1 行目の行box
（`annotation` の大きさ × 行送り）と同じ高さの器に入れて中央寄せする。

### 通知の帯

**`Note` の姿をそのまま使う。** 通知専用の見た目を作らない——同じ「読ませたい一言」なので、
別の姿にすると同じ画面に 2 つの様式が並ぶ。右端に閉じるボタンが付くところだけが違う。

| | |
|---|---|
| 続けられる失敗 | `warn`（金） |
| 続けられない失敗 | `alarm`（赤） |
| 帯どうしの間隔 | `--space-sm` |
| 帯の束と、その下（進捗バー）の間隔 | `--space-lg`（版面の既定） |

**版面の中に置く。** 画面に固定して本文に重ねない。テーマ切替のような道具は右上に居座るが、
通知は読み終われば消えるので、専用の場所を取らない。

**通知が無いときは要素ごと消す。** 空の器を残すと版面の間隔が 1 つ増え、
通知の有無で進捗バーの位置が動く。

**入力欄のプレースホルダは `--muted`、入力できないときは不透明度 0.55。**
プレースホルダのブラウザ既定の色はテーマに追従せず、沈んだ面の上で読めない。

**ボタンの字は `annotation`、主だけ medium。** 上下の余白は `--space-2xs`、左右は `--space-md`。
本文の行送り（1.9）を継承させると背が高くなり、操作より本文のように見える。

**主と副を並べるときは、塗るのは主だけ。** 副は罫線だけにして字も太らせない。押す先が
1 つに見えるようにする。

**テーマの切替は画面の右上に固定する。** ページの中身ではなく道具なので、
どの画面でも同じ位置に居る。アイコンは切り替えた先の姿（light では ☾、dark では ☀）。

**無効の道具ボタン（`IconButton`）は不透明度 0.4。** 色を薄くすると淡い面の上で消え、
`--muted` のままだと押せるものと区別が付かない。

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

複数行の入力欄には `scrollbar-gutter: stable` を当てる。スクロールバーが出た瞬間に字が横へ動かない。

**折り返せない連なりの扱いは要素で違う。** `pre`（`CodeBlock`）と `input` は溢れて横スクロールし、
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
