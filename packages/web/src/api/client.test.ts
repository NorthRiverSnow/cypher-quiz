import { describe, expect, it } from "vite-plus/test";

import { type Fetching, createApiClient } from "./client";

const STATUS = { connected: true, uri: "bolt://neo4j:7687", mode: "dev-auto" };
const RESULT = { columns: ["n"], rows: [["a"]], elapsedMs: 1 };
const CREDENTIALS = { uri: "bolt://localhost:7687", user: "neo4j", password: "hunter2" };

type Call = Readonly<{ path: string; init?: RequestInit }>;

const setup = (respond: (call: Call) => Response | Promise<Response>) => {
  const calls: Call[] = [];
  const fetching: Fetching = (path, init) => {
    calls.push({ path, ...(init === undefined ? {} : { init }) });

    return Promise.resolve(respond({ path, ...(init === undefined ? {} : { init }) }));
  };

  return { client: createApiClient(fetching), calls: () => calls };
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const ok = (body: unknown) => setup(() => json(body));

describe("要求の組み立て", () => {
  it("status は /api/connect を GET する", async () => {
    const { client, calls } = ok(STATUS);

    await client.status();

    expect(calls()[0]).toEqual({ path: "/api/connect" });
  });

  it("connect は資格情報を JSON で POST する", async () => {
    const { client, calls } = ok(STATUS);

    await client.connect(CREDENTIALS);

    expect(calls()[0]?.init).toMatchObject({
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(CREDENTIALS),
    });
  });

  it("disconnect は DELETE する", async () => {
    const { client, calls } = ok({ connected: false });

    await client.disconnect();

    expect(calls()[0]).toMatchObject({ path: "/api/connect", init: { method: "DELETE" } });
  });

  it("run は /api/run へクエリを POST する", async () => {
    const { client, calls } = ok(RESULT);

    await client.run({ cypher: "MATCH (n) RETURN n" });

    expect(calls()[0]).toMatchObject({
      path: "/api/run",
      init: { method: "POST", body: JSON.stringify({ cypher: "MATCH (n) RETURN n" }) },
    });
  });
});

describe("2xx の応答", () => {
  it("接続状態をそのまま返す", async () => {
    const { client } = ok(STATUS);

    expect(await client.status()).toEqual({ ok: true, value: STATUS });
  });

  it("クエリ結果をそのまま返す", async () => {
    const { client } = ok(RESULT);

    expect(await client.run({ cypher: "RETURN 1" })).toEqual({ ok: true, value: RESULT });
  });

  /* why: api が返さないはずの形。届いたら握り潰さず unexpected にする */
  it("形が合わなければ unexpected", async () => {
    const { client } = ok({ connected: "yes" });

    expect(await client.status()).toMatchObject({ ok: false, error: { kind: "unexpected" } });
  });
});

describe("2xx でない応答", () => {
  it("api が返した kind をそのまま渡す", async () => {
    const { client } = setup(() =>
      json({ kind: "not-connected", message: "繋がっていません" }, 401),
    );

    expect(await client.run({ cypher: "RETURN 1" })).toEqual({
      ok: false,
      error: { kind: "not-connected", message: "繋がっていません" },
    });
  });

  it("queryType も落とさない", async () => {
    const { client } = setup(() =>
      json({ kind: "read-only-violation", message: "拒否", queryType: "w" }, 403),
    );

    expect(await client.run({ cypher: "CREATE (x)" })).toMatchObject({
      ok: false,
      error: { queryType: "w" },
    });
  });

  /* why: proxy や dev サーバが返す HTML の 502 など、api を経由しない応答がある */
  it("ApiError の形でなければ unexpected", async () => {
    const { client } = setup(() => json({ error: "Bad Gateway" }, 502));

    expect(await client.status()).toMatchObject({ ok: false, error: { kind: "unexpected" } });
  });
});

describe("api へ届かないとき", () => {
  it("fetch が throw したら connect-failed", async () => {
    const { client } = setup(() => {
      throw new TypeError("Failed to fetch");
    });

    expect(await client.status()).toMatchObject({ ok: false, error: { kind: "connect-failed" } });
  });

  it("本文が JSON でなければ unexpected", async () => {
    const { client } = setup(() => new Response("<html>502</html>", { status: 502 }));

    expect(await client.status()).toMatchObject({ ok: false, error: { kind: "unexpected" } });
  });

  /* why: 200 でも本文が壊れていることがある。throw させずに err で返す */
  it("2xx でも本文が JSON でなければ unexpected", async () => {
    const { client } = setup(() => new Response("not json"));

    expect(await client.run({ cypher: "RETURN 1" })).toMatchObject({
      ok: false,
      error: { kind: "unexpected" },
    });
  });
});
