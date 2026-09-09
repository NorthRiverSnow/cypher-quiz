import { type Context, Hono } from "hono";
import { describe, expect, it } from "vite-plus/test";

import { clearSessionId, readSessionId, setSessionId } from "./cookie";

const headerOf = async (act: (c: Context) => void) => {
  const app = new Hono();

  app.get("/", (c) => {
    act(c);

    return c.text("ok");
  });

  return (await app.request("/")).headers.get("set-cookie") ?? "";
};

describe("setSessionId", () => {
  /* why: JS から読めないことが、識別子を渡さない設計の実体 */
  it("HttpOnly を付ける", async () => {
    expect(await headerOf((c) => setSessionId(c, "abc", { secure: false }))).toContain("HttpOnly");
  });

  it("他サイトからの遷移では送らせない", async () => {
    expect(await headerOf((c) => setSessionId(c, "abc", { secure: false }))).toContain(
      "SameSite=Strict",
    );
  });

  it("/api にだけ載せる", async () => {
    expect(await headerOf((c) => setSessionId(c, "abc", { secure: false }))).toContain("Path=/api");
  });

  /* why: 付けるとタブを閉じても残る。仕様は「リロードで再入力」に近づける側 */
  it("寿命を付けない", async () => {
    const header = await headerOf((c) => setSessionId(c, "abc", { secure: false }));

    expect(header).not.toContain("Max-Age");
    expect(header).not.toContain("Expires");
  });

  it("本番では Secure を付ける", async () => {
    expect(await headerOf((c) => setSessionId(c, "abc", { secure: true }))).toContain("Secure");
  });

  /* why: dev は http。付けるとブラウザが送らず、繋がったまま切れたように見える */
  it("dev では Secure を付けない", async () => {
    expect(await headerOf((c) => setSessionId(c, "abc", { secure: false }))).not.toContain(
      "Secure",
    );
  });
});

describe("readSessionId", () => {
  const read = async (cookie?: string) => {
    const app = new Hono();
    const seen: (string | undefined)[] = [];

    app.get("/", (c) => {
      seen.push(readSessionId(c));

      return c.text("ok");
    });

    await app.request("/", cookie === undefined ? {} : { headers: { cookie } });

    return seen[0];
  };

  it("設定した名前で読む", async () => {
    expect(await read("cq_session=abc")).toBe("abc");
  });

  it("無ければ undefined", async () => {
    expect(await read()).toBeUndefined();
    expect(await read("other=1")).toBeUndefined();
  });
});

describe("clearSessionId", () => {
  it("同じ道筋で消す", async () => {
    const header = await headerOf((c) => clearSessionId(c, { secure: false }));

    expect(header).toContain("Max-Age=0");
    expect(header).toContain("Path=/api");
  });
});
