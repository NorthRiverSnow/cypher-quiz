import { Scalar } from "@scalar/hono-api-reference";

import { type AppDeps, createApp } from "./app";
import { createConnectController } from "./controller/connect";
import { createRunController } from "./controller/run";
import type { CookieDeps } from "./cookie";
import type { DevAuto } from "./devAuto";
import type { DriverStore } from "./neo4j/driverStore";
import { connectRoutes } from "./routes/connect";
import { runRoutes } from "./routes/run";

export type ApiDeps = AppDeps &
  CookieDeps &
  Readonly<{
    store: DriverStore;
    timeoutMs: number;
    /** 無ければ dev 自動接続をしない（docs/03_api.md#4-開発時の自動接続dev-限定） */
    devAuto?: DevAuto;
  }>;

const INFO = {
  openapi: "3.1.0",
  info: { title: "cypher-quiz API", version: "0.1.0" },
} as const;

/** 全てのルートを載せた API。**server もテストもドキュメント生成もここを通る** */
export const createApi = (deps: ApiDeps) => {
  const app = createApp(deps);

  app.route(
    "/api/connect",
    connectRoutes({ controller: createConnectController(deps), secure: deps.secure }),
  );

  app.route("/api/run", runRoutes({ controller: createRunController(deps) }));

  app.doc31("/doc", INFO);
  app.get("/docs", Scalar({ url: "/doc" }));

  return app;
};
