import { createMiddleware } from "hono/factory";

import type { Logger } from "../log";

export type LogVariables = {
  reqId: string;
  /** ルートが入れる。req.end に載る。行を返さないルートは入れない */
  rows?: number;
};

export type RequestLogDeps = Readonly<{
  log: Logger;
  newReqId: () => string;
  now: () => Date;
}>;

/**
 * 1 リクエストの入口と出口を出す。`reqId` を後続の処理から引ける。
 *
 * why: ここで出せば、ルートを足すたびに書く必要がない。差し込み忘れがそのまま
 * 「出ないログ」になるのを防ぐ（docs/03_api.md#8-ログ）
 */
export const requestLog = ({ log, newReqId, now }: RequestLogDeps) =>
  createMiddleware<{ Variables: LogVariables }>(async (c, next) => {
    const reqId = newReqId();
    const startedAt = now().getTime();

    c.set("reqId", reqId);
    log({ event: "req.start", reqId, method: c.req.method, path: c.req.path });

    await next();

    log({
      event: "req.end",
      reqId,
      status: c.res.status,
      ms: now().getTime() - startedAt,
      rows: c.get("rows"),
    });
  });
