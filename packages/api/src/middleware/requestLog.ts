import { createMiddleware } from "hono/factory";

import type { Logger } from "../log";
import { withReqId } from "../reqContext";

export type LogVariables = {
  /** ルートが入れる。req.end に載る。行を返さないルートは入れない */
  rows?: number;
};

export type RequestLogDeps = Readonly<{
  log: Logger;
  newReqId: () => string;
  now: () => Date;
}>;

/** 1 リクエストの入口と出口を出す。**この中の処理は全て同じ `reqId` を引く** */
export const requestLog = ({ log, newReqId, now }: RequestLogDeps) =>
  createMiddleware<{ Variables: LogVariables }>((c, next) => {
    const startedAt = now().getTime();

    return withReqId(newReqId(), async () => {
      log({ event: "req.start", method: c.req.method, path: c.req.path });

      await next();

      log({
        event: "req.end",
        status: c.res.status,
        ms: now().getTime() - startedAt,
        rows: c.get("rows"),
      });
    });
  });
