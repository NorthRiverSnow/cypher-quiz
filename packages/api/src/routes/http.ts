import type { ApiError, ErrorKind } from "@cypher-quiz/shared";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ZodError } from "zod";

import type { LogVariables } from "../middleware/requestLog";

/* 対応は docs/03_api.md#7-失敗の返し方

   why: as const にする。ContentfulStatusCode のままだと戻り値が全 status の union になり、
   ルートが宣言した responses に収まることを型が確かめられない */
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

/* docs/03_api.md#invalid-request-の文に値を入れない */
const messageOf = ({ issues }: ZodError): string => {
  const fields = [
    ...new Set(issues.map(({ path }) => path.map(String).join(".")).filter((path) => path !== "")),
  ];

  return fields.length === 0 ? INVALID : `${INVALID}: ${fields.join(", ")}`;
};

/** ルートを載せる器。検証エラーを `ApiError` にそろえる（docs/03_api.md#器は-createrouter-から作る） */
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
