import { isOk } from "@cypher-quiz/shared";
import neo4j, { type Driver } from "neo4j-driver";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";

import { createLogger } from "../log";
import { runReadOnly } from "./tx";

const URI = process.env.NEO4J_TEST_URI ?? "bolt://localhost:7688";
const PASSWORD = process.env.NEO4J_PASSWORD ?? "";

let driver: Driver;

const captured = () => {
  const written: string[] = [];

  return {
    log: createLogger({ now: () => new Date(0), write: (line) => written.push(line) }),
    events: () => written.map((line) => JSON.parse(line) as Record<string, unknown>),
  };
};

const run = async (cypher: string, timeoutMs = 5000) => {
  const { log, events } = captured();
  const result = await runReadOnly({ log, timeoutMs }, { driver, reqId: "r1", cypher });

  return { result, events: events() };
};

beforeAll(async () => {
  driver = neo4j.driver(URI, neo4j.auth.basic("neo4j", PASSWORD));
  await driver.getServerInfo();
});

afterAll(async () => {
  await driver.close();
});

describe("runReadOnly — 通す", () => {
  it("読み取りの結果を返す", async () => {
    const { result } = await run("MATCH (n) RETURN count(n) AS n");

    expect(isOk(result) && result.value.records[0]?.get("n").toNumber()).toBe(73);
  });

  it("実行したクエリをログに出す", async () => {
    const { events } = await run("MATCH (n:Team) RETURN n.name AS name LIMIT 1");

    expect(events).toContainEqual(
      expect.objectContaining({
        event: "query.run",
        reqId: "r1",
        cypher: "MATCH (n:Team) RETURN n.name AS name LIMIT 1",
        readOnly: true,
      }),
    );
  });
});

describe("runReadOnly — 拒否する", () => {
  it("書き込みは実行せずに拒否する", async () => {
    const { result } = await run("CREATE (x:Tmp)");

    expect(result).toMatchObject({ ok: false, error: { kind: "read-only-violation" } });
  });

  /* why: 拒否したクエリもログに残る。何を止めたのかを後から確かめられる */
  it("拒否したクエリもログに出す", async () => {
    const { events } = await run("CREATE (x:Tmp)");

    expect(events).toContainEqual(
      expect.objectContaining({ event: "query.run", cypher: "CREATE (x:Tmp)", readOnly: false }),
    );
  });

  it("拒否したクエリは 1 件も書き込んでいない", async () => {
    await run("CREATE (x:Tmp)");

    const { result } = await run("MATCH (x:Tmp) RETURN count(x) AS n");

    expect(isOk(result) && result.value.records[0]?.get("n").toNumber()).toBe(0);
  });

  it("r の抜け道も拒否する", async () => {
    const { result } = await run("LOAD CSV FROM 'http://x/y.csv' AS row RETURN row");

    expect(result).toMatchObject({ ok: false, error: { kind: "read-only-violation" } });
  });

  it("構文エラーは syntax-error にする", async () => {
    const { result } = await run("MATCH (n) RETRUN n");

    expect(result).toMatchObject({ ok: false, error: { kind: "syntax-error" } });
  });

  /* why: 構文エラーは EXPLAIN で止まる。本体を実行していないので query.run は出ない */
  it("構文エラーでは query.run を出さない", async () => {
    const { events } = await run("MATCH (n) RETRUN n");

    expect(events.map((e) => e.event)).not.toContain("query.run");
  });

  it("時間を超えたら timeout にする", async () => {
    const { result } = await run("UNWIND range(1, 200000000) AS x RETURN count(x)", 1);

    expect(result).toMatchObject({ ok: false, error: { kind: "timeout" } });
  });

  it("存在しないデータベースは invalid-request にする", async () => {
    const { log } = captured();
    const result = await runReadOnly(
      { log, timeoutMs: 5000 },
      { driver, database: "そんなDBは無い", reqId: "r1", cypher: "RETURN 1" },
    );

    expect(result).toMatchObject({ ok: false, error: { kind: "invalid-request" } });
  });
});

describe("runReadOnly — セッション", () => {
  /* why: 閉じ忘れると接続が残り、やがて枯れる。失敗した経路でも閉じること */
  it("失敗しても接続を使い切らない", async () => {
    for (let i = 0; i < 40; i++) {
      await run("MATCH (n) RETRUN n");
    }

    const { result } = await run("MATCH (n) RETURN count(n) AS n");

    expect(isOk(result)).toBe(true);
  });
});

/* why: 第 2 層（読み取りモード）とセッションの後始末は、実 DB では観測できない。
   第 1 層が先に拒否するので第 2 層に届かず、閉じ忘れも数十回では枯れない */
describe("runReadOnly — ドライバへの渡し方", () => {
  const stub = (onRun?: () => never) => {
    const seen: { session?: unknown; tx?: unknown; closed: number } = { closed: 0 };

    const result = {
      summary: { queryType: "r", plan: { operatorType: "ProduceResults@neo4j", children: [] } },
      records: [],
    };

    const driver = {
      session: (config: unknown) => {
        seen.session = config;

        return {
          executeRead: async (work: (tx: unknown) => Promise<unknown>, config2: unknown) => {
            seen.tx = config2;

            return work({ run: () => (onRun === undefined ? result : onRun()) });
          },
          close: async () => {
            seen.closed += 1;
          },
        };
      },
    } as unknown as Driver;

    return { driver, seen };
  };

  const call = async (driver: Driver, database?: string) => {
    const { log } = captured();

    return runReadOnly(
      { log, timeoutMs: 1234 },
      { driver, reqId: "r1", cypher: "MATCH (n) RETURN n", ...(database ? { database } : {}) },
    );
  };

  it("読み取りモードでセッションを開く", async () => {
    const { driver, seen } = stub();
    await call(driver);

    expect(seen.session).toMatchObject({ defaultAccessMode: neo4j.session.READ });
  });

  it("データベースを渡さなければ指定しない", async () => {
    const { driver, seen } = stub();
    await call(driver);

    expect(seen.session).not.toHaveProperty("database");
  });

  it("データベースを渡せばそのまま伝える", async () => {
    const { driver, seen } = stub();
    await call(driver, "deck");

    expect(seen.session).toMatchObject({ database: "deck" });
  });

  it("トランザクションに上限を渡す", async () => {
    const { driver, seen } = stub();
    await call(driver);

    expect(seen.tx).toEqual({ timeout: 1234 });
  });

  it("成功したらセッションを閉じる", async () => {
    const { driver, seen } = stub();
    await call(driver);

    expect(seen.closed).toBe(1);
  });

  it("throw で抜けてもセッションを閉じる", async () => {
    const { driver, seen } = stub(() => {
      throw new Error("壊れた");
    });

    const result = await call(driver);

    expect(isOk(result)).toBe(false);
    expect(seen.closed).toBe(1);
  });
});
