import { Scalar } from "@scalar/hono-api-reference";

import { type AppDeps, createApp } from "./app";
import { createConnectController } from "./controller/connect";
import type { CookieDeps } from "./cookie";
import type { DriverStore } from "./neo4j/driverStore";
import { connectRoutes } from "./routes/connect";

export type ApiDeps = AppDeps & CookieDeps & Readonly<{ store: DriverStore }>;

/* why: ドキュメントの見出し。バージョンは openapi.json の差分に出るので、
   上げるのは API の形を変えたときだけ */
const INFO = {
  openapi: "3.1.0",
  info: { title: "cypher-quiz API", version: "0.1.0" },
} as const;

/**
 * 全てのルートを載せた API。**server も テストも ドキュメント生成もここを通る。**
 *
 * why: 組み立てを 1 箇所にする。テストで別に組むと、載せ忘れたルートが
 * テストの中だけ存在しない状態になる
 */
export const createApi = (deps: ApiDeps) => {
  const app = createApp(deps);

  app.route(
    "/api/connect",
    connectRoutes({ controller: createConnectController(deps), secure: deps.secure }),
  );

  app.doc31("/doc", INFO);
  app.get("/docs", Scalar({ url: "/doc" }));

  return app;
};
