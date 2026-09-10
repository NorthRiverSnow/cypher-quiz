import {
  ApiErrorSchema,
  ConnectRequestSchema,
  ConnectionStatusSchema,
  isOk,
} from "@cypher-quiz/shared";
import { createRoute } from "@hono/zod-openapi";

import type { ConnectController } from "../controller/connect";
import { type CookieDeps, clearSessionId, readSessionId, setSessionId } from "../cookie";
import { createRouter, statusOf } from "./http";

export type ConnectDeps = CookieDeps & Readonly<{ controller: ConnectController }>;

const TAGS = ["connect"];

const status = {
  content: { "application/json": { schema: ConnectionStatusSchema } },
  description: "接続状態。未接続でも 200 を返す",
};

const failed = (description: string) => ({
  content: { "application/json": { schema: ApiErrorSchema } },
  description,
});

const get = createRoute({
  method: "get",
  path: "/",
  tags: TAGS,
  summary: "接続状態を返す。繋がっておらず dev 自動接続が有効ならその場で繋ぐ",
  responses: { 200: status },
});

const post = createRoute({
  method: "post",
  path: "/",
  tags: TAGS,
  summary: "接続する。識別子は httpOnly クッキーで返す",
  request: { body: { content: { "application/json": { schema: ConnectRequestSchema } } } },
  responses: {
    200: status,
    422: failed("リクエストの形が正しくない"),
    500: failed("想定外"),
    502: failed("ドライバが繋がらない"),
  },
});

const remove = createRoute({
  method: "delete",
  path: "/",
  tags: TAGS,
  summary: "切断する。クッキーを消し、ドライバを閉じる",
  responses: { 200: status },
});

/**
 * 接続の 3 本。やるのはクッキーの読み書きと、Result をステータスに写すことだけ。
 *
 * why: 応答の本文に識別子を入れない。入れるとフロントが持てるようになる
 */
export const connectRoutes = ({ controller, secure }: ConnectDeps) =>
  createRouter()
    .openapi(get, async (c) => {
      const { id, status } = await controller.status(readSessionId(c));

      if (id !== undefined) {
        setSessionId(c, id, { secure });
      }

      return c.json(status, 200);
    })
    .openapi(post, async (c) => {
      const opened = await controller.open(readSessionId(c), c.req.valid("json"));

      if (!isOk(opened)) {
        /* why: 返るのは宣言した 3 つだけだが、どれかは controller が決めるので型では絞れない */
        return c.json(opened.error, statusOf(opened.error) as 422 | 500 | 502);
      }

      setSessionId(c, opened.value.id, { secure });

      return c.json(opened.value.status, 200);
    })
    .openapi(remove, async (c) => {
      const closed = await controller.close(readSessionId(c));

      clearSessionId(c, { secure });

      return c.json(closed, 200);
    });
