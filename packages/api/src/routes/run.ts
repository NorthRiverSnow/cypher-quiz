import { ApiErrorSchema, QueryResultSchema, RunRequestSchema, isOk } from "@cypher-quiz/shared";
import { createRoute } from "@hono/zod-openapi";

import type { RunController } from "../controller/run";
import { readSessionId } from "../cookie";
import { createRouter, statusOf } from "./http";

export type RunDeps = Readonly<{ controller: RunController }>;

const failed = (description: string) => ({
  content: { "application/json": { schema: ApiErrorSchema } },
  description,
});

const post = createRoute({
  method: "post",
  path: "/",
  tags: ["run"],
  summary: "読み取り専用でクエリを実行する",
  request: { body: { content: { "application/json": { schema: RunRequestSchema } } } },
  responses: {
    200: {
      content: { "application/json": { schema: QueryResultSchema } },
      description: "実行結果。列名は 0 行でも返る",
    },
    401: failed("クッキーが無い、または失効している"),
    403: failed("書き込みのクエリ。`queryType` にサーバの分類が入る"),
    422: failed("構文エラー、またはリクエストの形が正しくない"),
    500: failed("想定外"),
    502: failed("ドライバが繋がらない"),
    504: failed("時間切れ"),
  },
});

/**
 * クエリの実行。**やることは、クッキーを読むことと Result をステータスに写すことだけ。**
 *
 * why: 行数を `rows` に入れる。req.end に載って、何行返したかが後から追える
 * （docs/03_api.md#8-ログ）
 */
export const runRoutes = ({ controller }: RunDeps) =>
  createRouter().openapi(post, async (c) => {
    const result = await controller.run(readSessionId(c), c.req.valid("json"));

    if (!isOk(result)) {
      return c.json(result.error, statusOf(result.error));
    }

    c.set("rows", result.value.rows.length);

    return c.json(result.value, 200);
  });
