import { describe, expect, it } from "vite-plus/test";

import { CREDENTIALS, PASSWORD, URI, createTestApi, jar } from "./api";

const CONNECT = "/api/connect";

describe("/api/connect — 繋いで、確かめて、切る", () => {
  it("クッキーが無ければ未接続", async () => {
    const { send } = createTestApi();
    const res = await send("GET", CONNECT);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ connected: false });
  });

  it("繋いだクッキーで接続済みが返る", async () => {
    const { send } = createTestApi();
    const opened = await send("POST", CONNECT, { body: CREDENTIALS });
    const status = await send("GET", CONNECT, { cookie: jar(opened) });

    expect(opened.status).toBe(200);
    expect(await status.json()).toEqual({ connected: true, uri: URI, mode: "manual" });
  });

  it("切ると未接続に戻る", async () => {
    const { send } = createTestApi();
    const cookie = jar(await send("POST", CONNECT, { body: CREDENTIALS }));

    await send("DELETE", CONNECT, { cookie });

    expect(await (await send("GET", CONNECT, { cookie })).json()).toEqual({ connected: false });
  });

  /* why: サーバ側を閉じるだけでは、ブラウザに使えないクッキーが残る */
  it("切るとクッキーも消す", async () => {
    const { send } = createTestApi();
    const cookie = jar(await send("POST", CONNECT, { body: CREDENTIALS }));
    const res = await send("DELETE", CONNECT, { cookie });

    expect(res.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  /* why: 前のクッキーが生きていると、切ったつもりの接続が残る */
  it("繋ぎ直すと前のクッキーは通らない", async () => {
    const { send } = createTestApi();
    const first = jar(await send("POST", CONNECT, { body: CREDENTIALS }));
    const second = jar(await send("POST", CONNECT, { cookie: first, body: CREDENTIALS }));

    expect(second).not.toBe(first);
    expect(await (await send("GET", CONNECT, { cookie: first })).json()).toEqual({
      connected: false,
    });
    expect(await (await send("GET", CONNECT, { cookie: second })).json()).toMatchObject({
      connected: true,
    });
  });
});

describe("/api/connect — 外に出さないもの", () => {
  it("識別子はクッキーにだけ載る", async () => {
    const { send } = createTestApi();
    const res = await send("POST", CONNECT, { body: CREDENTIALS });
    const id = jar(res).replace("cq_session=", "");

    expect(id).not.toBe("");
    expect(await res.text()).not.toContain(id);
  });

  it("クッキーは JS から読めない", async () => {
    const { send } = createTestApi();
    const res = await send("POST", CONNECT, { body: CREDENTIALS });

    expect(res.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("パスワードは応答にもログにも出ない", async () => {
    const { send, events } = createTestApi();
    const res = await send("POST", CONNECT, { body: CREDENTIALS });

    expect(await res.text()).not.toContain(PASSWORD);
    expect(JSON.stringify(events())).not.toContain(PASSWORD);
  });
});

describe("/api/connect — 失敗", () => {
  it("パスワードが違えば 502 でクッキーを出さない", async () => {
    const { send } = createTestApi();
    const res = await send("POST", CONNECT, { body: { ...CREDENTIALS, password: "ちがう" } });

    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ kind: "connect-failed" });
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("形が違えば 422", async () => {
    const { send } = createTestApi();
    const res = await send("POST", CONNECT, { body: { uri: URI, user: "neo4j" } });

    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ kind: "invalid-request" });
  });

  /* why: 失敗しても入口と出口が揃う。開いたままの req.start が残らないこと */
  it("失敗した要求も入口と出口が同じ reqId で並ぶ", async () => {
    const { send, events } = createTestApi();

    await send("POST", CONNECT, { body: { uri: URI, user: "neo4j" } });

    expect(events()).toMatchObject([
      { event: "req.start", reqId: "req-1", method: "POST", path: CONNECT },
      { event: "req.end", reqId: "req-1", status: 422 },
    ]);
  });
});
