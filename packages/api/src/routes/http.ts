import type { ApiError, ErrorKind } from "@cypher-quiz/shared";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ZodError } from "zod";

import type { LogVariables } from "../middleware/requestLog";

/* why: satisfies で受ける。kind を足したときに、ここを埋めるまで型が通らない
   （docs/03_api.md#7-失敗の返し方 の表と 1 対 1）。as const にするのは、
   返る status を 6 つに絞るため——ContentfulStatusCode のままだと、宣言した
   responses に収まることをルートの型が確かめられない */
const STATUS = {
  "not-connected": 401,
  "read-only-violation": 403,
  "syntax-error": 422,
  "invalid-request": 422,
  timeout: 504,
  "connect-failed": 502,
  unexpected: 500,
} as const satisfies Record<ErrorKind, ContentfulStatusCode>;

/** 失敗のときに返しうる status。ルートはこの全てを responses に書けば絞り込まずに返せる */
export type ErrorStatus = (typeof STATUS)[ErrorKind];

export const statusOf = ({ kind }: ApiError): ErrorStatus => STATUS[kind];

const INVALID = "リクエストの形が正しくありません";

/** 項目名が分からないとき。JSON として読めないボディもこれ */
export const INVALID_BODY: ApiError = { kind: "invalid-request", message: INVALID };

/* why: 文に値を入れない。ボディにはパスワードが入りうるので、出すのは項目名だけ。
   Zod の既定の文も使わない——英語で、期待した形を含む */
const messageOf = ({ issues }: ZodError): string => {
  const fields = [
    ...new Set(issues.map(({ path }) => path.map(String).join(".")).filter((path) => path !== "")),
  ];

  return fields.length === 0 ? INVALID : `${INVALID}: ${fields.join(", ")}`;
};

/**
 * ルートを載せる器。**検証エラーを `ApiError` の形にそろえる hook を必ず持つ。**
 *
 * why: `new OpenAPIHono()` を直に書くと、hook を渡し忘れたルートだけ Hono 既定の
 * 400 を返す。ルートごとに書かせない
 */
export const createRouter = () =>
  new OpenAPIHono<{ Variables: LogVariables }>({
    defaultHook: (result, c) => {
      if (result.success) {
        return undefined;
      }

      const error: ApiError = { kind: "invalid-request", message: messageOf(result.error) };

      return c.json(error, statusOf(error));
    },
  });
