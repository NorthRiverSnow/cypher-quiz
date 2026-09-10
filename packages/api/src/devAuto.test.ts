import { describe, expect, it } from "vite-plus/test";

import { readDevAuto } from "./devAuto";

const VALID = {
  DEV_AUTO_CONNECT: "true",
  NEO4J_URI: "bolt://neo4j:7687",
  NEO4J_USER: "neo4j",
  NEO4J_PASSWORD: "nordwind-dev",
};

const errorOf = (env: Record<string, string | undefined>): string => {
  const result = readDevAuto(env);

  if (result.ok) {
    throw new Error("err を期待したが ok が返った");
  }

  return result.error;
};

describe("有効にしていないとき", () => {
  it.each([
    ["変数が無い", {}],
    ["false", { ...VALID, DEV_AUTO_CONNECT: "false" }],
    ["空文字", { ...VALID, DEV_AUTO_CONNECT: "" }],
    ["TRUE（大文字）", { ...VALID, DEV_AUTO_CONNECT: "TRUE" }],
    ["1", { ...VALID, DEV_AUTO_CONNECT: "1" }],
  ])("%s なら undefined", (_, env) => {
    expect(readDevAuto(env)).toEqual({ ok: true, value: undefined });
  });

  it("production でも、有効にしていなければ止めない", () => {
    expect(readDevAuto({ NODE_ENV: "production" })).toEqual({ ok: true, value: undefined });
  });
});

describe("歯止め 1 — 本番では起動を拒否する", () => {
  it("production なら err", () => {
    expect(errorOf({ ...VALID, NODE_ENV: "production" })).toContain("production");
  });

  /* why: 拒否が先。足りない変数を先に見ると、本番で「値を足せば動く」と読めてしまう */
  it("値が揃っていなくても production の理由を返す", () => {
    expect(errorOf({ DEV_AUTO_CONNECT: "true", NODE_ENV: "production" })).toContain("production");
  });

  it.each(["development", "test", undefined])("NODE_ENV=%s なら通す", (value) => {
    expect(readDevAuto({ ...VALID, NODE_ENV: value })).toMatchObject({ ok: true });
  });
});

describe("歯止め 2 — 既定はローカル宛だけ", () => {
  it.each(["bolt://localhost:7687", "bolt://127.0.0.1:7687", "bolt://neo4j:7687"])(
    "%s は通る",
    (uri) => {
      expect(readDevAuto({ ...VALID, NEO4J_URI: uri })).toMatchObject({ ok: true });
    },
  );

  it("ローカル以外は err", () => {
    expect(errorOf({ ...VALID, NEO4J_URI: "neo4j+s://x.databases.neo4j.io" })).toContain(
      "DEV_AUTO_CONNECT_ALLOW_REMOTE",
    );
  });

  it("ALLOW_REMOTE=true なら通る", () => {
    const env = {
      ...VALID,
      NEO4J_URI: "neo4j+s://x.databases.neo4j.io",
      DEV_AUTO_CONNECT_ALLOW_REMOTE: "true",
    };

    expect(readDevAuto(env)).toMatchObject({ ok: true, value: { uri: env.NEO4J_URI } });
  });

  it("ALLOW_REMOTE が true 以外なら解除しない", () => {
    const env = {
      ...VALID,
      NEO4J_URI: "bolt://example.com:7687",
      DEV_AUTO_CONNECT_ALLOW_REMOTE: "1",
    };

    expect(errorOf(env)).toContain("DEV_AUTO_CONNECT_ALLOW_REMOTE");
  });
});

describe("値が足りないとき", () => {
  it.each(["NEO4J_URI", "NEO4J_USER", "NEO4J_PASSWORD"] as const)("%s が無ければ err", (name) => {
    expect(errorOf({ ...VALID, [name]: undefined })).toContain(name);
  });

  it("空文字も無いものとして扱う", () => {
    expect(errorOf({ ...VALID, NEO4J_PASSWORD: "" })).toContain("NEO4J_PASSWORD");
  });

  it("足りないものを全て並べる", () => {
    const message = errorOf({ DEV_AUTO_CONNECT: "true" });

    expect(message).toContain("NEO4J_URI");
    expect(message).toContain("NEO4J_USER");
    expect(message).toContain("NEO4J_PASSWORD");
  });
});

describe("URI の検査", () => {
  it("形が正しくなければ err", () => {
    expect(errorOf({ ...VALID, NEO4J_URI: "７６８７" })).toContain("NEO4J_URI");
  });

  it("scheme が Neo4j のものでなければ err", () => {
    expect(errorOf({ ...VALID, NEO4J_URI: "http://localhost:7687" })).toContain("bolt");
  });

  /* why: 起動バナーに出す値なので、ここで弾かないと .env の資格情報が標準出力に出る */
  it("URI に資格情報が埋まっていたら err", () => {
    expect(errorOf({ ...VALID, NEO4J_URI: "bolt://neo4j:pass@localhost:7687" })).toContain(
      "含めないでください",
    );
  });

  it("失敗の文に URI を写さない", () => {
    expect(errorOf({ ...VALID, NEO4J_URI: "bolt://neo4j:pass@localhost:7687" })).not.toContain(
      "pass",
    );
  });

  it("ローカル以外は暗号化スキームに繋ぎ変える", () => {
    const env = {
      ...VALID,
      NEO4J_URI: "bolt://example.com:7687",
      DEV_AUTO_CONNECT_ALLOW_REMOTE: "true",
    };

    expect(readDevAuto(env)).toEqual({
      ok: true,
      value: { uri: "bolt+s://example.com:7687", user: "neo4j", password: "nordwind-dev" },
    });
  });
});

it("読み取った資格情報をそのまま渡す", () => {
  expect(readDevAuto(VALID)).toEqual({
    ok: true,
    value: { uri: "bolt://neo4j:7687", user: "neo4j", password: "nordwind-dev" },
  });
});
