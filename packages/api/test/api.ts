import { randomBytes } from "node:crypto";

import neo4j, { type Driver } from "neo4j-driver";
import { afterEach } from "vite-plus/test";

import { createApi } from "../src/api";
import { createLogger } from "../src/log";
import { type DriverStore, createDriverStore } from "../src/neo4j/driverStore";

export const URI = process.env.NEO4J_TEST_URI ?? "bolt://localhost:7688";
export const PASSWORD = process.env.NEO4J_PASSWORD ?? "";
export const CREDENTIALS = { uri: URI, user: "neo4j", password: PASSWORD };

const drivers: Driver[] = [];

/* why: 開いたドライバをテストごとに閉じる。残すと接続が積み上がり、vitest も終わらない */
afterEach(async () => {
  await Promise.all(drivers.splice(0).map((driver) => driver.close()));
});

export type Sent = Readonly<{
  cookie?: string;
  body?: unknown;
  /** JSON にせずそのまま送る。壊れたボディを試すため */
  raw?: string;
}>;

export type TestApi = Readonly<{
  send: (method: string, path: string, sent?: Sent) => Promise<Response>;
  events: () => Record<string, unknown>[];
  /** 後始末が本当に効いたかを確かめるために出す。要求は send から出すこと */
  store: DriverStore;
}>;

/** Set-Cookie を、次の要求に載せる形で取り出す */
export const jar = (res: Response): string => res.headers.get("set-cookie")?.split(";")[0] ?? "";

/**
 * 本物だけで組んだ API を返す。**偽物は 1 つも挟まない**
 * （ミドルウェア → ルート → controller → store → ドライバ → neo4j-test）。
 *
 * why: 組み立ては createApi に任せる。ここで組み直すと、載せ忘れたルートが
 * テストの中だけ存在しない状態になる（docs/02_architecture.md#テストは-2-段に置く）
 */
export const createTestApi = ({ timeoutMs = 5000 } = {}): TestApi => {
  const written: string[] = [];
  let issued = 0;

  const log = createLogger({ now: () => new Date(0), write: (line) => written.push(line) });
  const store = createDriverStore({
    log,
    now: () => Date.now(),
    newId: () => randomBytes(24).toString("base64url"),
    createDriver: ({ uri, user, password }) => {
      const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

      drivers.push(driver);

      return driver;
    },
    idleMs: 30 * 60 * 1000,
    maxSessions: 20,
  });

  const app = createApi({
    log,
    store,
    timeoutMs,
    newReqId: () => `req-${++issued}`,
    now: () => new Date(0),
    secure: false,
  });

  return {
    send: async (method, path, { cookie, body, raw } = {}) =>
      app.request(path, {
        method,
        headers: {
          "content-type": "application/json",
          ...(cookie === undefined || cookie === "" ? {} : { cookie }),
        },
        ...(raw === undefined ? {} : { body: raw }),
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    events: () => written.map((line) => JSON.parse(line) as Record<string, unknown>),
    store,
  };
};
