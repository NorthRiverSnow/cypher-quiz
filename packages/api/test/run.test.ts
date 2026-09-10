import { describe, expect, it } from "vite-plus/test";

import { CREDENTIALS, createTestApi, jar } from "./api";

const RUN = "/api/run";

const connected = async (options?: { timeoutMs: number }) => {
  const api = createTestApi(options);
  const cookie = jar(await api.send("POST", "/api/connect", { body: CREDENTIALS }));

  return {
    ...api,
    run: (cypher: string) => api.send("POST", RUN, { cookie, body: { cypher } }),
  };
};

describe("/api/run — 繋がっていないとき", () => {
  it("クッキーが無ければ 401", async () => {
    const { send } = createTestApi();
    const res = await send("POST", RUN, { body: { cypher: "RETURN 1" } });

    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ kind: "not-connected" });
  });

  /* why: 失効したクッキーも同じ扱い。分けると当てられる口ができる */
  it("知らないクッキーでも 401", async () => {
    const { send } = createTestApi();
    const res = await send("POST", RUN, {
      cookie: "cq_session=expired",
      body: { cypher: "RETURN 1" },
    });

    expect(res.status).toBe(401);
  });
});

describe("/api/run — 通す", () => {
  it("列と行を返す", async () => {
    const { run } = await connected();
    const res = await run("MATCH (n) RETURN count(n) AS n");

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ columns: ["n"], rows: [[73]] });
  });

  it("0 行でも列名を返す", async () => {
    const { run } = await connected();
    const res = await run("MATCH (t:Team) WHERE t.name = 'いない' RETURN t.name AS name");

    expect(await res.json()).toMatchObject({ columns: ["name"], rows: [] });
  });

  it("ノードは kind の付いた形で返る", async () => {
    const { run } = await connected();
    const res = (await (await run("MATCH (i:Incident {id:'INC-2101'}) RETURN i")).json()) as {
      rows: unknown[][];
    };

    expect(res.rows[0]?.[0]).toMatchObject({ kind: "node", labels: ["Incident"] });
  });

  /* why: 何を実行して何行返したかが後から追える（docs/03_api.md#8-ログ） */
  it("実行したクエリと行数がログに残る", async () => {
    const { run, events } = await connected();

    await run("MATCH (t:Team) RETURN t.name AS name");

    expect(events()).toContainEqual(
      expect.objectContaining({
        event: "query.run",
        cypher: "MATCH (t:Team) RETURN t.name AS name",
        readOnly: true,
      }),
    );
    expect(events().at(-1)).toMatchObject({ event: "req.end", status: 200, rows: 8 });
  });
});

describe("/api/run — 断る", () => {
  it("書き込みは 403 で、サーバの分類を添える", async () => {
    const { run } = await connected();
    const res = await run("CREATE (x:Tmp)");

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ kind: "read-only-violation", queryType: "w" });
  });

  /* why: 拒否したクエリもログに残る。何を止めたのかを後から確かめられる */
  it("拒否したクエリもログに残る", async () => {
    const { run, events } = await connected();

    await run("CREATE (x:Tmp)");

    expect(events()).toContainEqual(
      expect.objectContaining({ event: "query.run", cypher: "CREATE (x:Tmp)", readOnly: false }),
    );
    expect(events().at(-1)).toMatchObject({ event: "req.end", status: 403 });
  });

  it("拒否したクエリは 1 件も書き込んでいない", async () => {
    const { run } = await connected();

    await run("CREATE (x:Tmp)");
    const res = await run("MATCH (x:Tmp) RETURN count(x) AS n");

    expect(await res.json()).toMatchObject({ rows: [[0]] });
  });

  it("r の抜け道も 403", async () => {
    const { run } = await connected();
    const res = await run("LOAD CSV FROM 'http://x/y.csv' AS row RETURN row");

    expect(res.status).toBe(403);
  });

  it("構文エラーは 422", async () => {
    const { run } = await connected();
    const res = await run("MATCH (n) RETRUN n");

    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ kind: "syntax-error" });
  });

  it("空のクエリは 422", async () => {
    const { run } = await connected();
    const res = await run("");

    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ kind: "invalid-request" });
  });

  it("時間を超えたら 504", async () => {
    const { run } = await connected({ timeoutMs: 1 });
    const res = await run("UNWIND range(1, 200000000) AS x RETURN count(x)");

    expect(res.status).toBe(504);
    expect(await res.json()).toMatchObject({ kind: "timeout" });
  });
});
