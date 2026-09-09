import { ConnectRequestSchema, isOk } from "@cypher-quiz/shared";
import { Hono } from "hono";

import type { ConnectController } from "../controller/connect";
import { type CookieDeps, clearSessionId, readSessionId, setSessionId } from "../cookie";
import type { LogVariables } from "../middleware/requestLog";
import { bodyOf, statusOf } from "./http";

export type ConnectDeps = CookieDeps & Readonly<{ controller: ConnectController }>;

/**
 * 接続の 3 本。**やることは、クッキーの読み書きと Result をステータスに写すことだけ。**
 *
 * why: 応答の本文に識別子を入れない。入れるとフロントが持てるようになり、
 * localStorage に置く道が開く
 */
export const connectRoutes = ({ controller, secure }: ConnectDeps) =>
  new Hono<{ Variables: LogVariables }>()
    .get("/", async (c) => {
      // TODO: C-6 で dev 自動接続をここに足す（クッキーが無く、有効なら繋いで返す）
      return c.json(await controller.status(readSessionId(c)));
    })
    .post("/", async (c) => {
      const body = await bodyOf(c, ConnectRequestSchema);

      if (!isOk(body)) {
        return c.json(body.error, statusOf(body.error));
      }

      const opened = await controller.open(readSessionId(c), body.value);

      if (!isOk(opened)) {
        return c.json(opened.error, statusOf(opened.error));
      }

      setSessionId(c, opened.value.id, { secure });

      return c.json(opened.value.status);
    })
    .delete("/", async (c) => {
      const status = await controller.close(readSessionId(c));

      clearSessionId(c, { secure });

      return c.json(status);
    });
