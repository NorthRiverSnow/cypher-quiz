import { describe, expect, it } from "vite-plus/test";

import { ConnectionStatusSchema, ConnectRequestSchema } from "./connect";
import { ApiErrorSchema } from "./error";
import { QueryResultSchema, RunRequestSchema } from "./query";

describe("ConnectRequestSchema", () => {
  it("4 つ揃った要求は正常終了する", () => {
    const input = {
      uri: "neo4j+s://xxxxxxxx.databases.neo4j.io",
      user: "neo4j",
      password: "workshop",
      database: "deck",
    };

    expect(ConnectRequestSchema.parse(input)).toEqual(input);
  });

  it("データベース名は省略できる", () => {
    const input = { uri: "bolt://localhost:7687", user: "neo4j", password: "workshop" };

    expect(ConnectRequestSchema.parse(input)).toEqual(input);
  });

  /* why: 空文字で繋ぎに行くと、ドライバの分かりにくい例外になる */
  it("空の URI はエラーにする", () => {
    const parsed = ConnectRequestSchema.safeParse({ uri: "", user: "neo4j", password: "x" });

    expect(parsed.success).toBe(false);
  });
});

describe("ConnectionStatusSchema", () => {
  it("接続済みは接続先と経路を持つ", () => {
    const input = { connected: true, uri: "bolt://localhost:7687", mode: "dev-auto" };

    expect(ConnectionStatusSchema.parse(input)).toEqual(input);
  });

  it("未接続は connected だけを持つ", () => {
    expect(ConnectionStatusSchema.parse({ connected: false })).toEqual({ connected: false });
  });

  it("user と password は復路の形に無い", () => {
    const parsed = ConnectionStatusSchema.parse({
      connected: true,
      uri: "bolt://localhost:7687",
      mode: "manual",
      user: "neo4j",
      password: "workshop",
    });

    expect(parsed).not.toHaveProperty("user");
    expect(parsed).not.toHaveProperty("password");
  });

  /* why: 未接続の側に uri を置かない。繋がっていないのに接続先があるように読める */
  it("接続済みで経路が無ければエラーにする", () => {
    expect(ConnectionStatusSchema.safeParse({ connected: true, uri: "bolt://x" }).success).toBe(
      false,
    );
  });
});

describe("QueryResultSchema", () => {
  it("ノードと素の値が混ざった結果は正常終了する", () => {
    const input = {
      columns: ["up", "e.name", "n", "ok", "missing"],
      rows: [
        [
          { kind: "node", labels: ["Service"], props: { name: "auth-service" } },
          "Killua Zoldyck",
          0,
          true,
          null,
        ],
      ],
      elapsedMs: 12,
    };

    expect(QueryResultSchema.parse(input)).toEqual(input);
  });

  it("行が無い結果も正常終了する", () => {
    const input = { columns: ["n"], rows: [], elapsedMs: 3 };

    expect(QueryResultSchema.parse(input)).toEqual(input);
  });

  it("知らない形のセルはエラーにする", () => {
    const unknownCell = QueryResultSchema.safeParse({
      columns: ["x"],
      rows: [[{ id: 1 }]],
      elapsedMs: 1,
    });
    const nodeWithoutProps = QueryResultSchema.safeParse({
      columns: ["up"],
      rows: [[{ kind: "node", labels: ["Service"] }]],
      elapsedMs: 1,
    });

    expect(unknownCell.success).toBe(false);
    expect(nodeWithoutProps.success).toBe(false);
  });

  it("行が配列でなければエラーにする", () => {
    const parsed = QueryResultSchema.safeParse({ columns: ["n"], rows: ["1"], elapsedMs: 1 });

    expect(parsed.success).toBe(false);
  });
});

describe("RunRequestSchema", () => {
  it("クエリは正常終了する", () => {
    const input = { cypher: "MATCH (n) RETURN count(n)" };

    expect(RunRequestSchema.parse(input)).toEqual(input);
  });

  it("空のクエリはエラーにする", () => {
    expect(RunRequestSchema.safeParse({ cypher: "" }).success).toBe(false);
  });
});

describe("ApiErrorSchema", () => {
  it("書き込み拒否はクエリの分類を添えて正常終了する", () => {
    const input = {
      kind: "read-only-violation",
      message: "書き込みのクエリは実行できません",
      queryType: "rw",
    };

    expect(ApiErrorSchema.parse(input)).toEqual(input);
  });

  it("分類の無い失敗も正常終了する", () => {
    const input = { kind: "timeout", message: "5 秒を超えました" };

    expect(ApiErrorSchema.parse(input)).toEqual(input);
  });

  it("知らない種類はエラーにする", () => {
    expect(ApiErrorSchema.safeParse({ kind: "teapot", message: "x" }).success).toBe(false);
  });
});
