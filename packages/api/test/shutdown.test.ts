import { spawn } from "node:child_process";
import { Agent, request } from "node:http";
import { fileURLToPath } from "node:url";

import neo4j, { type Driver } from "neo4j-driver";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";

import { CREDENTIALS, URI, createTestApi, jar } from "./api";

let admin: Driver;

/* why: 監視する側は store の外に置く。store が閉じる接続と混ざると、
   消えたのが片付けの結果なのか自分の接続なのか分からなくなる */
beforeAll(async () => {
  admin = neo4j.driver(URI, neo4j.auth.basic(CREDENTIALS.user, CREDENTIALS.password));
  await admin.getServerInfo();
});

afterAll(async () => {
  await admin.close();
});

const connectionIds = async (): Promise<readonly string[]> => {
  const session = admin.session();
  const result = await session.run(
    "CALL dbms.listConnections() YIELD connectionId RETURN connectionId",
  );

  await session.close();

  return result.records.map((record) => String(record.get("connectionId")));
};

/* why: close() から listConnections で消えるまでに数 ms かかる（実測 5ms）。
   1 度だけ見ると、まだ消えていないだけで失敗する */
const goneWithin = async (ids: readonly string[], ms: number): Promise<boolean> => {
  for (let waited = 0; waited <= ms; waited += 50) {
    const live = new Set(await connectionIds());

    if (ids.every((id) => !live.has(id))) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return false;
};

describe("closeAll — サーバ側の接続が消える", () => {
  /* why: プロセスを終わらせて確かめると、OS が socket を閉じるので
     「片付けたから消えた」のか「死んだから消えた」のか区別できない。
     プロセスを生かしたまま closeAll だけを効かせる */
  it("繋いだ接続が closeAll で消える", async () => {
    const { send, store } = createTestApi();
    const before = new Set(await connectionIds());

    await send("POST", "/api/connect", { body: CREDENTIALS });

    const opened = (await connectionIds()).filter((id) => !before.has(id));

    expect(opened.length).toBeGreaterThan(0);

    await store.closeAll();

    expect(await goneWithin(opened, 2000)).toBe(true);
  });

  it("切断だけでも消える", async () => {
    const { send } = createTestApi();
    const before = new Set(await connectionIds());
    const cookie = jar(await send("POST", "/api/connect", { body: CREDENTIALS }));
    const opened = (await connectionIds()).filter((id) => !before.has(id));

    await send("DELETE", "/api/connect", { cookie });

    expect(await goneWithin(opened, 2000)).toBe(true);
  });
});

/* why: 閉じ残すとイベントループが空にならず、tsx watch の再起動が
   「Process hasn't exited. Killing process...」になる */
describe("server.ts — 合図を受けたら終わる", () => {
  const start = async () => {
    const child = spawn(
      process.execPath,
      ["--import", "tsx", fileURLToPath(new URL("../src/server.ts", import.meta.url))],
      /* why: ポートを 0 にすると空きを OS が選ぶ。固定すると、動いている dev サーバとぶつかる */
      { env: { ...process.env, PORT: "0" }, stdio: ["ignore", "pipe", "inherit"] },
    );

    const port = await new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("起動しない")), 20_000);

      child.stdout.on("data", (chunk: Buffer) => {
        const found = /localhost:(\d+)/.exec(chunk.toString());

        if (found?.[1] !== undefined) {
          clearTimeout(timer);
          resolve(Number(found[1]));
        }
      });
    });

    return { child, port };
  };

  const stopped = (child: ReturnType<typeof spawn>, signal: NodeJS.Signals) =>
    new Promise<number | null>((resolve, reject) => {
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new Error(`${signal} で 10 秒以内に終わらない`));
      }, 10_000);

      child.once("exit", (code) => {
        clearTimeout(timer);
        resolve(code);
      });

      child.kill(signal);
    });

  /* why: 送りかけの要求は server.close() が待つ。切らないと、送り終えない相手が
     1 つあるだけで再起動できなくなる */
  it("送りかけの要求があっても終わる", async () => {
    const { child, port } = await start();
    const agent = new Agent({ keepAlive: true });
    const held = request({
      port,
      agent,
      method: "POST",
      path: "/api/connect",
      headers: { "content-type": "application/json", "content-length": "1000" },
    });

    held.on("error", () => undefined);
    held.write("{");
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      expect(await stopped(child, "SIGTERM")).toBe(0);
    } finally {
      held.destroy();
      agent.destroy();
    }
  });

  it.each(["SIGTERM", "SIGINT"] as const)("%s で片付けて終わる", async (signal) => {
    const { child, port } = await start();

    await fetch(`http://localhost:${port}/api/connect`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(CREDENTIALS),
    });

    /* why: 0 は片付けが終わった印。強制終了の保険が働くと 1 になる */
    expect(await stopped(child, signal)).toBe(0);
  });
});
