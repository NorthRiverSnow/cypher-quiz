import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vite-plus/test";

import { createTestApi } from "./api";

const committed = () =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL("../../../openapi/openapi.json", import.meta.url)), "utf8"),
  ) as Record<string, unknown>;

const live = async () => (await (await createTestApi().send("GET", "/doc")).json()) as never;

describe("/doc", () => {
  it("OpenAPI 3.1 を返す", async () => {
    expect(await live()).toMatchObject({ openapi: "3.1.0", info: { title: "cypher-quiz API" } });
  });

  it("宣言したルートが載る", async () => {
    const doc = (await live()) as { paths: Record<string, Record<string, unknown>> };

    expect(Object.keys(doc.paths["/api/connect"] ?? {}).sort()).toEqual(["delete", "get", "post"]);
  });

  /* why: /doc は常に最新だが、コミットする openapi.json は書き出さないと古くなる。
     vp run openapi:check と同じことをテストでもやる */
  it("openapi.json がコミット済みの内容と一致する", async () => {
    expect(await live()).toEqual(committed());
  });
});

describe("/docs", () => {
  it("リファレンス UI を返す", async () => {
    const res = await createTestApi().send("GET", "/docs");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });
});
