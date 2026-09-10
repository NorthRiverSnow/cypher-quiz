---
name: api-new
description: api にエンドポイントを足す・直す手順。層の分け方、createRoute と createRouter、Result からステータスへの写し方、ログ、テストの 2 段、openapi.json の更新まで。packages/api を触るときに読む。
---

# エンドポイントを足す

**設計の正は `docs/03_api.md`。** ここに書くのは書き方だけ。

## 1. 3 つに分ける

| 置き場所                   | 書くこと                                                        | 書かないこと                                        |
| -------------------------- | --------------------------------------------------------------- | --------------------------------------------------- |
| `src/routes/<name>.ts`     | `createRoute` の宣言、クッキーの読み書き、`Result` → ステータス | 手順。`neo4j/` の import（lint がエラーにする）     |
| `src/controller/<name>.ts` | 手順の判断。`Result<T, ApiError>` を返す                        | `hono` と `cookie` の import（lint がエラーにする） |
| `src/neo4j/`               | ドライバとの往復                                                | —                                                   |

**ルートを読んで分かるのは「何を受け取り、何を返し、どのステータスにするか」だけ**にする。
繋ぐ順番のような判断は controller に置く。

`src/api.ts` に 1 行足して載せる。**ここが唯一の組み立て場所**で、`server.ts` も
`test/api.ts` も `scripts/openapi.ts` もここを通る。

## 2. 器は `createRouter()` から作る

```ts
export const fooRoutes = ({ controller }: FooDeps) =>
  createRouter().openapi(post, async (c) => { … });
```

**`new OpenAPIHono()` を直に書かない。** 検証エラーを `ApiError` にそろえる `defaultHook`
を渡し忘れたルートだけ、Hono 既定の 400 を返すようになる。

## 3. `createRoute` に返す status を全部書く

```ts
const post = createRoute({
  method: "post",
  path: "/", // マウント先が付いて /api/foo になる
  tags: ["foo"],
  summary: "一行で。/docs の一覧に出る",
  request: { body: { content: { "application/json": { schema: FooRequestSchema } } } },
  responses: {
    200: { content: { "application/json": { schema: FooSchema } }, description: "…" },
    401: failed("…"),
    403: failed("…"),
    422: failed("…"),
    500: failed("…"),
    502: failed("…"),
    504: failed("…"),
  },
});
```

- **宣言していない status は返せない**（型が止める）
- `statusOf()` は 6 つの union（401/403/422/500/502/504）を返す。**全部宣言すれば絞り込みが要らない**。
  一部しか返さないルートは、その場でキャストして `why:` を添える
- 検証は validator が走らせる。ルートは `c.req.valid("json")` を受け取るだけ

## 4. 失敗は `ApiError` 1 種類

```ts
const result = await controller.foo(readSessionId(c), c.req.valid("json"));

if (!isOk(result)) {
  return c.json(result.error, statusOf(result.error));
}
```

| 使うもの                          | いつ                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------- |
| `statusOf(error)`                 | `ApiError` → ステータス。**対応表を書き足さない**（`routes/http.ts` の 1 箇所） |
| `reportDriverError(log, cause)`   | ドライバの例外。想定外だけ元の文をログに残す                                    |
| `closeQuietly(log, name, target)` | 閉じる。失敗しても warn に残して続ける                                          |
| `attemptAsync` / `attempt`        | throw する処理。**`try` を書くのは `shared/result.ts` だけ**                    |

`kind` を増やすときは `shared` の `ERROR_KINDS` と `routes/http.ts` の `STATUS` と
`docs/03_api.md` §7 の表を**同時に**直す。片方だけだと型が通らない。

## 5. ログに `reqId` を渡さない

```ts
log({ event: "query.run", cypher, readOnly: true }); // reqId は書かない
```

ミドルウェアが `AsyncLocalStorage` に載せる。**行を返すルートは `c.set("rows", n)`** を
入れる——`req.end` に載る。

**ボディを出す口を作らない。** 外へ出る文字列は `redact.ts` を通す。

## 6. スキーマは `shared` に、素の zod で

```ts
export const FooSchema = z.object({ … });
```

- Hono を import しない。OpenAPI の付加情報は `.meta({ example })` で載せる
- **例に秘密の形を置かない**（パスワードに `example` を書かない）
- **再帰する型は `interface` で書く。** `type X = … | X[]` だと Hono の応答の型が
  「excessively deep」で解決できない。スキーマ側には `.meta({ id })` が要る

## 7. テストは 2 段

| 置き場所                        | 渡すもの     | 確かめること                                  |
| ------------------------------- | ------------ | --------------------------------------------- |
| `src/controller/<name>.test.ts` | 偽の依存     | 手順。順番、失効の扱い、渡し忘れ              |
| `test/<name>.test.ts`           | **本物だけ** | HTTP の入口と出口。ステータス、クッキー、ログ |

`test/` は `createTestApi()` の `send(method, path, { cookie, body })` から叩く。
**ルートを足したら `test/api.ts` にも載せる**——載せ忘れると、テストの中だけ存在しなくなる。

## 8. 終わったら

```
vp run openapi:write      # openapi.json を更新する。忘れると openapi:check が落ちる
vp check
vp run test:api
```

## 9. 壊して確かめる

**わざと壊してテストが失敗しなければ、そのテストは何も守っていない。**
1 つずつ書き換えて、失敗する件数を見る。

- ルート: クッキーを張らない / 失敗も 200 で返す / 検証を素通しする
- controller: 順番を入れ替える / 失効を無視する / 変換しない
- ログ: 行数を載せない / 資格情報を取り除かない

**退避はディレクトリごと。** `cp /tmp/$(basename $f)` は `controller/run.ts` と
`routes/run.ts` で衝突する。
