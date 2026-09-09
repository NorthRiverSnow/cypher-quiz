import { isOk } from "@cypher-quiz/shared";
import neo4j, { type Driver, type QueryResult } from "neo4j-driver";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";

import { createLogger } from "../log";
import { toCell, toPlainJson } from "./toPlainJson";
import { runReadOnly } from "./tx";

const URI = process.env.NEO4J_TEST_URI ?? "bolt://localhost:7688";
const PASSWORD = process.env.NEO4J_PASSWORD ?? "";

const log = createLogger({ now: () => new Date(0), write: () => undefined });

let driver: Driver;

/* why: 列名は runReadOnly が Result.keys() から拾って返す。ここで session を開くと
   本番と違う経路を確かめることになる */
const query = async (cypher: string) => {
  const ran = await runReadOnly({ log, timeoutMs: 5000 }, { driver, reqId: "t1", cypher });

  if (!isOk(ran)) {
    throw new Error(ran.error.message);
  }

  return toPlainJson(ran.value.keys, ran.value.result);
};

beforeAll(async () => {
  driver = neo4j.driver(URI, neo4j.auth.basic("neo4j", PASSWORD));
  await driver.getServerInfo();
});

afterAll(async () => {
  await driver.close();
});

describe("toCell", () => {
  it("安全域に収まる Integer は数値にする", () => {
    expect(toCell(neo4j.int(73))).toBe(73);
  });

  /* why: 2^53 を超えると number では桁が変わる。読める形で桁を残す */
  it("安全域を超える Integer は文字列にする", () => {
    expect(toCell(neo4j.int("9007199254740993"))).toBe("9007199254740993");
  });

  it("日付は ISO の文字列にする", () => {
    const date = new neo4j.types.Date(neo4j.int(2025), neo4j.int(8), neo4j.int(5));

    expect(toCell(date)).toBe("2025-08-05");
  });

  it("期間も文字列にする", () => {
    const duration = new neo4j.types.Duration(
      neo4j.int(0),
      neo4j.int(1),
      neo4j.int(2),
      neo4j.int(0),
    );

    expect(toCell(duration)).toBe("P0M1DT2S");
  });

  it("空間の点も文字列にする", () => {
    const point = new neo4j.types.Point(neo4j.int(7203), 1.5, 2.5);

    expect(toCell(point)).toContain("1.5");
  });

  it("値の無いセルは null にする", () => {
    expect(toCell(null)).toBeNull();
    expect(toCell(undefined)).toBeNull();
  });

  it("入れ子のリストも中まで変換する", () => {
    expect(toCell([[neo4j.int(1)], [neo4j.int(2), "x"]])).toEqual([[1], [2, "x"]]);
  });

  /* why: Map は toString を上書きしない。読める表記を持たないクラスの代表として使う */
  it("読める表記を持たないものは null にする", () => {
    expect(toCell(new Map())).toBeNull();
  });

  it("オブジェクトでない未知の値も null にする", () => {
    expect(toCell(Symbol("x"))).toBeNull();
  });

  it("マップはタグを付けて中まで変換する", () => {
    expect(toCell({ n: neo4j.int(3) })).toEqual({ kind: "map", props: { n: 3 } });
  });
});

describe("toPlainJson", () => {
  it("列名と行を返す", async () => {
    const result = await query("MATCH (t:Team) RETURN t.name AS name ORDER BY name LIMIT 2");

    expect(result.columns).toEqual(["name"]);
    expect(result.rows).toHaveLength(2);
  });

  /* why: 0 行でもレコードから列名は取れない。取れると列見出しが消え、
     クエリが何を返すはずだったのか分からなくなる */
  it("0 行でも列名は残る", async () => {
    const result = await query("MATCH (t:Team) WHERE t.name = 'いない' RETURN t.name AS name");

    expect(result).toMatchObject({ columns: ["name"], rows: [] });
  });

  it("集約の結果は数値になる", async () => {
    const result = await query("MATCH (n) RETURN count(n) AS n");

    expect(result.rows).toEqual([[73]]);
  });

  it("ノードはラベルとプロパティにほどく", async () => {
    const result = await query("MATCH (i:Incident {id: 'INC-2101'}) RETURN i");

    expect(result.rows[0]?.[0]).toMatchObject({
      kind: "node",
      labels: ["Incident"],
      props: { id: "INC-2101" },
    });
  });

  /* why: Incident.date は Neo4j の date 型。素の JSON に無いので文字列にする */
  it("ノードの中の日付も文字列になる", async () => {
    const result = await query("MATCH (i:Incident {id: 'INC-2101'}) RETURN i");
    const node = result.rows[0]?.[0];
    const date = typeof node === "object" && node !== null && "props" in node && node.props["date"];

    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("リレーションは型とプロパティにほどく", async () => {
    const result = await query("MATCH ()-[r:DEPENDS_ON]->() RETURN r LIMIT 1");

    expect(result.rows[0]?.[0]).toEqual({ kind: "relationship", type: "DEPENDS_ON", props: {} });
  });

  it("パスはノードの列とリレーションの列にほどく", async () => {
    const result = await query(
      "MATCH p = (:Service {name: 'mobile-api'})-[:DEPENDS_ON]->(:Service) RETURN p LIMIT 1",
    );

    expect(result.rows[0]?.[0]).toMatchObject({
      kind: "path",
      nodes: [{ labels: ["Service"], props: { name: "mobile-api" } }, { labels: ["Service"] }],
      relationships: [{ type: "DEPENDS_ON" }],
    });
  });

  it("長さ 0 のパスはノード 1 つだけになる", async () => {
    const result = await query("MATCH p = (:Service {name: 'mobile-api'}) RETURN p");

    expect(result.rows[0]?.[0]).toMatchObject({ kind: "path", relationships: [] });
    expect(result.rows[0]?.[0]).toHaveProperty("nodes.length", 1);
  });

  it("collect はリストになる", async () => {
    const result = await query("MATCH (t:Team) RETURN collect(t.name) AS names");

    expect(result.rows[0]?.[0]).toHaveLength(8);
  });

  it("マップ射影はタグの付いたマップになる", async () => {
    const result = await query("MATCH (t:Team) RETURN t { .name } AS m ORDER BY m.name LIMIT 1");

    expect(result.rows[0]?.[0]).toMatchObject({ kind: "map" });
  });

  it("サーバ側の所要時間を返す", async () => {
    const result = await query("RETURN 1 AS n");

    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(result.elapsedMs)).toBe(true);
  });

  /* why: 実 DB の所要時間は毎回変わるので、足し合わせているかを確かめられない */
  it("所要時間は届くまでと読み終わるまでの合計", () => {
    const summary = {
      resultAvailableAfter: neo4j.int(3),
      resultConsumedAfter: neo4j.int(4),
    };

    expect(toPlainJson([], { records: [], summary } as unknown as QueryResult).elapsedMs).toBe(7);
  });
});
