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

describe("/api/connect — dev 自動接続", () => {
  it("有効でなければ繋ぎに行かない", async () => {
    const { send } = createTestApi();
    const res = await send("GET", CONNECT);

    expect(await res.json()).toEqual({ connected: false });
    expect(res.headers.get("set-cookie")).toBe(null);
  });

  it("クッキーが無ければ .env の資格情報で繋ぐ", async () => {
    const { send } = createTestApi({ devAuto: CREDENTIALS });
    const res = await send("GET", CONNECT);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ connected: true, uri: URI, mode: "dev-auto" });
  });

  /* why: 手入力の経路と同じクッキーを張る。ここだけ緩めるとフロントが識別子を持てる */
  it("識別子は httpOnly のクッキーで返す", async () => {
    const { send } = createTestApi({ devAuto: CREDENTIALS });
    const res = await send("GET", CONNECT);

    expect(res.headers.get("set-cookie")).toContain("HttpOnly");
    expect(JSON.stringify(await res.json())).not.toContain(jar(res).split("=")[1]);
  });

  it("そのクッキーで引くと同じ接続が返り、張り直さない", async () => {
    const { send } = createTestApi({ devAuto: CREDENTIALS });
    const cookie = jar(await send("GET", CONNECT));
    const again = await send("GET", CONNECT, { cookie });

    expect(cookie).not.toBe("");
    expect(await again.json()).toMatchObject({ mode: "dev-auto" });
    expect(again.headers.get("set-cookie")).toBe(null);
  });

  /* why: 手で繋ぎ直したものを自動接続で上書きしない（docs/03_api.md#歯止め の 5） */
  it("手入力で繋いだ後は manual のまま", async () => {
    const { send } = createTestApi({ devAuto: CREDENTIALS });
    const cookie = jar(await send("POST", CONNECT, { body: CREDENTIALS }));

    expect(await (await send("GET", CONNECT, { cookie })).json()).toMatchObject({
      mode: "manual",
    });
  });

  /* why: 切った直後は未接続。クッキーが消えているので、次に引いたときは繋ぎ直す */
  it("切って引き直すと、また自動接続する", async () => {
    const { send } = createTestApi({ devAuto: CREDENTIALS });
    const cookie = jar(await send("GET", CONNECT));

    await send("DELETE", CONNECT, { cookie });

    expect(await (await send("GET", CONNECT)).json()).toMatchObject({ mode: "dev-auto" });
  });

  /* why: 繋がらない相手を設定していても 200 のまま返す。フロントは接続画面を出せる */
  it("繋がらなければ未接続を返す", async () => {
    const { send } = createTestApi({ devAuto: { ...CREDENTIALS, password: "まちがい" } });
    const res = await send("GET", CONNECT);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ connected: false });
    expect(res.headers.get("set-cookie")).toBe(null);
  });

  it("繋がらなかった理由をログに残す", async () => {
    const { send, events } = createTestApi({ devAuto: { ...CREDENTIALS, password: "まちがい" } });

    await send("GET", CONNECT);

    expect(events().some(({ level }) => level === "warn" || level === "error")).toBe(true);
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

  /* why: 検証は OpenAPI の validator が先に走る。素通しだと Hono 既定の 400 が返る */
  it("形が違えば 422 で項目名を返す", async () => {
    const { send } = createTestApi();
    const res = await send("POST", CONNECT, { body: { uri: URI, user: "neo4j" } });

    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({
      kind: "invalid-request",
      message: "リクエストの形が正しくありません: password",
    });
  });

  it("壊れた JSON でも決まった形で返す", async () => {
    const { send } = createTestApi();
    const res = await send("POST", CONNECT, { raw: "{ こわれている" });

    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ kind: "invalid-request" });
  });

  /* why: パスワードが入りうる。文に値を入れると、そのままログにも応答にも出る */
  it("検証の文に値を入れない", async () => {
    const { send } = createTestApi();
    const res = await send("POST", CONNECT, { body: { ...CREDENTIALS, uri: "" } });

    expect(await res.text()).not.toContain(PASSWORD);
  });

  /* why: 平文のまま外へ出すとパスワードがネットワークに流れる。Neo4j のスキーム
     でなければ、繋ぎに行く前に断る */
  it("Neo4j のスキームでなければ 422", async () => {
    const { send } = createTestApi();
    const res = await send("POST", CONNECT, { body: { ...CREDENTIALS, uri: "http://x" } });

    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ kind: "invalid-request" });
  });

  it("URI に資格情報を埋めたら 422", async () => {
    const { send } = createTestApi();
    const res = await send("POST", CONNECT, {
      body: { ...CREDENTIALS, uri: `bolt://neo4j:${PASSWORD}@localhost:7687` },
    });

    expect(res.status).toBe(422);
    expect(await res.text()).not.toContain(PASSWORD);
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
