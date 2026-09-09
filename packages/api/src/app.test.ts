import { describe, expect, it } from "vite-plus/test";

import { createApp } from "./app";
import { createLogger } from "./log";

const AT = new Date("2026-09-09T10:31:02.441Z");

const setup = (steps = 0) => {
  const written: string[] = [];
  let tick = 0;
  let issued = 0;

  const log = createLogger({ now: () => AT, write: (line) => written.push(line) });
  const app = createApp({
    log,
    newReqId: () => `req-${++issued}`,
    /* why: 経過ミリ秒を検証できるように、呼ばれるたびに進む時計を渡す */
    now: () => new Date(AT.getTime() + (tick++ === 0 ? 0 : steps)),
  });

  return {
    app,
    log,
    events: () => written.map((line) => JSON.parse(line) as Record<string, unknown>),
  };
};

describe("createApp — リクエストのログ", () => {
  it("入口と出口を出す", async () => {
    const { app, events } = setup();
    app.get("/ok", (c) => c.text("ok"));

    await app.request("/ok");

    expect(events()).toMatchObject([
      { level: "info", event: "req.start", reqId: "req-1", method: "GET", path: "/ok" },
      { level: "info", event: "req.end", reqId: "req-1", status: 200 },
    ]);
  });

  /* why: reqId は 1 リクエストにつき 1 つ。行ごとに作り直すと、同じ要求の行が繋がらない */
  it("1 リクエストの行が同じ reqId で並ぶ", async () => {
    const { app, events } = setup();
    app.get("/ok", (c) => c.text("ok"));

    await app.request("/ok");

    expect(events().map((e) => e.reqId)).toEqual(["req-1", "req-1"]);
  });

  it("リクエストが変われば reqId も変わる", async () => {
    const { app, events } = setup();
    app.get("/ok", (c) => c.text("ok"));

    await app.request("/ok");
    await app.request("/ok");

    expect(events().map((e) => e.reqId)).toEqual(["req-1", "req-1", "req-2", "req-2"]);
  });

  /* why: ルートも DB も reqId を受け取らない。奥で出した行にも同じ値が載ること */
  it("ルートの奥で出した行にも同じ reqId が載る", async () => {
    const { app, log, events } = setup();
    app.get("/deep", async (c) => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      log({ event: "query.run", cypher: "RETURN 1", readOnly: true });

      return c.text("ok");
    });

    await app.request("/deep");

    expect(events().map((e) => e.reqId)).toEqual(["req-1", "req-1", "req-1"]);
  });

  it("かかった時間を出す", async () => {
    const { app, events } = setup(47);
    app.get("/ok", (c) => c.text("ok"));

    await app.request("/ok");

    expect(events()[1]?.ms).toBe(47);
  });

  it("ルートが行数を入れれば req.end に載る", async () => {
    const { app, events } = setup();
    app.get("/rows", (c) => {
      c.set("rows", 20);

      return c.text("ok");
    });

    await app.request("/rows");

    expect(events()[1]?.rows).toBe(20);
  });

  it("行数を入れなければ項目ごと出さない", async () => {
    const { app, events } = setup();
    app.get("/ok", (c) => c.text("ok"));

    await app.request("/ok");

    expect(events()[1]).not.toHaveProperty("rows");
  });

  it("失敗した応答も出口を出す", async () => {
    const { app, events } = setup();
    app.get("/gone", (c) => c.json({ kind: "not-connected", message: "x" }, 401));

    await app.request("/gone");

    expect(events()[1]).toMatchObject({ event: "req.end", status: 401 });
  });
});

describe("createApp — すり抜けた例外", () => {
  const boom = () => {
    const { app, events } = setup();
    app.get("/boom", () => {
      throw new TypeError("壊れた");
    });

    return { response: app.request("/boom"), events };
  };

  it("500 と決まった形を返す", async () => {
    const { response } = boom();
    const res = await response;

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ kind: "unexpected", message: "想定外のエラーが起きました" });
  });

  /* why: スタックはログにだけ残す。クライアントに返すと実装の中身が漏れる */
  it("応答にスタックを入れない", async () => {
    const { response } = boom();

    expect(JSON.stringify(await (await response).json())).not.toContain("壊れた");
  });

  it("error の行にスタックを残す", async () => {
    const { response, events } = boom();
    await response;

    expect(events()).toContainEqual(
      expect.objectContaining({
        level: "error",
        event: "error",
        name: "TypeError",
        message: "壊れた",
      }),
    );
    expect(events().find((e) => e.event === "error")?.stack).toContain("TypeError: 壊れた");
  });

  /* why: throw で抜けても出口が要る。ここが漏れると開いたままの req.start が残る */
  it("例外のあとも req.end を出す", async () => {
    const { response, events } = boom();
    await response;

    expect(events().at(-1)).toMatchObject({ event: "req.end", status: 500 });
  });

  it("Error でないものを投げても落ちない", async () => {
    const { app, events } = setup();
    app.get("/boom", () => {
      throw "文字列を投げた";
    });

    const res = await app.request("/boom");

    expect(res.status).toBe(500);
    expect(events().find((e) => e.event === "error")?.message).toBe("文字列を投げた");
  });

  /* why: ドライバの例外は URI を文に埋める。ログに出す前に取り除く */
  it("例外の文から資格情報を取り除く", async () => {
    const { app, events } = setup();
    app.get("/boom", () => {
      throw new Error("connect failed: bolt://neo4j:hunter2@db:7687");
    });

    await app.request("/boom");

    expect(events().find((e) => e.event === "error")?.message).toBe(
      "connect failed: bolt://db:7687",
    );
  });
});
