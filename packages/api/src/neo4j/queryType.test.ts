import neo4j, { type Driver } from "neo4j-driver";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";

import { acceptReadOnly } from "./readOnly";

/* why: テスト用の Neo4j に繋ぐ。ホストから見たポートは 7688（dev の 7687 とは別）
   立ち上げと片付けは scripts/with-test-db.sh */
const URI = process.env.NEO4J_TEST_URI ?? "bolt://localhost:7688";
const PASSWORD = process.env.NEO4J_PASSWORD ?? "";

let driver: Driver;

const explain = async (cypher: string) => {
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });

  try {
    return (await session.run(`EXPLAIN ${cypher}`)).summary;
  } finally {
    await session.close();
  }
};

const queryTypeOf = async (cypher: string): Promise<string> => (await explain(cypher)).queryType;

beforeAll(async () => {
  driver = neo4j.driver(URI, neo4j.auth.basic("neo4j", PASSWORD));

  /* why: verifyConnectivity は 6.0 で戻り値が変わる予定で @deprecated が付いている。
     繋がらなければ throw する点は getServerInfo も同じ */
  await driver.getServerInfo();
});

afterAll(async () => {
  await driver.close();
});

/* why: サーバが返す分類に依存した設計なので、Neo4j を上げたときにここが失敗すれば気づける。
   実測の一覧は docs/03_api.md#第-1-層--explain-によるサーバ権威の分類主防御 */
describe("EXPLAIN が返す分類", () => {
  it.each([
    ["MATCH (n) RETURN count(n)", "r"],
    ["CALL { MATCH (n) RETURN count(n) AS c } RETURN c", "r"],
    ["CALL db.labels()", "r"],
    ["SHOW INDEXES", "r"],
    ["CREATE (x:Tmp)", "w"],
    ["MERGE (x:Tmp {id: 1})", "w"],
    ["MATCH (n:Team) SET n.x = 1", "w"],
    ["MATCH (n:Team) REMOVE n.x", "w"],
    ["MATCH (n:Tmp) DELETE n", "w"],
    ["MATCH (t:Team) FOREACH (x IN [1] | SET t.y = x)", "w"],
    ["MATCH (t:Team) CALL { WITH t CREATE (:Tmp) } RETURN count(*)", "rw"],
    ["CREATE INDEX tmp_idx IF NOT EXISTS FOR (n:Team) ON (n.name)", "s"],
  ])("%s → %s", async (cypher, expected) => {
    expect(await queryTypeOf(cypher)).toBe(expected);
  });

  /* why: 利用者は自分の Aura にも繋げる。Community では動かない GRANT 系も
     Enterprise では通るので、分類が "s" であることに依存している */
  it.each([
    "CREATE USER bob SET PASSWORD 'secret12345'",
    "DROP USER bob",
    "ALTER USER neo4j SET PASSWORD 'secret12345'",
    "RENAME USER neo4j TO bob",
    "SHOW USERS",
    "SHOW DATABASES",
    "DROP CONSTRAINT tmp_c IF EXISTS",
    "DROP INDEX tmp_idx IF EXISTS",
    "CALL dbms.components()",
  ])("%s → s", async (cypher) => {
    expect(await queryTypeOf(cypher)).toBe("s");
  });

  /* why: Community は権限まわりを持たないので、パースの時点で止まる。
     Enterprise では "s" になる（実測済み。ここでは動かせない） */
  it.each([
    "CREATE ROLE auditor",
    "GRANT ROLE reader TO bob",
    "GRANT READ {*} ON GRAPH * TO reader",
    "DENY WRITE ON GRAPH * TO reader",
    "REVOKE ROLE reader FROM bob",
    "SHOW PRIVILEGES",
    "CREATE DATABASE tmpdb",
    "DROP DATABASE tmpdb",
    "STOP DATABASE neo4j",
  ])("%s は Community では throw する", async (cypher) => {
    await expect(queryTypeOf(cypher)).rejects.toMatchObject({
      code: "Neo.ClientError.Statement.UnsupportedAdministrationCommand",
    });
  });

  it("構文エラーは EXPLAIN の時点で throw する", async () => {
    await expect(queryTypeOf("MATCH (n) RETRUN n")).rejects.toMatchObject({
      code: "Neo.ClientError.Statement.SyntaxError",
    });
  });
});

describe("第 2 層 — 読み取りアクセスモード", () => {
  /* why: 第 1 層をすり抜けても、ドライバのモードだけで止まることを実測で残す */
  it.each(["CREATE (x:Tmp)", "CREATE INDEX tmp_idx IF NOT EXISTS FOR (n:Team) ON (n.name)"])(
    "%s を実行しようとすると拒否される",
    async (cypher) => {
      const session = driver.session({ defaultAccessMode: neo4j.session.READ });

      await expect(session.run(cypher)).rejects.toMatchObject({
        code: "Neo.ClientError.Statement.AccessMode",
      });

      await session.close();
    },
  );

  it("拒否されたクエリは 1 件も書き込んでいない", async () => {
    const session = driver.session({ defaultAccessMode: neo4j.session.READ });
    const result = await session.run("MATCH (x:Tmp) RETURN count(x) AS n");

    expect(result.records[0]?.get("n").toNumber()).toBe(0);

    await session.close();
  });
});

describe("acceptReadOnly と繋ぐ", () => {
  it("書き込みクエリはサーバの分類で拒否できる", async () => {
    const result = acceptReadOnly(await queryTypeOf("CREATE (x:Tmp)"));

    expect(result).toMatchObject({ ok: false, error: { kind: "read-only-violation" } });
  });
});

/* why: 分類が "r" なのにグラフの読み取りではないもの。第 1 層だけでは止まらない */
describe("r に分類される抜け道", () => {
  it.each([
    ["LOAD CSV FROM 'http://x/y.csv' AS row RETURN row", "LoadCSV"],
    ["TERMINATE TRANSACTIONS 'neo4j-transaction-1'", "TerminateTransactions"],
    ["SHOW TRANSACTIONS", "ShowTransactions"],
    ["SHOW SETTINGS", "ShowSettings"],
  ])("%s は r だが %s が出る", async (cypher, operator) => {
    const summary = await explain(cypher);

    expect(summary.queryType).toBe("r");
    expect(JSON.stringify(summary.plan)).toContain(operator);
    expect(acceptReadOnly(summary.queryType, summary.plan)).toMatchObject({ ok: false });
  });

  it("ふつうの読み取りは通る", async () => {
    const summary = await explain("MATCH (t:Team)-[:OWNS]->(s) RETURN t.name, s.name");

    expect(acceptReadOnly(summary.queryType, summary.plan)).toEqual({ ok: true, value: undefined });
  });
});
