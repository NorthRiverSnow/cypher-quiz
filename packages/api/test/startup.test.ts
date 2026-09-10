import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vite-plus/test";

import { PASSWORD, URI } from "./api";

const SERVER = fileURLToPath(new URL("../src/server.ts", import.meta.url));

type Started = Readonly<{ port: number; out: string }>;

/* why: PORT=0 にすると空きを OS が選ぶ。固定すると、動いている dev サーバとぶつかる */
const run = (env: Record<string, string>) =>
  spawn(process.execPath, ["--import", "tsx", SERVER], {
    env: { ...process.env, PORT: "0", ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });

/** 起動して待つ。**終わらせるのは呼ぶ側** */
const started = async (child: ReturnType<typeof run>): Promise<Started> => {
  let out = "";

  return new Promise<Started>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`起動しない: ${out}`)), 20_000);

    child.stdout.on("data", (chunk: Buffer) => {
      out += chunk.toString();

      const found = /api: http:\/\/localhost:(\d+)/.exec(out);

      if (found?.[1] !== undefined) {
        clearTimeout(timer);
        /* why: バナーは複数行に分かれて届く。最後の 1 行が出るまで少し待つ */
        setTimeout(() => resolve({ port: Number(found[1]), out }), 300);
      }
    });
  });
};

/** 起動を拒否したときの標準エラー出力 */
const refused = async (env: Record<string, string>): Promise<string> => {
  const child = run(env);
  let error = "";

  child.stderr.on("data", (chunk: Buffer) => {
    error += chunk.toString();
  });

  const code = await new Promise<number | null>((resolve) => child.once("exit", resolve));

  expect(code).toBe(1);

  return error;
};

const stop = async (child: ReturnType<typeof run>) => {
  child.kill("SIGTERM");
  await new Promise((resolve) => child.once("exit", resolve));
};

const AUTO = { DEV_AUTO_CONNECT: "true", NEO4J_URI: URI, NEO4J_USER: "neo4j" };

describe("server.ts — 歯止め 1 は起動を拒否する", () => {
  it("production で有効にしたら終了コード 1", async () => {
    expect(await refused({ ...AUTO, NODE_ENV: "production" })).toContain("production");
  });

  it("繋ぎ先が足りなければ終了コード 1", async () => {
    expect(await refused({ DEV_AUTO_CONNECT: "true", NEO4J_URI: "", NEO4J_USER: "" })).toContain(
      "NEO4J_URI",
    );
  });

  /* why: 歯止め 2。ローカル以外へ黙って繋ぎに行かせない */
  it("ローカル以外を指したら終了コード 1", async () => {
    const error = await refused({ ...AUTO, NEO4J_URI: "bolt://example.com:7687" });

    expect(error).toContain("DEV_AUTO_CONNECT_ALLOW_REMOTE");
  });

  it("有効にしていなければ production でも起動する", async () => {
    const child = run({ NODE_ENV: "production" });

    expect((await started(child)).port).toBeGreaterThan(0);

    await stop(child);
  });
});

describe("server.ts — 歯止め 3 は繋ぎ先を出す", () => {
  it("自動接続の宛先を起動バナーに出す", async () => {
    const child = run({ ...AUTO, NEO4J_PASSWORD: PASSWORD });
    const { out } = await started(child);

    expect(out).toContain(`dev 自動接続: ${URI}`);

    await stop(child);
  });

  it("パスワードは出さない", async () => {
    const child = run({ ...AUTO, NEO4J_PASSWORD: PASSWORD });
    const { out } = await started(child);

    expect(out).not.toContain(PASSWORD);

    await stop(child);
  });

  it("有効でなければバナーに出さない", async () => {
    const child = run({});
    const { out } = await started(child);

    expect(out).not.toContain("dev 自動接続");

    await stop(child);
  });
});

describe("server.ts — 起動したサーバが自動接続する", () => {
  it("クッキー無しの GET が dev-auto で繋がる", async () => {
    const child = run({ ...AUTO, NEO4J_PASSWORD: PASSWORD });
    const { port } = await started(child);

    const res = await fetch(`http://localhost:${port}/api/connect`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ connected: true, uri: URI, mode: "dev-auto" });

    await stop(child);
  });

  it("有効にしていなければ未接続", async () => {
    const child = run({});
    const { port } = await started(child);

    expect(await (await fetch(`http://localhost:${port}/api/connect`)).json()).toEqual({
      connected: false,
    });

    await stop(child);
  });
});
