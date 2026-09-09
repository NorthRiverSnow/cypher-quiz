import {
  type ApiError,
  type ErrorKind,
  type Result,
  attemptAsync,
  err,
  ok,
} from "@cypher-quiz/shared";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ZodError, ZodType } from "zod";

/* why: Record で受ける。kind を足したときに、ここを埋めるまで型が通らない
   （docs/03_api.md#7-失敗の返し方 の表と 1 対 1） */
const STATUS: Record<ErrorKind, ContentfulStatusCode> = {
  "not-connected": 401,
  "read-only-violation": 403,
  "syntax-error": 422,
  "invalid-request": 422,
  timeout: 504,
  "connect-failed": 502,
  unexpected: 500,
};

export const statusOf = ({ kind }: ApiError): ContentfulStatusCode => STATUS[kind];

const INVALID = "リクエストの形が正しくありません";

/* why: 文に値を入れない。ボディにはパスワードが入りうるので、出すのは項目名だけ。
   Zod の既定の文も使わない——英語で、値を含むことがある */
const messageOf = ({ issues }: ZodError): string => {
  const fields = [
    ...new Set(issues.map(({ path }) => path.map(String).join(".")).filter((path) => path !== "")),
  ];

  return fields.length === 0 ? INVALID : `${INVALID}: ${fields.join(", ")}`;
};

/**
 * ボディを読んでスキーマに通す。JSON でなくても、形が合わなくても `invalid-request`。
 *
 * why: `c.req.json()` は壊れたボディで throw する。ルートごとに包むのをやめ、
 * 通る道を 1 本にする
 */
export const bodyOf = async <T>(c: Context, schema: ZodType<T>): Promise<Result<T, ApiError>> => {
  const raw = await attemptAsync(
    () => c.req.json<unknown>(),
    (): ApiError => ({ kind: "invalid-request", message: INVALID }),
  );

  if (!raw.ok) {
    return raw;
  }

  const parsed = schema.safeParse(raw.value);

  return parsed.success
    ? ok(parsed.data)
    : err({ kind: "invalid-request", message: messageOf(parsed.error) });
};
