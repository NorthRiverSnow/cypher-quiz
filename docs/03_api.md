# API・セキュリティ

アーキテクチャ全体は [`02_architecture.md`](./02_architecture.md)。

---

## 1. OpenAPI をドメインから自動追従させる

> **要件:** エンティティやドメインの更新で、OpenAPI が自動で更新されること。

### Zod スキーマを唯一の真実にする

エンティティ／ドメインを変えると、そこから **3 つが同時に導出される**。手で同期する箇所を作らない。

```
packages/shared/src/schema/*.ts        ← Zod スキーマ（唯一の真実）
        │
        ├──▶ z.infer               → TypeScript 型（web も api も同じ型）
        ├──▶ 実行時検証             → リクエスト / レスポンス
        └──▶ app.doc31()           → OpenAPI ドキュメント（/doc で常に最新）
```

`@hono/zod-openapi` は**ルート定義そのものからドキュメントを組み立てる**ので、ドキュメントが実装から乖離しようがない。別ファイルに OpenAPI を手書きしないため。

> **`shared` のスキーマは素の `zod` で書く。** `@hono/zod-openapi@1` は `zod@^4` を
> peer dependency に取るので実体は 1 つで、OpenAPI の付加情報は `api` 側で載せられる。
> フロントに Hono の依存を持ち込まないために、この形にしている。

```ts
// packages/api/src/routes/run.ts
import { createRoute, z } from '@hono/zod-openapi';

const route = createRoute({
  method: 'post',
  path: '/api/run',
  request: {
    body: { content: { 'application/json': { schema: RunRequestSchema } } },
  },
  responses: {
    200: {
      content: { 'application/json': { schema: RunResponseSchema } },
      description: 'クエリの実行結果',
    },
    403: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: '書き込みクエリのため拒否',
    },
  },
});
```

### 成果物としての `openapi.json` と乖離検出

`/doc` は常に最新だが、**外部に配る成果物**としての `openapi.json` もコミットする。そして**ズレたら CI をエラーで終了させる**。

| コマンド | 動作 |
|---|---|
| `vp run openapi:write` | アプリを import してドキュメントを `openapi/openapi.json` に書き出す |
| `vp run openapi:check` | 再生成して差分を取り、ズレていたら **exit 1** |

これで「スキーマを変えたのに `openapi.json` を更新し忘れる」が起きなくなる。

ドキュメント UI は Scalar（`@scalar/hono-api-reference`）を `/docs` に置く。

### フロントは OpenAPI からコード生成しない

`shared` の Zod から `z.infer` で型を取る。**同じ Zod が源なので、コード生成を挟むと二重になるだけ。**

`openapi.json` は外部向けのドキュメント成果物という位置づけ。

---

## 2. 読み取り専用の強制（多層）

ユーザーが[任意の Cypher を編集して投げられる](./01_spec.md#4-クエリの実行と編集)以上、ここが最も有効な防御線。

> **キーワードの正規表現マッチはやらない。**
> コメントや文字列リテラルの中の `CREATE` を誤検知し、逆に見落としもする。

### 第 1 層 — `EXPLAIN` によるサーバ権威の分類（主防御）

`EXPLAIN <query>` はプランナだけを通し、**クエリを実行しない**（[Neo4j JS Driver Manual](https://neo4j.com/docs/javascript-manual/current/result-summary/)）。

`ResultSummary.queryType` にサーバ自身の分類が入る：

| 値 | 意味 |
|---|---|
| `'r'` | 読み取りのみ |
| `'rw'` | 読み書き |
| `'w'` | 書き込みのみ |
| `'s'` | スキーマ変更 |

`'r'` 以外は実行に進まない。**Cypher パーサ自身の判定なので自前パーサより正確**で、構文エラーもここで拾える。

**判定は「`'r'` だけ通す」の形で書く。** 拒否する分類を並べると、Neo4j が分類を増やしたときに
新しい分類が素通りする。判定そのものは `neo4j/readOnly.ts` の純粋関数で、
`EXPLAIN` を投げるのは [`tx.ts`](#9-トランザクション)。

### 実測した分類

`EXPLAIN` は内側のクエリを反映する。**`CREATE` は `'w'` を返し、第 1 層は機能する。**

| クエリ | `queryType` |
|---|---|
| `MATCH (n) RETURN count(n)` / `CALL db.labels()` / `SHOW INDEXES` | `'r'` |
| 読み取りだけの `CALL { }` | `'r'` |
| `CREATE` / `MERGE` / `SET` / `REMOVE` / `DELETE` / `FOREACH` | `'w'` |
| `CALL { }` の中で書き込む | `'rw'` |
| `CREATE INDEX` / `DROP INDEX` / `CREATE CONSTRAINT` / `DROP CONSTRAINT` | `'s'` |
| `CREATE USER` / `DROP USER` / `ALTER USER` / `RENAME USER` / `SHOW USERS` | `'s'` |
| `CREATE ROLE` / `GRANT` / `DENY` / `REVOKE` / `SHOW PRIVILEGES` | `'s'`（下記） |
| `CREATE DATABASE` / `DROP DATABASE` / `STOP DATABASE` / `SHOW DATABASES` | `'s'`（下記） |
| 構文エラー | `EXPLAIN` の時点で `Neo.ClientError.Statement.SyntaxError` を throw |

**`CREATE INDEX` は `'w'` ではなく `'s'`。** 拒否する側を並べていたら、スキーマ変更だけが
通っていた——「`'r'` だけ通す」にする理由がこれ。**ユーザ作成・権限付与・データベース削除も
すべて `'s'`** なので、同じ 1 行で止まる。

**権限とデータベースのコマンドは Community では動かない。** パースの時点で
`Neo.ClientError.Statement.UnsupportedAdministrationCommand` になる。利用者は
[自分の Aura にも繋げる](./01_spec.md#5-db-への接続)ので、**Enterprise でも `'s'` になることを
別途実測した**（評価版のコンテナを一時的に立てて確認。テストには入れられない）。

この表は `packages/api/src/neo4j/queryType.test.ts` が実 DB に対して固定している。
**Neo4j を上げて分類が変われば、そこが失敗する。**

### `'r'` に分類される抜け道

**分類が `'r'` でも、グラフの読み取りとは限らない。** 実測で 4 つ見つかった。

| クエリ | プランの演算子 | 何ができてしまうか |
|---|---|---|
| `LOAD CSV FROM 'http://…'` | `LoadCSV` | サーバに外部の URL を取りに行かせる |
| `TERMINATE TRANSACTIONS …` | `TerminateTransactions` | **他人の実行中のクエリを止める** |
| `SHOW TRANSACTIONS` | `ShowTransactions` | 他人が実行中のクエリが見える |
| `SHOW SETTINGS` | `ShowSettings` | サーバの設定が見える |

どれも第 2 層（読み取りアクセスモード）も通る。**`queryType` だけでは止まらない。**

そこで `ResultSummary.plan` の演算子を見て、この 4 つを拒否する。
プランはサーバのプランナ出力なので、**キーワードの正規表現マッチとは違い、
コメントや文字列リテラルに騙されない。**

**ここだけは拒否側を並べる。** 読み取りの演算子は 100 を超え、Neo4j を上げるたびに増えるので
許可側を並べきれない。見つけたら足す運用にして、`readOnly.ts` にその旨を書いてある。

> `operatorType` は `LoadCSV@neo4j` の形で、`@` の後ろは繋いだデータベース名。照合の前に切り落とす。

### 第 2 層 — ドライバの読み取りアクセスモード（保険）

`session.executeRead(...)` で実行する。第 1 層をすり抜けた場合の最後の砦。
**掛ける場所は [§9 の `tx.ts`](#9-トランザクション) 1 箇所**なので、ルートごとに付け忘れる余地が無い。

**単一インスタンスでも実際に拒否する。** 第 1 層を通さずに `CREATE` を投げると
`Neo.ClientError.Statement.AccessMode` になり、ノードは 1 つも増えない（実測）。
`CREATE INDEX` も同じく拒否される。

### RBAC は使えない前提で組む

「読み取り専用の DB ユーザーを作る」という王道は取れない。

| 環境 | 理由 |
|---|---|
| dev の Docker | Neo4j **Community Edition は複数ユーザー／ロールを持たない** |
| Neo4j Aura Free | 同様に期待できない |

だから**アプリ層で担保する必要がある**。

### その他の制限

| 項目 | 既定値 |
|---|---|
| トランザクションタイムアウト | 5 秒 |
| 返却行数の上限 | 200 行 |

---

## 3. 資格情報の扱い

> **要件:** 接続情報はユーザーに入力してもらい、こちらでパスワードを管理しない。

### セッション識別子はフロントに渡さない

**識別子は httpOnly クッキーに載せる。** フロントは「繋がっているか」だけを知り、識別子そのものには一切触らない。JS から読めないので、XSS で抜かれる経路が存在しない。

```
[ブラウザ]                        [api]                         [neo4j]

接続画面
  uri / user / pass ──POST /api/connect──▶ driver 生成
                                           getServerInfo() で疎通を確かめる
                                           Map<SessionId, Driver> に載せる
   Set-Cookie (httpOnly)  ◀───────────────  （パスワードは保持しない）
   { connected: true, uri, mode }           JS から読めない不透明値

クエリ実行
  { cypher } ──POST /api/run──────────────▶ クッキーからセッションを引く
   ＋クッキーは自動送信                        EXPLAIN で分類
                                           → 読み取り tx で実行
        結果 JSON  ◀──────────────────────  toPlainJson() で正規化
```

フロントが持つ接続状態は、識別子ではなく**表示用の情報だけ**：

```ts
// React state として丸ごと差し替えるだけなので readonly は付けない
type ConnectionStatus =
  | { connected: false }
  | { connected: true; uri: string; mode: 'manual' | 'dev-auto' };
```

クッキーの属性: `HttpOnly` / `SameSite=Strict` / `Path=/api` / 本番では `Secure` / **`Max-Age` を付けない**（セッションクッキー。タブを閉じれば消える）。名前は `cq_session`。

読み書きは `api/src/cookie.ts` だけが行う。**属性を書く場所を 1 箇所にする**ため——
ルートごとに書くと、`HttpOnly` の付いていないルートが 1 本できる。dev で `Secure` を
付けないのは、http では送られず「繋がったまま切れた」ように見えるから。

Vite の dev proxy で同一オリジンになるので、`fetch` は `credentials: 'same-origin'` で足りる。

### 正直に言っておくこと

**プロキシ方式を選んだ以上、パスワードは API プロセスを必ず通過する。** 「管理しない」は、以下の実装規律で担保する。

| 対策 | 内容 |
|---|---|
| **ディスクに書かない** | 手入力の資格情報は永続化しない |
| **ログに出さない** | リクエストボディを出す口を作らない。URI は資格情報を取り除いてから出す（[§8](#8-ログ)） |
| **エラーをサニタイズ** | ドライバのエラーは URI に資格情報を含みうる。クライアントへ返す前に取り除く |
| **メモリのみ** | サーバ側 `Map`。**サーバ再起動で全消滅** |
| **失効させる** | **最後に使ってから** 30 分で失効し、`driver.close()`。上限に達したら、最後に使ったのが最も古いものを閉じる |
| **フロントは識別子を持たない** | httpOnly クッキー。`localStorage` も React state も使わない |

クッキーは不透明なランダム値。`Max-Age` を付けないのでリロードでは残るが**タブを閉じれば消え**、サーバ側 `Map` も再起動で消えるため、[再入力になる](./01_spec.md#5-db-への接続)。

> リロードでクッキーが残る点は仕様 5 の「リロードすると再入力」より緩い。**サーバ側 `Map` が生きている限りは繋がったまま**になる。厳密にリロードで切りたい場合は、フロントが `GET /api/connect` の代わりに起動時に `DELETE /api/connect` を打つ運用にできる。どちらが良いかは[判断待ち](./04_roadmap.md#前提として置いた判断)。

### なぜ直結ではなくプロキシなのか

ブラウザから `neo4j-driver` で直結すれば、パスワードは一切サーバを通らない。それでもプロキシを選ぶ理由は、**任意の Cypher を実行させる以上、読み取り専用の強制をサーバ側で掛けたいから**。直結だとその強制点が消える。

---

## 4. 開発時の自動接続（dev 限定）

開発中に毎回パスワードを打つのは無駄なので、`.env` から Docker のローカル Neo4j へ自動接続する。

### 専用ルートは作らない

`GET /api/connect` が接続状態を返すルートを兼ねる。**自動接続が有効なら、サーバがその場で `.env` を読んで繋ぎ、クッキーを張って `connected: true` を返す。**

```
[ブラウザ]                          [api]                        [neo4j (docker)]

起動時
  GET /api/connect ──────────────▶  クッキーが無い
                                    かつ自動接続が有効
                                    → .env の uri/user/pass で driver 生成
   Set-Cookie (httpOnly)  ◀───────  （パスワードはブラウザに渡らない）
   { connected: true, mode:'dev-auto', uri }
```

無効なら `{ connected: false }` を返し、フロントは通常の[接続画面](./01_spec.md#5-db-への接続)を出す。**フロント側に dev 専用の分岐が要らない。**

この経路ではパスワードがブラウザに一切渡らないので、手入力の経路より露出が**少ない**。

### 環境変数

```bash
# .env.example（コミットする）— 値は dev 専用の使い捨て
NEO4J_PASSWORD=nordwind-dev

# 自動接続。既定は無効
DEV_AUTO_CONNECT=true

# 既定ではローカル宛のみ許可。リモートに自動接続したいときだけ
# DEV_AUTO_CONNECT_ALLOW_REMOTE=true
```

`.env` は **`.gitignore` に入れる。** `.env.example` だけをコミットする。

### 資格情報の出どころを 1 箇所にする

**`docker-compose.yml` と自動接続が同じ変数を読む。** これで「コンテナのパスワードと `.env` がズレて繋がらない」が起きない。

```yaml
# docker-compose.yml
services:
  neo4j:
    environment:
      NEO4J_AUTH: neo4j/${NEO4J_PASSWORD}      # ← 同じ変数
  api:
    environment:
      NEO4J_URI:      bolt://neo4j:7687        # compose 内はサービス名
      NEO4J_USER:     neo4j
      NEO4J_PASSWORD: ${NEO4J_PASSWORD}        # ← 同じ変数
      DEV_AUTO_CONNECT: ${DEV_AUTO_CONNECT:-false}
```

> ホストのブラウザから手入力で繋ぐときは `bolt://localhost:7687`、compose 内の api からは `bolt://neo4j:7687`。**ポートは同じでもホスト名が違う。**

### 歯止め

雑に置くと事故るので、以下を必ず入れる。

| # | 歯止め | 挙動 |
|---:|---|---|
| 1 | **本番で有効化されたら起動を拒否** | `NODE_ENV === 'production'` かつフラグ有効 → **起動時に fail fast**。黙って無効化しない |
| 2 | **既定はローカル宛のみ** | `localhost` / `127.0.0.1` / `neo4j`(compose のサービス名) 以外は拒否。`DEV_AUTO_CONNECT_ALLOW_REMOTE=true` で解除 |
| 3 | **起動時に明示する** | どの URI に自動接続するかを起動バナーに出す。**パスワードは出さない** |
| 4 | **`.env` をコミットしない** | `.gitignore`。`.env.example` のみコミット |
| 5 | **画面に出す** | `mode: 'dev-auto'` をフロントに表示し、**切断して手入力に戻せる**（本番の経路を開発中に確認するため） |

歯止め 1 が「黙って無効化」ではなく「起動拒否」なのは、**設定ミスに気づかないまま本番相当の環境が立ち上がるほうが危ない**ため。

### 読み取り専用は変わらない

自動接続でも[第 1 層・第 2 層](#2-読み取り専用の強制多層)はそのまま掛かる。**接続経路と実行時の権限は独立**させる。

---

## 5. 結果の正規化

`neo4j-driver` は素の JSON ではない型を返す。**View がドライバを import せずに表を描けるよう、純関数で素の JSON に変換する**（`packages/api/src/neo4j/toPlainJson.ts`。DB も I/O も触らない）。

### セル 1 つの対応

| ドライバの値 | 変換後 | 出現例 |
|---|---|---|
| `Integer` | `number`。安全域を超えたら `string` | `count(*)` |
| `Node` | `{ kind: 'node', labels, props }` | `RETURN n` |
| `Relationship` | `{ kind: 'relationship', type, props }` | `RETURN r` |
| `Path` | `{ kind: 'path', nodes, relationships }` | `MATCH p = (…)` |
| マップ | `{ kind: 'map', props }` | `RETURN t { .name }` |
| リスト | 配列。中身も同じ規則で変換する | `collect(…)` |
| `Date` / `DateTime` / `Duration` / `Point` | `toString()` の表記 | `Incident.date` → `'2025-08-05'` |
| `null` / 値の無いセル | `null` | `OPTIONAL MATCH` |

形は `shared` の Zod スキーマで定義するので、**OpenAPI にも自動で載る**。

### マップにタグを付ける

素の JS オブジェクトのまま返すと、**`RETURN { kind: 'node' }` が本物のノードと同じ形になる。** `kind: 'map'` を付けて、スキーマがノードとマップを区別できるようにする。

タグが無ければ `Cell` は任意のオブジェクトを許すことになり、`props` の無い壊れたノードも通る。

### 一時型・空間型を型ごとに分岐しない

素のオブジェクト（マップ）を先に分けると、残るのは `toString()` が読める表記を返すクラスだけになる。**プロトタイプが `Object.prototype` かどうか**で分けられるので、ドライバが型を増やしても分岐を足さずに済む。

既定の `toString()` しか持たないものは `null` にする。`'[object Object]'` を返すと、値が無いのか変換に失敗したのかを受け取った側が区別できない。

### 列名は結果から取れない

`await` した `QueryResult` は `records` と `summary` しか持たない。**0 行のとき列名が消える**ので、`Result.keys()` から取って渡す。

```ts
const running = tx.run(cypher);
const keys = await running.keys();

toPlainJson(keys, await running);
```

### 所要時間

`summary.resultAvailableAfter`（届くまで）と `resultConsumedAfter`（読み終わるまで）の合計。**どちらもサーバ側の計測**で、クライアントの往復時間を含まない。

---

## 6. エンドポイント一覧

**どのエンドポイントもセッション識別子を body で受け取らない。** 識別子は httpOnly クッキーで往復する。

| メソッド | パス | リクエスト | レスポンス |
|---|---|---|---|
| `GET` | `/api/connect` | — | `ConnectionStatus`。未接続でも dev 自動接続が有効ならその場で繋ぐ |
| `POST` | `/api/connect` | `{ uri, user, password, database? }` | `ConnectionStatus` + `Set-Cookie`(httpOnly) |
| `DELETE` | `/api/connect` | — | クッキーを消し、`driver.close()` |
| `POST` | `/api/run` | `{ cypher }` | `QueryResult`（`columns` / `rows` / `elapsedMs`。読み取り専用で実行） |
| `GET` | `/doc` | — | OpenAPI ドキュメント（JSON） |
| `GET` | `/docs` | — | Scalar による API リファレンス UI |

失敗の形とステータスの対応は [§7](#7-失敗の返し方)。

---

## 7. 失敗の返し方

**クライアントに返す形は 1 つだけ。** `shared/src/schema/error.ts` の Zod スキーマが源で、OpenAPI にもそのまま載る。

```ts
type ApiError = { kind: ErrorKind; message: string; queryType?: string };
```

| `kind` | ステータス | 意味 |
|---|---:|---|
| `not-connected` | 401 | クッキーが無い / セッションが失効している |
| `read-only-violation` | 403 | [読み取り専用の強制で拒否](#2-読み取り専用の強制多層)。`queryType` を添える |
| `syntax-error` | 422 | `EXPLAIN` が拾った構文エラー |
| `invalid-request` | 422 | リクエストの検証エラー |
| `timeout` | 504 | トランザクションタイムアウト（既定 5 秒） |
| `connect-failed` | 502 | ドライバが繋がらない |
| `unexpected` | 500 | 想定外。**中身はクライアントに返さない**（ログにだけ残す） |

`kind` は文言ではなく機械が読む値なので、**フロントは `message` で分岐しない。**

**この表と `ERROR_KINDS` は 1 対 1。** 片方だけ増えると、対応するステータスの無い `kind` が
500 に落ちる。`schema.test.ts` が 7 つであることを固定し、`routes/http.ts` の `statusOf` が
`Record<ErrorKind, …>` で受けるので、**`kind` を足したらここを埋めるまで型が通らない。**

### `invalid-request` の文に値を入れない

ボディの検証は `routes/http.ts` の `bodyOf` を通す。返す `message` に載せるのは
**項目名だけ**——`/api/connect` のボディにはパスワードが入るので、値を入れると
[ログにも応答にも出る](#出さないもの)。Zod の既定の文も使わない（英語で、期待した形を含む）。

### 経路は 1 本

```
neo4j / 検証     Result<T, ApiError> で返す。throw する API は shared の attempt で包む
ルート           Result を HTTP に変える。ここだけが status を決める
app.onError      すり抜けた例外。500 と error ログ。スタックは外に出さない
```

**`message` に生のドライバ出力を入れない。** 接続 URI は `neo4j+s://user:pass@host` の形を取りうるので、
`api/src/redact.ts` を通してから載せる。**ログとクライアント応答が同じ 1 つの関数を通る。**

---

## 8. ログ

**JSON 1 行 = 1 イベント。** `at` / `level` / `event` / `reqId` を全イベントが持つ。

`level` は `debug` / `info` / `warn` / `error` の 4 段。**イベントごとに既定が決まり、
呼ぶ側が上げ下げできる。** `minLevel` より軽いものは書き出さず、既定の `minLevel` は `info`
——つまり **`debug` は既定では出ない**。

```
{"at":"2026-09-09T10:31:02.441Z","level":"info","reqId":"a1f3","event":"req.start","method":"POST","path":"/api/run"}
{"at":"2026-09-09T10:31:02.443Z","level":"info","reqId":"a1f3","event":"query.run","cypher":"MATCH (n) RETURN count(n)"}
{"at":"2026-09-09T10:31:02.488Z","level":"info","reqId":"a1f3","event":"req.end","status":200,"ms":47,"rows":1}
```

| `event` | いつ | 足すもの |
|---|---|---|
| `req.start` | 全リクエストの入口 | `method` `path` |
| `query.run` | Cypher を実行する直前 | `cypher` `readOnly` |
| `req.end` | 出口。**成功も失敗も必ず出る** | `status` `ms`、`/api/run` なら `rows` |
| `error` | 例外と 5xx | `name` `message` `stack` |

**`reqId` で 1 リクエストの行が繋がる。** 並行して走っても追える。

### `reqId` を持ち回さない

**ルートも `driverStore` も `tx.ts` も `reqId` を受け取らない。** ミドルウェアが
`AsyncLocalStorage` に載せ、`createLogger` が書き出す直前に引く。

```ts
// packages/api/src/reqContext.ts
export const withReqId = <T>(reqId: string, fn: () => T): T => storage.run(reqId, fn);
export const currentReqId = (): string => storage.getStore() ?? "-";
```

`AsyncLocalStorage` は `await` を越えて追随するので、**引数に足さなくても奥まで届く**。
リクエストの外（起動時・後始末）で出した行は `reqId` が `"-"` になる。

時刻と出力先は[注入する](./02_architecture.md#時刻乱数を注入する)のに `reqId` は注入しない。
**渡させると、呼ぶ側が「今どのリクエストか」を知っている必要が出る**——それを無くすのが目的。

### 出さないもの

| | 理由 |
|---|---|
| **リクエストボディ** | どのエンドポイントでも出さない。パスワードが入りうるうえ、**大きくなるとログが読めなくなる** |
| レスポンスの行データ | 同じ理由。`rows` は**件数だけ**出す |
| 生の接続 URI | `neo4j+s://user:pass@host` の形を取りうる。`scheme://host:port` に切り詰める |
| クッキーと `Authorization` ヘッダ | セッション識別子そのもの |

**切り詰めるのは `api/src/redact.ts` の 1 つの関数。** ログもクライアント応答もそこを通す。
2 箇所に書くと片方だけ直る。

`req.start` が出すのは `method` と `path`、URL のクエリ文字列まで。**body を渡す引数を作らない**
——引数があると、いつか誰かが渡す。

### 実行クエリだけは出す

ボディを出さない規則の唯一の例外。何を実行したかが残らないと、
[読み取り専用の強制](#2-読み取り専用の強制多層)が働いたのかどうかを後から確かめられない。

- 出すのは `cypher` の文字列だけ。**`/api/run` のボディにはそれしか無い**
- `readOnly` を同じ行に出すので、**拒否されたクエリも残る**（`req.end` は 403）
- **1000 字で切り、切ったら `truncated: true` を足す。** 教材のクエリは長くても数百字なので、
  これを超えるのは想定外の入力。頭が残っていれば何が来たかは判別できる

---

## 9. トランザクション

**1 リクエスト = 1 トランザクション。** 並行して走る処理が無いので、これ以上の粒度を持たない。

開くのは `neo4j/tx.ts` の 1 関数だけ。**ルートは `driver.session()` を呼ばない。**

```ts
// packages/api/src/neo4j/tx.ts
export const runReadOnly = (
  deps: { log: Logger; timeoutMs: number },
  req: { driver: Driver; database?: string; cypher: string },
) => Promise<Result<{ keys: readonly string[]; result: QueryResult }, ApiError>>;
```

列名を結果と一緒に返すのは、[0 行のとき `records` から取れない](#列名は結果から取れない)ため。

**呼ぶ側は Cypher を渡すだけ。** 実行するトランザクションを渡させない——渡せると、
判定したクエリと実行するクエリを別にできてしまう。

**`EXPLAIN` と本体は同じトランザクションで走る。** 分けると、判定したあとに別の
スナップショットで実行することになる。

1 箇所に寄せると、**全てのクエリに同じものが自動で掛かる。**

| 掛かるもの | ルートごとに書いていたら |
|---|---|
| [読み取りアクセスモード](#第-2-層--ドライバの読み取りアクセスモード保険) | 付け忘れたルートだけ書き込めてしまう |
| タイムアウト 5 秒 | 付け忘れたルートだけ無限に待つ |
| セッションを閉じる | 漏れたぶんだけ接続が残り、やがて枯れる |
| [`query.run` のログ](#8-ログ) | 出ないクエリができる |
| 失敗を [`ApiError`](#7-失敗の返し方) に変える | ルートごとに違う形で返る |

**セッションは失敗しても必ず閉じる。** 例外で抜けた経路だけ閉じ忘れる、が一番起きやすい。
`try` を書かずに済ませるため、`attemptAsync` で受けてから閉じる（[`shared/result.ts`](#7-失敗の返し方)）。
**閉じられなかったときは `warn` に出すだけ**で、結果は返す。

### ドライバのエラーの対応

コードで分ける。**文言では分けない**——バージョンで変わる。

| ドライバのコード | `kind` |
|---|---|
| `Neo.ClientError.Transaction.TransactionTimedOut*` | `timeout` |
| `Neo.ClientError.Statement.AccessMode` | `read-only-violation` |
| `Neo.ClientError.Statement.*`（上記以外） | `syntax-error` |
| `Neo.ClientError.Database.DatabaseNotFound` | `invalid-request` |
| `Neo.ClientError.Security.*` / `ServiceUnavailable` / `SessionExpired` | `connect-failed` |
| それ以外 | `unexpected` |

**`AccessMode` を `Statement.` より先に見る。** 順番を入れ替えると、第 2 層が止めた
書き込みが構文エラーとして返る。

**`unexpected` だけはサーバの文をクライアントに返さない。** 実装の中身が漏れる。
元の文は `error` のログに残す。

変換とログを分けない。**ドライバの失敗は `reportDriverError(log, reqId, cause)` を通す**——
別々に呼べる形にすると、変換だけして元の文を捨てる箇所ができる。

**トランザクションを跨いで値を持ち回らない。** 1 リクエストで 2 回クエリを実行したくなったら、
それは 1 つの Cypher にまとめられないかを先に考える。

