import { type ApiError, ERROR_KINDS, type Result, isOk } from "@cypher-quiz/shared";
import { Hono } from "hono";
import { describe, expect, it } from "vite-plus/test";
import { z } from "zod";

import { bodyOf, statusOf } from "./http";

const SCHEMA = z.object({
  user: z.string().min(1),
  password: z.string().min(8).regex(/\d/),
});

type Body = z.infer<typeof SCHEMA>;

const post = async (body: string) => {
  const app = new Hono();
  const seen: unknown[] = [];

  app.post("/", async (c) => {
    seen.push(await bodyOf(c, SCHEMA));

    return c.text("ok");
  });

  await app.request("/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });

  return seen[0] as Result<Body, ApiError>;
};

describe("statusOf", () => {
  it.each([
    ["not-connected", 401],
    ["read-only-violation", 403],
    ["syntax-error", 422],
    ["invalid-request", 422],
    ["timeout", 504],
    ["connect-failed", 502],
    ["unexpected", 500],
  ] as const)("%s → %d", (kind, status) => {
    expect(statusOf({ kind, message: "x" })).toBe(status);
  });

  /* why: 表に無い kind があると 500 に落ちる。型で塞いであることを件数でも確かめる */
  it("全ての kind に対応がある", () => {
    expect(ERROR_KINDS.map((kind) => statusOf({ kind, message: "x" }))).toHaveLength(
      ERROR_KINDS.length,
    );
  });
});

describe("bodyOf", () => {
  const messageOf = (result: Result<Body, ApiError>) => (isOk(result) ? "" : result.error.message);

  it("形が合えば値を返す", async () => {
    const result = await post(JSON.stringify({ user: "neo4j", password: "workshop1" }));

    expect(result).toEqual({ ok: true, value: { user: "neo4j", password: "workshop1" } });
  });

  it("JSON でなければ invalid-request", async () => {
    const result = await post("これは JSON ではない");

    expect(result).toMatchObject({ ok: false, error: { kind: "invalid-request" } });
  });

  it("項目が足りなければ invalid-request で項目名を出す", async () => {
    const result = await post(JSON.stringify({ user: "neo4j" }));

    expect(isOk(result)).toBe(false);
    expect(messageOf(result)).toBe("リクエストの形が正しくありません: password");
  });

  /* why: 1 つの項目に違反が 2 つ付くことがある。並べると同じ名前が繰り返される */
  it("同じ項目は 1 度だけ出す", async () => {
    const result = await post(JSON.stringify({ user: "neo4j", password: "ab" }));

    expect(messageOf(result)).toBe("リクエストの形が正しくありません: password");
  });

  /* why: パスワードが入りうる。文に値を入れると、そのままログにも応答にも出る */
  it("文に値を入れない", async () => {
    const result = await post(JSON.stringify({ user: "", password: "hunter2" }));

    expect(messageOf(result)).not.toContain("hunter2");
  });

  it("項目名が分からなければ項目名を出さない", async () => {
    const result = await post(JSON.stringify(["配列を送った"]));

    expect(messageOf(result)).toBe("リクエストの形が正しくありません");
  });
});
