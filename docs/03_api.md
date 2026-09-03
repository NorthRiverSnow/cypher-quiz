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

> **注意:** `z` は `zod` からではなく **`@hono/zod-openapi` から** import する（公式 README 明示）。

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

`/doc` は常に最新だが、**外部に配る成果物**としての `openapi.json` もコミットする。そして**ズレたら CI で落とす**。

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

ユーザーが[任意の Cypher を編集して投げられる](./01_spec.md#4-クエリの実行と編集)以上、ここが一番効く防御線。

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

```ts
const plan = await runOnce(session, `EXPLAIN ${cypher}`);   // 実行はされない

if (plan.summary.queryType !== 'r') {
  return err({ kind: 'read-only-violation', queryType: plan.summary.queryType });
}
```

> ### ⚠ 実装の最初に実測で確定させること
>
> `EXPLAIN CREATE (x:Tmp)` の `queryType` が
> - 内側のクエリを反映して **`'rw'`** を返すのか
> - EXPLAIN 自体が読み取りなので **`'r'`** を返すのか
>
> は、公式ドキュメントから確定できなかった。
>
> **`'r'` を返す場合は第 1 層が機能しない。** そのときは `summary.plan` の**演算子ツリー**を見る方式に切り替える（`CreateNode` / `MergeNode` / `SetProperty` / `Delete` などの書き込み演算子が出るかを判定）。これもサーバのプランナ出力なので、**サーバ権威のまま**である点は変わらない。

### 第 2 層 — ドライバの読み取りアクセスモード（保険）

`session.executeRead(...)` で実行する。第 1 層をすり抜けた場合の最後の砦。

単一インスタンスで実際に書き込みを拒否するかも実測で確認する。**拒否しなくても第 1 層が主防御なので設計は変わらない**が、どちらなのかは知っておく。

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
                                           verifyConnectivity()
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
type ConnectionStatus =
  | { readonly connected: false }
  | { readonly connected: true; readonly uri: string; readonly mode: 'manual' | 'dev-auto' };
```

クッキーの属性: `HttpOnly` / `SameSite=Strict` / `Path=/api` / 本番では `Secure` / **`Max-Age` を付けない**（セッションクッキー。タブを閉じれば消える）。

Vite の dev proxy で同一オリジンになるので、`fetch` は `credentials: 'same-origin'` で足りる。

### 正直に言っておくこと

**プロキシ方式を選んだ以上、パスワードは API プロセスを必ず通過する。** 「管理しない」は、以下の実装規律で担保する。

| 対策 | 内容 |
|---|---|
| **ディスクに書かない** | 手入力の資格情報は永続化しない |
| **ログに出さない** | Hono のロガーでリクエストボディを出さない。`/api/connect` はログ抑制 |
| **エラーをサニタイズ** | ドライバのエラーは URI に資格情報を含みうる。クライアントへ返す前に落とす |
| **メモリのみ** | サーバ側 `Map`。**サーバ再起動で全消滅** |
| **失効させる** | idle TTL 30 分で失効し、`driver.close()`。同時セッション数に上限 |
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

`neo4j-driver` は素の JSON ではない型を返す。

| ドライバの型 | 出現例 |
|---|---|
| `Integer` | `count(*)` |
| `Node` / `Relationship` / `Path` | `RETURN n`、`p = (…)` |
| `Date` | `Incident.date` |

**View がドライバを import せずに表を描けるよう、純関数で素の JSON に落とす。**

```ts
// packages/api/src/neo4j/toPlainJson.ts — 純粋。DB も I/O も触らない

// Neo4j Date  → '2025-07-16'
// Integer     → number（安全域を超えたら string）
// Node        → { kind: 'node', labels: ['Incident'], props: { … } }
```

形は `shared` の Zod スキーマで定義するので、**OpenAPI にも自動で載る**。

---

## 6. エンドポイント一覧

**どのエンドポイントもセッション識別子を body で受け取らない。** 識別子は httpOnly クッキーで往復する。

| メソッド | パス | リクエスト | レスポンス |
|---|---|---|---|
| `GET` | `/api/connect` | — | `ConnectionStatus`。未接続でも dev 自動接続が有効ならその場で繋ぐ |
| `POST` | `/api/connect` | `{ uri, user, password, database? }` | `ConnectionStatus` + `Set-Cookie`(httpOnly) |
| `DELETE` | `/api/connect` | — | クッキーを消し、`driver.close()` |
| `POST` | `/api/run` | `{ cypher }` | `QueryResult`（読み取り専用で実行） |
| `GET` | `/doc` | — | OpenAPI ドキュメント（JSON） |
| `GET` | `/docs` | — | Scalar による API リファレンス UI |

### 主なエラー

| ステータス | 意味 |
|---|---|
| `401` | クッキーが無い / セッションが失効している |
| `403` | [書き込みクエリのため拒否](#2-読み取り専用の強制多層) |
| `422` | Cypher の構文エラー（`EXPLAIN` が拾ったもの）、またはリクエストの検証エラー |
| `504` | トランザクションタイムアウト（既定 5 秒） |
