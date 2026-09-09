import { type ApiError, attemptAsync } from "@cypher-quiz/shared";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";

import type { Logger } from "./log";
import { type LogVariables, type RequestLogDeps, requestLog } from "./middleware/requestLog";

export type AppDeps = RequestLogDeps;

const UNEXPECTED: ApiError = {
  kind: "unexpected",
  message: "想定外のエラーが起きました",
};

const asError = (cause: unknown): Error =>
  cause instanceof Error ? cause : new Error(String(cause));

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
  const app = new Hono<{ Variables: LogVariables }>();

  app.use(requestLog(deps));
  app.use(normalizeThrown);

  app.onError((cause, c) => {
    onUnexpected(deps.log, cause);

    return c.json(UNEXPECTED, 500);
  });

  return app;
};
