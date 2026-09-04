# デッキの元本

`guides/03_cypher_reference_ja.html` の本文。**このファイルは生成物。** 直接編集しない。

```
python3 tools/extract_guide_docs.py
```

guide が変わったら作り直す。変わったことは SessionStart のフックが
下の md5 と実物を比べて報告する（`.claude/hooks/guide-sync.py`）。

| guide | md5 |
|---|---|
| `01_depends_on_traversal_ja.html` | `e0857fff880674c1313fde326f3631ee` |
| `02_match_and_with_ja.html` | `e7f6b878ccca80906e1671fdaa27bd73` |
| `03_cypher_reference_ja.html` | `73b5930c5247be06a375f2a1fae56066` |

カード 30 枚。id は guide の `div.card` の id で、
[`02_architecture.md`](./02_architecture.md#4-デッキ生成) の `CardId` と同じ値。

載せていないもの:

- **`§ Prerequisite`** — [`05_reference.md`](./05_reference.md#データセット) が同じ表を持つ
- **ハイライトの範囲** — `span.kw` などの位置は文字数で持つ値で、
  フェーズ B の `tools/extract_deck.ts` が HTML から直接拾う
- **実行結果の強調** — `<b>` は fence の中では記法にならないので、値だけが残る

---

## 読み取りの骨格 — `skeleton`

`§ Skeleton`

Cypher の読み取りクエリは **「探す → 絞る → 畳む → 返す」**の4動作の組み合わせです。 どんなに長いクエリもこの4つが並んでいるだけ。

### match

**名前**: `MATCH`

**役割**: グラフの中から、指定した形に当てはまる組み合わせを**すべて**探して行にする。SQL の FROM + JOIN。

**syntax**

```cypher
MATCH (変数:ラベル {プロパティ})-[:型]->(変数2:ラベル2)
```

**query**

```cypher
// Grid Operations が持っているサービス
MATCH (t:Team {name: 'Grid Operations'})-[:OWNS]->(s:Service)
RETURN s.name, s.language
```

結果:

```
telemetry-ingest   Go
grid-monitor       Go
dispatch-optimizer Python
3 行
```

カンマで複数のパターンを並べられます。このとき**結合しているのはカンマではなく、共有された変数**です。

```cypher
MATCH (e:Engineer)-[:MEMBER_OF]->(t:Team), (e)-[:RESPONDED_TO]->(i:Incident)
        2つ目の (e) はラベルを書かない = 束縛済み変数の再利用
```

> **罠** — **デカルト積に注意。** 共有変数のないパターンをカンマで並べると行数が掛け算になります。 `(e:Engineer)-[:MEMBER_OF]->(t), (i:Incident)-[:AFFECTED]->(s)` は 30 × 35 = **1,050 行**。Neo4j も警告を出します。

### optional-match

**名前**: `OPTIONAL MATCH`

**役割**: 見つからなくても行を捨てず、変数を `null` にして通す。SQL の LEFT OUTER JOIN。

**query**

```cypher
// 全エンジニアと、対応した件数
MATCH (e:Engineer)
OPTIONAL MATCH (e)-[:RESPONDED_TO]->(i:Incident)
RETURN e.name, count(i) AS n
ORDER BY n ASC LIMIT 1
```

結果:

```
Killua Zoldyck   0
```

ここを普通の `MATCH` にすると `Killua Zoldyck` は **行ごと消えて**結果は29人になります。「居ないこと」を出したいときに必須。

### where

**名前**: `WHERE`

**役割**: 直前の `MATCH` または `WITH` の結果を絞る。**置く位置で意味が変わる**。

**query**

```cypher
MATCH (i:Incident)
WHERE i.severity = 'SEV1'
  AND i.date >= date('2026-01-01')
RETURN i.id, i.title
```

結果:

```
INC-2118  Meter reader fleet disconnects…
INC-2120  Billing engine OOM during…
2 行
```

使える述語：

- `=` `<>` `<` `>=` / `AND OR NOT XOR`
- `IN ['SEV1','SEV2']`／`IS NULL`／`IS NOT NULL`
- `STARTS WITH`／`ENDS WITH`／`CONTAINS`／`=~ '正規表現'`
- パターン自体を条件にできる（下の [EXISTS](#exists)）

### with

**名前**: `WITH`

**役割**: クエリを前半と後半に区切り、結果を渡す関所。集約・スコープ切断・集約後の絞り込みが同時に起きる。

**query**

```cypher
// 2チーム以上がまたがって対応したインシデントの数
MATCH (e:Engineer)-[:MEMBER_OF]->(t:Team), (e)-[:RESPONDED_TO]->(i:Incident)
WITH i, count(DISTINCT t) AS teams_involved   ← i が暗黙のグループ化キー
WHERE teams_involved > 1                    ← 集約後の絞り込み = SQL の HAVING
RETURN count(i) AS cross_team_incidents
```

結果:

```
52 行 → 20 行 → 13 行 → 1 行（13）
```

3つの働きがあります。

- **集約する** — 集約関数でない項目が自動的に `GROUP BY` キーになる。書く語は無い。
- **スコープを切る** — `WITH` に並べた変数だけが先に進む。ここでは `e` と `t` は消える。
- **集約結果に条件を掛けられる** — `WITH` の後の `WHERE` が `HAVING`。

> **罠** — **キーは書かれていないので、うっかり増える。** `WITH i, e, count(DISTINCT t)` と項目を1つ足すとキーが `(i, e)` になり、 52行が畳まれず `teams_involved` は全部 1 になります。エラーは出ません。

### return

**名前**: `RETURN`

**役割**: 最終的に何を返すか。`AS` で列名を付ける。

```cypher
MATCH (s:Service)
RETURN s.name AS service,
       s.language AS lang,
       s // ノードそのものも返せる
```

ノードやリレーション、パスをそのまま返せます。Navigator が3Dで描けるのは、 `RETURN n, r, m` がノード実体を返しているからです。

---

## パターンの書き方 — `patterns`

`§ Patterns`

Cypher の見た目の特徴である `()-[]->()` は「ホワイトボードに描いた矢印をそのまま打つ」という発想です。 ここが読めれば大半のクエリは読めます。

### node

**名前**: `( )` — ノード

**役割**: 丸括弧。中に 変数・ラベル・プロパティ を好きな組み合わせで書く。

```cypher
()                          何でもいい1ノード（匿名）
(s)                         変数 s に束縛
(:Service)                  Service ラベルだけ
(s:Service)                 両方
(s:Service {language:'Go'}) プロパティで絞る
```

変数が要らないところは省くのが読みやすい書き方です。 `(:Service {name:'auth-service'})` のように、後で使わない中継ノードは無名にします。

### edge

**名前**: `-[ ]->` — リレーション

**役割**: 角括弧と矢印。向きは「探索の通行方向」を決める。

```cypher
-[:DEPENDS_ON]->   左が始点
<-[:DEPENDS_ON]-   右が始点
-[:DEPENDS_ON]-    向き不問（両方通る）
-[r:DEPENDS_ON]->  変数 r に束縛（r.prop が読める）
-[:OWNS|AFFECTED]-> 複数の型のどれか
-->                型不問
```

結果:

```
customer-portal を起点に
-[:DEPENDS_ON]->  →  4 件（依存する先）
<-[:DEPENDS_ON]-  →  1 件（依存される元）
```

### varlen

**名前**: `*1..3` — 可変長パス

**役割**: 同じ型のエッジを1〜3回続けて辿る。深さが未知の問いに効く。

```cypher
MATCH (:Service {name:'customer-portal'})
      -[:DEPENDS_ON*1..3]->(up:Service)
RETURN collect(DISTINCT up.name)
```

結果:

```
14 パス → DISTINCT 7 件
api-gateway, auth-service, billing-engine,
mobile-api, meter-reader, payment-gateway,
tariff-service
```

```cypher
*        深さ無制限
*2       ちょうど 2 ホップ
*1..     1 以上
*..3     3 以下
```

返るのは**ノードではなくパス**。同じノードに複数経路で着けばその回数だけ行が出るので `DISTINCT` がほぼ必須です。同一パス内での同じエッジの再利用は Cypher が禁じているため、矢印を辿ると一周して戻れてしまうグラフでも無限ループにはなりません。

### path

**名前**: `p = (…)` — パス変数

**役割**: マッチしたパス全体を変数に取る。証跡（evidence path）を見せるときの定番。

```cypher
MATCH p = (e:Engineer {name:'Winry Rockbell'})
        -[:RESPONDED_TO]->(:Incident)
        -[:AFFECTED]->(:Service)
        -[:DEPENDS_ON]->(:Service {name:'payment-gateway'})
RETURN [n IN nodes(p) | coalesce(n.name, n.id)]
```

結果:

```
[Winry Rockbell, INC-2105,
 billing-engine, payment-gateway]
1 行
```

条件を満たすパスがちょうど1本しかないので、1行だけ返ります。これが 「Winry は payment-gateway に繋がっている」の**証跡そのもの**です — どのインシデント経由で、どのサービスを挟んで繋がったのかが1行に出ています。 `INC-2105` だけ id なのは `Incident` が `name` を持たないためで、 そこを `coalesce` が吸収しています。

パスに使える関数：

- `nodes(p)` — ノードのリスト。上の例では **4 件**
- `relationships(p)` — エッジのリスト。上の例では **3 本**
- `length(p)` — **ホップ数**（ノード数ではない）。上の例では **3**

### shortest

**名前**: `shortestPath / allShortestPaths`

**役割**: 2点間の最短経路。探索は幅優先で、全パス列挙より圧倒的に速い。

```cypher
MATCH (a:Service {name:'customer-portal'}),
      (b:Service {name:'telemetry-ingest'})
MATCH p = shortestPath((a)-[:DEPENDS_ON*]-(b))
RETURN [n IN nodes(p) | n.name], length(p)
```

結果:

```
customer-portal → outage-notifier
  → grid-monitor → telemetry-ingest
length = 3
```

> **罠** — **向きを付けると答えが消えます。** 上の例の `-[:DEPENDS_ON*]-` を `-[:DEPENDS_ON*]->` にすると **0 行**。有向では `customer-portal` から `telemetry-ingest` に到達できないためです （`reporting-service` からなら有向で2ホップ）。

### exists

**名前**: `EXISTS { } / COUNT { }`

**役割**: 「そういう繋がりがあるか／いくつあるか」を、行を増やさずに問う。

```cypher
MATCH (i:Incident)
RETURN i.id,
  EXISTS { (i)-[:AFFECTED]->(:Service)
             -[:DEPENDS_ON]->(:Service {name:'payment-gateway'}) }
    AS qualifies,
  COUNT { (i)<-[:RESPONDED_TO]-() } AS responders
```

結果:

```
i.id       qualifies   responders
INC-2120   true        3
INC-2104   false       2
```

通常の `MATCH` で書くと行が増えてしまう判定を、**列として**取れるのが利点です。 `WHERE NOT EXISTS { … }` で「〜が無いもの」も書けます。

（図 — パターン構文の各部位の説明図。丸括弧がノード、角括弧と矢印がリレーション、アスタリスクに続く数字が可変長の深さ指定を表す。）

括弧の種類が「ノードか、繋がりか」を、矢印が「どちら向きに辿るか」を表します。

---

## 結果の整形 — `shaping`

`§ Shaping`

### orderby

**名前**: `ORDER BY`

**役割**: 並べ替え。`WITH` の後にも `RETURN` の後にも置ける。

```cypher
MATCH (i:Incident)
RETURN i.severity, count(*) AS n
ORDER BY n DESC
```

結果:

```
SEV2   9
SEV1   6
SEV3   5
```

`null` は昇順で最後、降順で最初に来ます。

### skiplimit

**名前**: `SKIP / LIMIT`

**役割**: 件数を切る。ページングにも、探索の暴走止めにも使う。

```cypher
MATCH (s:Service)<-[:DEPENDS_ON]-(d:Service)
RETURN s.name, count(d) AS dependents
ORDER BY dependents DESC, s.name
SKIP 0 LIMIT 2
```

結果:

```
auth-service     4
billing-engine   3
```

> **罠** — **同数のときの順序は保証されません。** このデータは3位が `data-lake-sync / grid-monitor / meter-reader / telemetry-ingest` の 4件同点（各2）なので、`LIMIT 3` は**実行のたびに違う1件**を返しうる。 タイブレークの第2キー（上例の `s.name`）を必ず入れます。

`WITH … LIMIT` を途中に挟むと、**後続の処理が扱う行を先に減らせます**。 重い探索の前に置くと効きます。

### distinct

**名前**: `DISTINCT`

**役割**: 重複を落とす。`RETURN` 全体にも、集約関数の中にも掛けられる。

```cypher
RETURN DISTINCT up.name       行の重複を落とす
count(DISTINCT t)           集約する値の重複を落とす
collect(DISTINCT t.name)    同上
```

> **罠** — **この2つは別物です。** `count(t)` は行数、`count(DISTINCT t)` は種類数。 cross-team の例では前者が 20、後者が 13 になり、答えが変わります。

### union

**名前**: `UNION / UNION ALL`

**役割**: 2つのクエリの結果を縦に繋ぐ。列名と列数が一致している必要がある。

```cypher
MATCH (s:Service {language:'Go'})
RETURN s.name AS name, 'Go' AS kind
UNION
MATCH (t:Team)
RETURN t.name AS name, 'Team' AS kind
```

結果:

```
Go のサービス 5 + チーム 8 = 13 行
```

`UNION` は重複を落とし、`UNION ALL` は落としません。

---

## リストと集約 — `lists`

`§ Lists & aggregation`

Cypher はリストを一級の値として扱います。**行 ⇄ リスト**を行き来する道具 （`collect` と `UNWIND`）が対になっているのが特徴です。

### aggregates

**名前**: `count / sum / avg / min / max`

**役割**: 集約関数。**置いた瞬間に、集約でない項目がグループ化キーになる**。

```cypher
MATCH (t:Team)<-[:MEMBER_OF]-(e:Engineer)
RETURN t.name, count(e) AS members
ORDER BY members DESC, t.name
```

結果:

```
Core Infrastructure   4
Customer Platform     4
…
Field Systems         3
Forecasting & AI      3
```

`count(*)` は行数、`count(x)` は `x` が `null` でない行数。`OPTIONAL MATCH` と組むとこの差が効きます。

### collect

**名前**: `collect( )`

**役割**: 複数行を1つのリストに畳む。「一覧を1行で見せる」ときの主力。

```cypher
MATCH (t:Team)-[:OWNS]->(s:Service)
RETURN t.name, collect(s.name) AS services
```

結果:

```
Grid Operations
  [telemetry-ingest, grid-monitor,
   dispatch-optimizer]
Payments & Billing
  [payment-gateway, billing-engine,
   tariff-service]
```

`null` は自動的に除かれます。`OPTIONAL MATCH` の後に置くと 「該当なしは空リスト `[]`」という扱いやすい形になります。

### unwind

**名前**: `UNWIND`

**役割**: `collect` の逆。リストを行に開く。データ投入の定番。

```cypher
// session3 のロードはこの形
UNWIND $rows AS r
MERGE (s:Service {name: r.name})
SET s.description = r.description,
    s.language    = r.language
```

Python のリストをパラメータで渡し、1行ずつに開いて処理します。 15件のサービスを1クエリで投入できるのはこれのおかげです。

```cypher
UNWIND ['SEV1','SEV2'] AS sev
MATCH (i:Incident {severity: sev})
RETURN sev, count(i)
```

結果:

```
SEV1  6
SEV2  9
```

### comprehension

**名前**: `パターン内包表記`

**役割**: パターンの結果をその場でリストにする。`WITH` を挟まずに済む。

```cypher
MATCH (i:Incident)
WHERE i.severity = 'SEV1'
RETURN i.id,
  [(i)-[:AFFECTED]->(x:Service) | x.name] AS affected
```

結果:

```
INC-2103  [customer-portal, auth-service]
INC-2120  [billing-engine, reporting-service]
6 行（SEV1 は 6 件）
```

`[パターン | 取り出す式]` という形。 リスト内包表記 `[x IN list WHERE 条件 | 式]` も同じ書き方です。

### listfn

**名前**: `リスト関数・述語`

**役割**: リストを検査したり畳んだりする。

```cypher
size(list)          要素数
head(list) / last(list)
range(1, 5)         [1,2,3,4,5]
reverse(list)
reduce(a = 0, x IN list | a + x)

ALL  (x IN list WHERE 条件)
ANY  (x IN list WHERE 条件)
NONE (x IN list WHERE 条件)
SINGLE(x IN list WHERE 条件)
```

```cypher
// 全ホップが Go のサービスを通るパス
MATCH p = (:Service)-[:DEPENDS_ON*1..2]->(:Service)
WHERE ALL(n IN nodes(p) WHERE n.language = 'Go')
RETURN [n IN nodes(p) | n.name]
```

結果:

```
[grid-monitor, telemetry-ingest]
[api-gateway, auth-service]
2 行（Go は 5 サービスだが連続する所は少ない）
```

### case

**名前**: `CASE / coalesce`

**役割**: 条件分岐と `null` 埋め。表示の整形でよく使う。

```cypher
MATCH (i:Incident)
RETURN i.severity,
  CASE i.severity
    WHEN 'SEV1' THEN '即応'
    WHEN 'SEV2' THEN '当日'
    ELSE '翌営業日'
  END AS policy
```

```cypher
// Incident は name を持たず id を持つ。混在パスの表示に
coalesce(n.name, n.id)
```

`CASE WHEN 条件 THEN … END` という汎用形もあります （値の一致ではなく任意の条件で分岐したいとき）。

---

## 書き込み — `writing`

`§ Writing`

### create

**名前**: `CREATE`

**役割**: 無条件に作る。**重複チェックをしない**ので、再実行すると増える。

```cypher
CREATE (s:Service {name: 'billing-engine'})
// 2回実行 = 同名ノードが2つできる
```

ノートブックが `CREATE` ではなく `MERGE` を使っているのは、 セルの再実行が安全であるようにするためです。

### merge

**名前**: `MERGE`

**役割**: 「あれば使う、無ければ作る」。冪等なので何度実行しても同じ状態になる。

```cypher
UNWIND $rows AS r
MERGE (t:Team {name: r.name})
ON CREATE SET t.created = date()
ON MATCH SET  t.seen    = date()
SET t.focus = r.focus
```

> **罠** — **MERGE のパターン全体が一致条件です。** `MERGE (s:Service {name:'x', language:'Go'})` は 「name も language も一致するノード」を探し、無ければ**両方を持つ新ノードを作ります**。 キーだけで `MERGE` し、残りは `SET` で埋めるのが安全な型です。

リレーションを `MERGE` するときは、両端が先に存在している必要があります。 だから session3 の投入は**ノード → リレーションの順**です。

### set

**名前**: `SET / REMOVE`

**役割**: プロパティとラベルの付け外し。

```cypher
SET s.language = 'Go'          1つ設定
SET s += {tier: 1, sla: 99.9}  まとめて追加/更新
SET s =  {name: s.name}        全置換（他は消える）
SET s:Critical                 ラベルを足す

REMOVE s.sla                    プロパティを消す
REMOVE s:Critical              ラベルを外す
```

> **罠** — **`=` と `+=` は別物。** `=` は書かなかったプロパティを消します。

### delete

**名前**: `DELETE / DETACH DELETE`

**役割**: 消す。**リレーションが残っているノードは普通には消せない**。

```cypher
MATCH (n) DETACH DELETE n
// 繋がっているリレーションごと全消し
// session3 冒頭の「まっさらにする」がこれ
```

`DELETE n` だけだと、`n` に繋がるリレーションが1本でもあればエラーになります。 `DETACH` がそれを先に消してくれます。

> **罠** — **ワークショップ用インスタンス限定の操作です。** 実データベースでは絶対に流さないこと。

### foreach

**名前**: `FOREACH`

**役割**: リストの各要素に更新処理を掛ける。**更新専用**で、読み取りは書けない。

```cypher
MATCH p = (:Service {name:'customer-portal'})
          -[:DEPENDS_ON*1..3]->(:Service)
FOREACH (n IN nodes(p) | SET n:Upstream)
```

`n:Upstream` は **`Upstream` というラベルを1枚足す**という意味です。 `n` に「Upstream」という**文字列が入るのではありません** — それをやりたいなら `SET n.tag = 'Upstream'` と書きます。 ラベルは `Service` や `Incident` と同じ**ノードの種類を表す印**で、 1つのノードに何枚でも重ねられます。

結果:

```
実行前  (billing-engine:Service)
実行後  (billing-engine:Service:Upstream)
```

`Service` は消えず、`Upstream` が**足される**だけです。 以後は `MATCH (x:Upstream)` でこの印の付いたノードだけを引けるようになり、 `REMOVE n:Upstream` で剥がせます。 つまり「探索結果に付箋を貼って、後のクエリから呼び出せるようにする」操作です。

> **罠** — **起点にも印が付きます。** `nodes(p)` はパスの**全**ノードなので `customer-portal` 自身も含まれ、印が付くのは **8 件**（依存先の7件 + 起点）。 依存先の7件だけにしたいなら `tail(nodes(p))` で先頭を落とします。

`FOREACH` の中に書けるのは `SET` / `REMOVE` / `CREATE` / `MERGE` / `DELETE` だけです。 読み取りを含む繰り返しは `UNWIND` か `CALL { }` を使います。

---

## サブクエリ・スキーマ・診断 — `subqueries`

`§ Subqueries & ops`

### callsub

**名前**: `CALL { }` — サブクエリ

**役割**: 独立したクエリを中に埋め込む。「行ごとに上位N件」が書ける。

```cypher
MATCH (t:Team)
CALL {
  WITH t                      ← 外の変数を持ち込む宣言
  MATCH (t)-[:OWNS]->(s:Service)
  RETURN s.name AS svc
  ORDER BY s.name LIMIT 1
}
RETURN t.name, svc
```

結果:

```
チームごとに1件ずつ = 8 行
```

外側の `LIMIT` では「全体で1件」になってしまうところを、 **行ごとの LIMIT** にできるのが要点です。

### callproc

**名前**: `CALL … YIELD` — プロシージャ

**役割**: 組み込みの手続きを呼ぶ。スキーマの確認によく使う。

```cypher
CALL db.labels()                 ラベル一覧
CALL db.relationshipTypes()      エッジ型一覧
CALL db.schema.visualization()   スキーマ図
SHOW INDEXES / SHOW CONSTRAINTS
```

結果:

```
db.labels() → Team, Engineer,
             Service, Incident
```

初めて触るデータベースの中身を掴むとき、まずこれを叩きます。

### schema

**名前**: `CONSTRAINT / INDEX`

**役割**: 一意性の保証と、起点ノード探索の高速化。

```cypher
CREATE CONSTRAINT svc_name IF NOT EXISTS
FOR (s:Service) REQUIRE s.name IS UNIQUE;

CREATE INDEX inc_sev IF NOT EXISTS
FOR (i:Incident) ON (i.severity);
```

> **罠** — **session3 のノートブックはこれを張っていません。** そのため `{name:'customer-portal'}` はラベルスキャンです。15件なので体感差はありませんが、 制約の前後で `EXPLAIN` を比べると `NodeByLabelScan` → `NodeUniqueIndexSeek` の変化が見えます。

一意性制約を張ると、その裏側でインデックスも自動的に作られます。

### explain

**名前**: `EXPLAIN / PROFILE`

**役割**: 実行計画を見る。同じクエリの頭に付ける**2つのモード**で、出る情報が違う。

```cypher
EXPLAIN MATCH (:Service {name:'customer-portal'})
        -[:DEPENDS_ON*1..3]->(up:Service) RETURN up
```

結果:

```
NodeByLabelScan(:Service)
  Filter (name = …)
    VarLengthExpand(All)
```

`EXPLAIN` は**クエリを流しません**。プランナが立てた計画（演算子の並び）と **推定**行数だけを返し、実データには触れません。重いクエリを**投げる前に** 「その形で大丈夫か」を確かめるためのものです。

```cypher
PROFILE MATCH (:Service {name:'customer-portal'})
        -[:DEPENDS_ON*1..3]->(up:Service) RETURN up
```

`PROFILE` は**実際に実行してから**、同じ計画に演算子ごとの **実測**値（`rows` と `db hits`）を添えて返します。 更新クエリに付けると**更新も本当に起きます**。

> **罠** — **`db hits` は `PROFILE` でしか出ません。** 「実際に何レコード触ったか」は走らせてみないと分からないためです。 `EXPLAIN` で読めるのは演算子の並びと推定行数までなので、 **速さを測りたいときは `PROFILE`、形だけ見たいときは `EXPLAIN`** と使い分けます。

見るべきは `db hits`（触ったレコード数）と、`NodeByLabelScan` の有無です。 上の出力はまさに**インデックスが効いていない例**で、15件ある `Service` を 全部読んでから `Filter` で1件に絞っています。 [`CREATE CONSTRAINT`](#schema) で `name` に一意性制約を張ると、 ここが `NodeUniqueIndexSeek` に変わり、最初から1件だけを引くようになります。

---

## 書く順番と、効く順番

`§ Order`

Cypher は**上から下へ、パイプのように流れます**。SQL のように 「書いた順と評価順が違う」ということがありません。ここが読みやすさの核心です。

（図 — Cypher の句の流れ図。MATCH で行を作り、WHERE で絞り、WITH で畳んで再び WHERE で絞り、ORDER BY・SKIP・LIMIT で整えて RETURN で返す。SQL では評価順が記述順と異なる。）

`WITH` をいくつ挟んでも同じで、上から順に「行の束」が加工されて流れていきます。

---

## 詰まりやすい所

`§ Traps`

どれも**エラーが出ないまま答えだけが変わる**種類の間違いです。ワークショップで実際に踏まれやすい順に。

| 症状 | 原因 | 直し方 |
|---|---|---|
| 件数が異様に多い | `MATCH のカンマで共有変数が無く、デカルト積になっている` | パターン同士を変数で繋ぐ／`WITH` で区切る |
| 集約が効かず行が減らない | `WITH に余計な項目を並べ、グループ化キーが増えている` | `WITH` に残す項目を最小にする |
| 数が多すぎる（種類ではなく件数を数えている） | `count(x) と count(DISTINCT x) の取り違え` | 「何の種類を数えたいか」で選ぶ |
| 0 件になる | `矢印の向きが逆／向きが不要なのに付けている` | 向きを外して `-[:X]-` で試す |
| 該当なしの行が消える | `MATCH を使っている（OPTIONAL MATCH ではなく）` | `OPTIONAL MATCH` にする |
| 可変長の結果に重複が出る | `*1..3 が返すのはノードではなくパス` | `DISTINCT` を付ける |
| 再実行でノードが増える | `CREATE を使っている` | `MERGE` にする |
| MERGE が毎回新しいノードを作る | `MERGE のパターンに可変プロパティを入れている` | キーだけで `MERGE` し、残りは `SET` |
| プロパティが消える | `SET s = {…} で全置換している` | `SET s += {…}` にする |
| DELETE がエラーになる | `リレーションが残っている` | `DETACH DELETE`（本番では厳禁） |

**💡 デモの型**

罠は**まず間違った版を流して見せる**のが一番効きます。 `count(DISTINCT t)` → `count(t)` に変えて答えが 13 から 20 に飛ぶところ、 `OPTIONAL MATCH` → `MATCH` にして `Killua Zoldyck` が 消えるところは、どちらも1文字〜1語の変更で見せられます。

---
