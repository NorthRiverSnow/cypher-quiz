import { type ApiError, type Result, err, ok } from "@cypher-quiz/shared";
import type { Driver } from "neo4j-driver";
import { describe, expect, it } from "vite-plus/test";

import type { DriverStore, Opened, OpenRequest, Session } from "../neo4j/driverStore";
import { createConnectController } from "./connect";

const URI = "bolt://localhost:7687";
const CREDENTIALS = { uri: URI, user: "neo4j", password: "hunter2" };

const setup = ({ fails = false }: { fails?: boolean } = {}) => {
  const sessions = new Map<string, Session>();
  const seen = { opened: [] as OpenRequest[], closed: [] as (string | undefined)[] };
  let issued = 0;

  const store: DriverStore = {
    open: async (request): Promise<Result<Opened, ApiError>> => {
      seen.opened.push(request);

      if (fails) {
        return err({ kind: "connect-failed", message: "繋がりません" });
      }

      const id = `s${++issued}`;
      const session: Session = {
        driver: {} as Driver,
        /* why: store は繋ぎ変えた URI を返す。controller がそれを status に載せること */
        uri: `secured:${request.uri}`,
        mode: request.mode,
        ...(request.database === undefined ? {} : { database: request.database }),
      };

      sessions.set(id, session);

      return ok({ id, session });
    },
    get: async (id) => (id === undefined ? undefined : sessions.get(id)),
    close: async (id) => {
      seen.closed.push(id);

      if (id !== undefined) {
        sessions.delete(id);
      }
    },
    sweep: async () => 0,
    closeAll: async () => undefined,
  };

  return {
    controller: createConnectController({ store }),
    opened: () => seen.opened,
    /* why: クッキーが無い要求でも close は呼ばれる（何もしない）。数えると読めなくなる */
    closed: () => seen.closed.filter((id) => id !== undefined),
    sessions,
  };
};

describe("status", () => {
  it("識別子が無ければ未接続", async () => {
    const { controller } = setup();

    expect(await controller.status(undefined)).toEqual({ connected: false });
  });

  /* why: 失効の判定は store が持つ。controller は undefined を未接続に写すだけ */
  it("知らない識別子も未接続", async () => {
    const { controller } = setup();

    expect(await controller.status("expired")).toEqual({ connected: false });
  });

  it("生きていれば接続先と経路を返す", async () => {
    const { controller } = setup();
    const opened = await controller.open(undefined, CREDENTIALS);

    expect(await controller.status(opened.ok ? opened.value.id : "")).toEqual({
      connected: true,
      uri: `secured:${URI}`,
      mode: "manual",
    });
  });
});

describe("open", () => {
  it("手入力の経路で開く", async () => {
    const { controller, opened } = setup();

    await controller.open(undefined, CREDENTIALS);

    expect(opened()[0]).toMatchObject({ ...CREDENTIALS, mode: "manual" });
  });

  it("データベース名をそのまま渡す", async () => {
    const { controller, opened } = setup();

    await controller.open(undefined, { ...CREDENTIALS, database: "deck" });

    expect(opened()[0]).toMatchObject({ database: "deck" });
  });

  /* why: 入力した URI ではなく、store が実際に繋いだ URI を返す。ローカル以外は
     暗号化スキームに繋ぎ変わるので、入力を返すと画面が嘘になる */
  it("識別子と、実際に繋いだ接続状態を返す", async () => {
    const { controller } = setup();

    expect(await controller.open(undefined, CREDENTIALS)).toEqual({
      ok: true,
      value: { id: "s1", status: { connected: true, uri: `secured:${URI}`, mode: "manual" } },
    });
  });

  /* why: 閉じないと、繋ぎ直すたびにドライバが積み上がる */
  it("繋がったら前の接続を閉じる", async () => {
    const { controller, closed, sessions } = setup();

    await controller.open(undefined, CREDENTIALS);
    await controller.open("s1", CREDENTIALS);

    expect(closed()).toEqual(["s1"]);
    expect([...sessions.keys()]).toEqual(["s2"]);
  });

  /* why: 先に閉じると、資格情報を間違えただけで今まで使えていた接続まで失う */
  it("繋がらなければ前の接続を閉じない", async () => {
    const { controller, closed } = setup({ fails: true });

    await controller.open("s1", CREDENTIALS);

    expect(closed()).toEqual([]);
  });

  it("失敗はそのまま返す", async () => {
    const { controller } = setup({ fails: true });

    expect(await controller.open(undefined, CREDENTIALS)).toMatchObject({
      ok: false,
      error: { kind: "connect-failed" },
    });
  });
});

describe("close", () => {
  it("閉じて未接続を返す", async () => {
    const { controller, closed } = setup();

    await controller.open(undefined, CREDENTIALS);

    expect(await controller.close("s1")).toEqual({ connected: false });
    expect(closed()).toEqual(["s1"]);
  });

  it("識別子が無くても未接続を返す", async () => {
    const { controller } = setup();

    expect(await controller.close(undefined)).toEqual({ connected: false });
  });
});
