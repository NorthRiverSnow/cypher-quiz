import { describe, expect, it } from "vite-plus/test";

import { ConnectionStatusSchema, ConnectRequestSchema } from "./connect";
import { ApiErrorSchema, ERROR_KINDS } from "./error";
import { CellSchema, QueryResultSchema, RunRequestSchema } from "./query";

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

  /* why: 例は /docs の「試す」に初期値として入る。compose のサービス名だとホストから
     引けず、名前解決の失敗を毎回踏む */
  it("接続先の例はホストから引ける形にする", () => {
    expect(ConnectRequestSchema.shape.uri.meta()).toMatchObject({
      example: "bolt://localhost:7687",
    });
  });

  /* why: コミットする openapi.json にパスワードの形を残さない */
  it("パスワードには例を置かない", () => {
    expect(ConnectRequestSchema.shape.password.meta()?.["example"]).toBeUndefined();
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

  it("リレーション・パス・マップ・入れ子のリストも正常終了する", () => {
    const input = {
      columns: ["r", "p", "m", "grouped"],
      rows: [
        [
          { kind: "relationship", type: "DEPENDS_ON", props: {} },
          {
            kind: "path",
            nodes: [
              { kind: "node", labels: ["Service"], props: { name: "mobile-api" } },
              { kind: "node", labels: ["Service"], props: { name: "auth-service" } },
            ],
            relationships: [{ kind: "relationship", type: "DEPENDS_ON", props: {} }],
          },
          { kind: "map", props: { svc: "auth-service", up: 2 } },
          [["a", "b"], ["c"]],
        ],
      ],
      elapsedMs: 8,
    };

    expect(QueryResultSchema.parse(input)).toEqual(input);
  });

  /* why: 長さ 0 のパス（MATCH p = (n)）はリレーションを 1 本も持たない */
  it("リレーションの無いパスも正常終了する", () => {
    const input = {
      columns: ["p"],
      rows: [
        [
          {
            kind: "path",
            nodes: [{ kind: "node", labels: ["Service"], props: {} }],
            relationships: [],
          },
        ],
      ],
      elapsedMs: 1,
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
    /* why: マップにタグが要る理由。タグが無ければ、どんなオブジェクトも通ってしまう */
    const untaggedMap = QueryResultSchema.safeParse({
      columns: ["m"],
      rows: [[{ svc: "auth-service" }]],
      elapsedMs: 1,
    });

    expect(unknownCell.success).toBe(false);
    expect(nodeWithoutProps.success).toBe(false);
    expect(untaggedMap.success).toBe(false);
  });

  it("行が配列でなければエラーにする", () => {
    const parsed = QueryResultSchema.safeParse({ columns: ["n"], rows: ["1"], elapsedMs: 1 });

    expect(parsed.success).toBe(false);
  });
});

/* why: id が無いと OpenAPI の生成が自分を展開し続けてスタックが尽きる。
   Cell は自分をリストとして含む唯一のスキーマ */
describe("CellSchema", () => {
  it("再帰するので id を持つ", () => {
    expect(CellSchema.meta()).toMatchObject({ id: "Cell" });
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

  /* why: この 7 つが docs/03_api.md#7-失敗の返し方 のステータス対応表と 1 対 1 になる。
     片方だけ増えると、対応の無い kind が 500 に落ちる */
  it("種類は 7 つ", () => {
    expect([...ERROR_KINDS]).toEqual([
      "not-connected",
      "read-only-violation",
      "syntax-error",
      "invalid-request",
      "timeout",
      "connect-failed",
      "unexpected",
    ]);
  });
});
