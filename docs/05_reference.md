# 参照資料

実装中に引くための事実。**ここに書いてあるものは全て実測値。**

---

## データセット

`../nordwind-workshop/dataset/` — NordWind Energy（架空の電力会社）。`seed=42` の決定論的生成。

**73 ノード / 153 リレーションシップ。**

### ノード

| ラベル | 件数 | キー | プロパティ |
|---|---:|---|---|
| `Team` | 8 | `name` | `focus` |
| `Engineer` | 30 | `name` | `role` |
| `Service` | 15 | `name` | `description`, `language` |
| `Incident` | 20 | `id` | `title`, `severity`, `date`（Neo4j `date` 型） |

```json
{"id":"T3","name":"Payments & Billing","focus":"payment processing, invoicing, tariffs"}
{"name":"Nico Robin","team_id":"T3","role":"Tech Lead","team_name":"Payments & Billing"}
{"name":"billing-engine","owner_team_id":"T3","owner_team":"Payments & Billing",
 "description":"computes invoices from usage data and tariff plans","language":"Java"}
{"id":"INC-2102","title":"Payment gateway timeout spike during evening peak","severity":"SEV1",
 "affected_services":["payment-gateway","billing-engine"],
 "responders":["Roronoa Zoro","Nico Robin","Misato Katsuragi"],
 "root_cause_key":"connection_pool","date":"2025-08-05"}
```

### リレーションシップ

エッジにプロパティは無い。

| 型 | 件数 | 向き | カーディナリティ |
|---|---:|---|---|
| `RESPONDED_TO` | 52 | Engineer → Incident | 1 件あたり 2〜4 人。**Killua Zoldyck は 0 件** |
| `AFFECTED` | 35 | Incident → Service | 1 件あたり 1〜3 サービス |
| `MEMBER_OF` | 30 | Engineer → Team | エンジニア 1 人 = 必ず 1 チーム |
| `DEPENDS_ON` | 21 | Service → Service | **向きが意味を持つ**。矢印方向に非循環 |
| `OWNS` | 15 | Team → Service | サービスには必ず 1 つの所有チーム |

### 値の範囲

| 項目 | 値 |
|---|---|
| `Team.id` | T1〜T8 |
| `Incident.id` | INC-2101〜INC-2120 |
| `severity` | SEV1: 6 件 / SEV2: 9 件 / SEV3: 5 件 |
| `date` | 2025-07-16 〜 2026-04-12 |
| `Service.language` | Go / Python / Java / TypeScript |

### `DEPENDS_ON` の全 21 エッジ

サービス依存グラフの全体。可変長パスの問題を作るときに引く。

```
grid-monitor        → telemetry-ingest      customer-portal    → mobile-api
dispatch-optimizer  → grid-monitor          customer-portal    → billing-engine
dispatch-optimizer  → forecast-service      customer-portal    → auth-service
mobile-api          → auth-service          customer-portal    → api-gateway
mobile-api          → billing-engine        outage-notifier    → grid-monitor
billing-engine      → payment-gateway       outage-notifier    → customer-portal
billing-engine      → tariff-service        reporting-service  → data-lake-sync
billing-engine      → meter-reader          reporting-service  → billing-engine
data-lake-sync      → telemetry-ingest      forecast-service   → data-lake-sync
data-lake-sync      → meter-reader          api-gateway        → auth-service
payment-gateway     → auth-service
```

### 検証に使える値

| クエリ | 期待値 |
|---|---:|
| `MATCH (n) RETURN count(n)` | 73 |
| `MATCH ()-[r]->() RETURN count(r)` | 153 |
| `manifest.json` の checksum | `9d4eb12de6e731df3ee4d050df931922` |

---

## 30 枚のカード

`guides/03_cypher_reference_ja.html` から機械抽出したもの。**`name` が出題の表、`role` が裏。**

`実行` 列: ● = 単体で実行でき期待結果もある（22 枚） / ✍ = 書き込み系、実行させない（5 枚） / ─ = 構文列挙のみ

### `skeleton` — 読み取りの骨格

| id | name | role | 実行 |
|---|---|---|:-:|
| `match` | `MATCH` | グラフの中から、指定した形に当てはまる組み合わせをすべて探して行にする。SQL の FROM + JOIN。 | ● |
| `optional-match` | `OPTIONAL MATCH` | 見つからなくても行を捨てず、変数を `null` にして通す。SQL の LEFT OUTER JOIN。 | ● |
| `where` | `WHERE` | 直前の MATCH または WITH の結果を絞る。置く位置で意味が変わる。 | ● |
| `with` | `WITH` | クエリを前半と後半に区切り、結果を渡す関所。集約・スコープ切断・集約後の絞り込みが同時に起きる。 | ● |
| `return` | `RETURN` | 最終的に何を返すか。AS で列名を付ける。 | ─ |

### `patterns` — パターンの書き方

| id | name | role | 実行 |
|---|---|---|:-:|
| `node` | `( )` — ノード | 丸括弧。中に 変数・ラベル・プロパティ を好きな組み合わせで書く。 | ─ |
| `edge` | `-[ ]->` — リレーション | 角括弧と矢印。向きは「探索の通行方向」を決める。 | ● |
| `varlen` | `*1..3` — 可変長パス | 同じ型のエッジを 1〜3 回続けて辿る。深さが未知の問いに効く。 | ● |
| `path` | `p = (…)` — パス変数 | マッチしたパス全体を変数に取る。証跡（evidence path）を見せるときの定番。 | ● |
| `shortest` | `shortestPath / allShortestPaths` | 2 点間の最短経路。探索は幅優先で、全パス列挙より圧倒的に速い。 | ● |
| `exists` | `EXISTS { } / COUNT { }` | 「そういう繋がりがあるか／いくつあるか」を、行を増やさずに問う。 | ● |

### `shaping` — 結果の整形

| id | name | role | 実行 |
|---|---|---|:-:|
| `orderby` | `ORDER BY` | 並べ替え。WITH の後にも RETURN の後にも置ける。 | ● |
| `skiplimit` | `SKIP / LIMIT` | 件数を切る。ページングにも、探索の暴走止めにも使う。 | ● |
| `distinct` | `DISTINCT` | 重複を落とす。RETURN 全体にも、集約関数の中にも掛けられる。 | ─ |
| `union` | `UNION / UNION ALL` | 2 つのクエリの結果を縦に繋ぐ。列名と列数が一致している必要がある。 | ● |

### `lists` — リストと集約

| id | name | role | 実行 |
|---|---|---|:-:|
| `aggregates` | `count / sum / avg / min / max` | 集約関数。置いた瞬間に、集約でない項目がグループ化キーになる。 | ● |
| `collect` | `collect( )` | 複数行を 1 つのリストに畳む。「一覧を 1 行で見せる」ときの主力。 | ● |
| `unwind` | `UNWIND` | collect の逆。リストを行に開く。データ投入の定番。 | ● |
| `comprehension` | パターン内包表記 | パターンの結果をその場でリストにする。WITH を挟まずに済む。 | ● |
| `listfn` | リスト関数・述語 | リストを検査したり畳んだりする。 | ● |
| `case` | `CASE / coalesce` | 条件分岐と null 埋め。表示の整形でよく使う。 | ─ |

### `writing` — 書き込み

| id | name | role | 実行 |
|---|---|---|:-:|
| `create` | `CREATE` | 無条件に作る。重複チェックをしないので、再実行すると増える。 | ✍ |
| `merge` | `MERGE` | 「あれば使う、無ければ作る」。冪等なので何度実行しても同じ状態になる。 | ✍ |
| `set` | `SET / REMOVE` | プロパティとラベルの付け外し。 | ✍ |
| `delete` | `DELETE / DETACH DELETE` | 消す。リレーションが残っているノードは普通には消せない。 | ✍ |
| `foreach` | `FOREACH` | リストの各要素に更新処理を掛ける。更新専用で、読み取りは書けない。 | ✍ |

### `subqueries` — サブクエリ・スキーマ・診断

| id | name | role | 実行 |
|---|---|---|:-:|
| `callsub` | `CALL { }` — サブクエリ | 独立したクエリを中に埋め込む。「行ごとに上位 N 件」が書ける。 | ● |
| `callproc` | `CALL … YIELD` — プロシージャ | 組み込みの手続きを呼ぶ。スキーマの確認によく使う。 | ● |
| `schema` | `CONSTRAINT / INDEX` | 一意性の保証と、起点ノード探索の高速化。 | ─ |
| `explain` | `EXPLAIN / PROFILE` | 実行計画を見る。同じクエリの頭に付ける 2 つのモードで、出る情報が違う。 | ● |

---

## 教材で確認済みの実行結果

裏面の「期待される実行結果」として静的に持てるもの。抜粋。

| カード | クエリの主旨 | 結果 |
|---|---|---|
| `optional-match` | 全エンジニアと対応件数、昇順 1 件 | `Killua Zoldyck  0` |
| `with` | 2 チーム以上がまたがったインシデント数 | 52 行 → 20 行 → 13 行 → **13** |
| `varlen` | `customer-portal` の `*1..3` upstream | 14 パス → DISTINCT **7 件** |
| `orderby` | severity ごとの件数 | SEV2 9 / SEV1 6 / SEV3 5 |
| `skiplimit` | 被依存数の上位 2 件 | `auth-service 4` / `billing-engine 3` |
| `shortest` | customer-portal → telemetry-ingest | 3 ホップ（outage-notifier → grid-monitor 経由） |
| `path` | Winry Rockbell の証跡パス | `[Winry Rockbell, INC-2105, billing-engine, payment-gateway]` |
| `union` | Go のサービス + チーム | 5 + 8 = **13 行** |
| `where` | SEV1 かつ 2026 年以降 | INC-2118 / INC-2120 の **2 行** |
| `callsub` | チームごとに 1 サービス | **8 行** |

### 1 語の変更で答えが変わる例（[仕様 4](./01_spec.md#4-クエリの実行と編集) の根拠）

| 変更 | 変化 |
|---|---|
| `OPTIONAL MATCH` → `MATCH` | Killua Zoldyck が消えて 29 人 |
| `count(DISTINCT t)` → `count(t)` | **13 → 20** |
| `*1..3` → `*1..1` | 7 件 → 4 件 |
| `-[:DEPENDS_ON*]-` → `-[:DEPENDS_ON*]->` | 3 ホップ → **0 件** |

---

## 意匠

guides の 3 ファイルは **JS ゼロ・単一 HTML・インライン CSS 変数**。このクイズアプリが**このプロジェクト初の `<script>` を持つページ**になる。

### テーマの構造

3 ブロック構成。**light 既定 + 自動 dark + 手動上書きフック。**

```css
:root { /* light */ }

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* dark */ }
}

:root[data-theme="dark"] { /* dark（同値） */ }
```

guides には切替 UI が無い（JS がないため）。**このアプリでは `document.documentElement.dataset.theme` を触るトグルを付けられる。**

### パレット

| 変数 | light | dark | 意味 |
|---|---|---|---|
| `--ground` | `#eaeef2` | `#0a1119` | 背景 |
| `--panel` | `#ffffff` | `#111c28` | カード面 |
| `--panel-2` | `#f3f6f9` | `#16222f` | コードブロック背景 |
| `--ink` | `#0f1a24` | `#dce7f1` | 本文 |
| `--ink-soft` | `#35475a` | `#b3c4d3` | 弱い本文 |
| `--muted` | `#5d6d7d` | `#8ba0b5` | ラベル・コメント |
| `--rule` | `#c9d4de` | `#27384a` | 罫線 |
| `--rule-soft` | `#dde5ec` | `#1d2c3b` | 弱い罫線 |
| **`--accent`** | `#0b6d86` | `#4cc9f0` | **構造・リンク・キーワード** |
| `--accent-bg` | `#e2eff3` | `#0f2c38` | |
| **`--trace`** | `#8a5a05` | `#fbbf24` | **答え・根拠パス** |
| `--trace-bg` | `#f8efd9` | `#33270a` | |
| **`--alarm`** | `#b3261e` | `#f87171` | **誤り・危険** |
| `--alarm-bg` | `#fbe9e7` | `#33161a` | |
| **`--keep`** | `#047857` | `#34d399` | **フィルタを通過して残る行** |
| `--keep-bg` | `#e2f2ea` | `#0e2a21` | |
| `--team` | `#b45309` | `#f59e0b` | エンティティ色 |
| `--engineer` | `#2563eb` | `#7aaeff` | 〃 |
| `--service` | `#047857` | `#34d399` | 〃 |
| `--incident` | `#c2261d` | `#f87171` | 〃 |

```css
--shadow: 0 1px 2px rgba(15,26,36,.06), 0 8px 24px -16px rgba(15,26,36,.35);  /* light */
--shadow: 0 1px 2px rgba(0,0,0,.5),     0 10px 30px -18px rgba(0,0,0,.9);      /* dark  */
--col:  40rem;    /* 本文の measure */
--wide: 62rem;    /* コンテナ幅 */
```

### クイズの状態への割り当て

| 状態 | 使う変数 |
|---|---|
| 選択中の肢 | `--accent` |
| 正答 | `--keep` |
| 誤答 | `--alarm` |
| 正解の提示・カード裏 | `--trace` |
| 進捗バー | `--accent` |
| 結果表のノード種別チップ | `--team` / `--engineer` / `--service` / `--incident` |

### タイポグラフィ

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Zen+Old+Mincho:wght@700;900&family=Zen+Kaku+Gothic+New:wght@400;500;700&family=IBM+Plex+Mono:wght@400;600&display=swap">
```

| 用途 | フォント |
|---|---|
| 見出し（h1 / h2） | `Zen Old Mincho`, `Hiragino Mincho ProN`, serif |
| 本文 | `Zen Kaku Gothic New`, `Hiragino Sans`, `Yu Gothic`, system-ui |
| コード・ラベル | `IBM Plex Mono`, `Zen Kaku Gothic New`, ui-monospace |

```css
body {
  font-size: 16.5px;
  line-height: 1.9;
  -webkit-font-smoothing: antialiased;
  font-feature-settings: "palt" 1;
}
```

大文字マイクロラベルの型: `font-size: .68–.72rem; letter-spacing: .14–.22em; text-transform: uppercase;`

### シンタックスハイライト

**ライブラリを使わない。** guides と同じ手書きクラス体系を維持する。

```css
pre .kw  { color: var(--accent);  font-weight: 600; }  /* キーワード */
pre .rel { color: var(--service); font-weight: 600; }  /* リレーション型 */
pre .hl  { color: var(--trace);   font-weight: 600; }  /* 強調・リテラル */
pre .bad { color: var(--alarm);   font-weight: 600; }  /* 誤り */
pre .cm  { color: var(--muted); }                      /* コメント */
```

### 再利用するコンポーネント語彙

| クラス | 役割 |
|---|---|
| `.wrap` | `max-width: var(--wide); margin: 0 auto; padding: 0 1.5rem 6rem` |
| `.eyebrow` | 見出し上のモノスペース大文字キッカー |
| `.sec-label` | `§ Section` 形式。`::after` が罫線で行を埋める |
| `.card` | 1px 罫線 + 小さな角丸（4px）+ 淡い影 |
| `.res` | 金色の左罫線つき結果ブロック |
| `.warn` | 赤の左罫線つき警告 |
| `.chip` + `.c-team` / `.c-engineer` / `.c-service` / `.c-incident` | エンティティのピル |
| `tr.is-answer` / `tr.is-keep` / `tr.is-bad` | 行の色付け（`inset 3px 0 0` で左端に色帯） |

### 全体の質感

角丸 3〜4px、罫線 1px、影は極めて淡い。**アプリ UI ではなく編集物／印刷レポートの佇まい。**

```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

---

## 出典

| 項目 | 場所 |
|---|---|
| デッキの元 | `../nordwind-workshop/guides/03_cypher_reference_ja.html` |
| 可変長パスの解説 | `../nordwind-workshop/guides/01_depends_on_traversal_ja.html` |
| MATCH / WITH の解説 | `../nordwind-workshop/guides/02_match_and_with_ja.html` |
| データ | `../nordwind-workshop/dataset/` |
| Neo4j 投入クエリ | `../nordwind-workshop/session3_graphs_{ja,en}.ipynb` |
