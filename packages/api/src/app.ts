import { type ApiError, attemptAsync } from "@cypher-quiz/shared";
import { createMiddleware } from "hono/factory";

import type { Logger } from "./log";
import { type RequestLogDeps, requestLog } from "./middleware/requestLog";
import { INVALID_BODY, createRouter, statusOf } from "./routes/http";

export type AppDeps = RequestLogDeps;

const UNEXPECTED: ApiError = {
  kind: "unexpected",
  message: "想定外のエラーが起きました",
};

const asError = (cause: unknown): Error =>
  cause instanceof Error ? cause : new Error(String(cause));

/* why: 検証は @hono/zod-openapi が走らせるが、JSON として読めないボディはそこへ届く前に
   throw する。想定外の 500 になってしまうので、先に読んで invalid-request にする。
   Hono は読んだ本文を持つので、後ろの検証がもう一度読むことにはならない */
const readJson = createMiddleware(async (c, next) => {
  const json = (c.req.header("content-type") ?? "").includes("application/json");

  if (json && c.req.raw.body !== null) {
    const read = await attemptAsync(
      () => c.req.json<unknown>(),
      () => INVALID_BODY,
    );

    if (!read.ok) {
      return c.json(read.error, statusOf(read.error));
    }
  }

  return next();
});

/* why: Hono は Error でない throw を onError に渡さず、そのまま外へ投げる。
   文字列を投げられると応答もログも出ないので、届く形に包み直す */
const normalizeThrown = createMiddleware(async (_c, next) => {
  const result = await attemptAsync(next, asError);

  if (!result.ok) {
    throw result.error;
  }
});

/* why: スタックを外に出さない。中身はログにだけ残す（docs/03_api.md#7-失敗の返し方） */
const onUnexpected = (log: Logger, cause: unknown) => {
  const error = asError(cause);

  log({
    event: "error",
    name: error.name,
    message: error.message,
    stack: error.stack,
  });
};

/**
 * ルートを載せる前の器。ログの入口と、すり抜けた例外の受け皿を持つ。
 *
 * why: 依存を渡させる。時刻・reqId・出力先を固定できないとログをテストできない
 */
export const createApp = (deps: AppDeps) => {
  const app = createRouter();

  app.use(requestLog(deps));
  app.use(normalizeThrown);
  app.use(readJson);

  app.onError((cause, c) => {
    onUnexpected(deps.log, cause);

    return c.json(UNEXPECTED, 500);
  });

  return app;
};
