import { isOk } from "@cypher-quiz/shared";
import neo4j, { type Driver } from "neo4j-driver";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";

import { createLogger } from "../log";
import type { DriverStore, Session } from "../neo4j/driverStore";
import { createRunController } from "./run";

const URI = process.env.NEO4J_TEST_URI ?? "bolt://localhost:7688";
const PASSWORD = process.env.NEO4J_PASSWORD ?? "";
const LIVE = "live";

let driver: Driver;

beforeAll(async () => {
  driver = neo4j.driver(URI, neo4j.auth.basic("neo4j", PASSWORD));
  await driver.getServerInfo();
});

afterAll(async () => {
  await driver.close();
});

/* why: controller が store から使うのは get だけ。他は呼ばれないことも含めて固定する */
const setup = (database?: string, timeoutMs = 5000) => {
  const session: Session = {
    driver,
    uri: URI,
    mode: "manual",
    ...(database === undefined ? {} : { database }),
  };
  const store = {
    get: async (id: string | undefined) => (id === LIVE ? session : undefined),
    open: () => Promise.reject(new Error("呼ばれない")),
    close: () => Promise.reject(new Error("呼ばれない")),
    sweep: () => Promise.reject(new Error("呼ばれない")),
    closeAll: () => Promise.reject(new Error("呼ばれない")),
  } as unknown as DriverStore;

  return createRunController({
    store,
    log: createLogger({ now: () => new Date(0), write: () => undefined }),
    timeoutMs,
  });
};

describe("run — 繋がっていないとき", () => {
  /* why: クッキーが無いのと失効しているのを分けない。分けると「あなたのセッションは
     失効しています」と当てられる口ができる */
  it.each([undefined, "expired"])("%s は not-connected", async (id) => {
    const result = await setup().run(id, { cypher: "RETURN 1 AS n" });

    expect(result).toMatchObject({ ok: false, error: { kind: "not-connected" } });
  });
});

describe("run — 繋がっているとき", () => {
  it("素の JSON にして返す", async () => {
    const result = await setup().run(LIVE, { cypher: "MATCH (n) RETURN count(n) AS n" });

    expect(result).toMatchObject({ ok: true, value: { columns: ["n"], rows: [[73]] } });
  });

  it("ノードはラベルとプロパティにほどく", async () => {
    const result = await setup().run(LIVE, {
      cypher: "MATCH (i:Incident {id:'INC-2101'}) RETURN i",
    });

    expect(isOk(result) && result.value.rows[0]?.[0]).toMatchObject({
      kind: "node",
      labels: ["Incident"],
    });
  });

  it("0 行でも列名を返す", async () => {
    const result = await setup().run(LIVE, {
      cypher: "MATCH (t:Team) WHERE t.name = 'いない' RETURN t.name AS name",
    });

    expect(result).toMatchObject({ ok: true, value: { columns: ["name"], rows: [] } });
  });

  it("書き込みは read-only-violation にする", async () => {
    const result = await setup().run(LIVE, { cypher: "CREATE (x:Tmp)" });

    expect(result).toMatchObject({ ok: false, error: { kind: "read-only-violation" } });
  });

  it("構文エラーは syntax-error にする", async () => {
    const result = await setup().run(LIVE, { cypher: "MATCH (n) RETRUN n" });

    expect(result).toMatchObject({ ok: false, error: { kind: "syntax-error" } });
  });

  it("時間を超えたら timeout にする", async () => {
    const result = await setup(undefined, 1).run(LIVE, {
      cypher: "UNWIND range(1, 200000000) AS x RETURN count(x)",
    });

    expect(result).toMatchObject({ ok: false, error: { kind: "timeout" } });
  });

  /* why: 接続時に指定したデータベースで走らせる。無視すると別のグラフを読む */
  it("セッションのデータベースを使う", async () => {
    const result = await setup("そんなDBは無い").run(LIVE, { cypher: "RETURN 1 AS n" });

    expect(result).toMatchObject({ ok: false, error: { kind: "invalid-request" } });
  });
});
