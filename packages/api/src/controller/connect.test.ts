import { type ApiError, type Result, err, ok } from "@cypher-quiz/shared";
import type { Driver } from "neo4j-driver";
import { describe, expect, it } from "vite-plus/test";

import type { DevAuto } from "../devAuto";
import type { LogEvent } from "../log";
import type { DriverStore, Opened, OpenRequest, Session } from "../neo4j/driverStore";
import { createConnectController } from "./connect";

const URI = "bolt://localhost:7687";
const CREDENTIALS = { uri: URI, user: "neo4j", password: "hunter2" };

const DEV_AUTO: DevAuto = { uri: "bolt://neo4j:7687", user: "neo4j", password: "nordwind-dev" };

const setup = ({ fails = false, devAuto }: { fails?: boolean; devAuto?: DevAuto } = {}) => {
  const sessions = new Map<string, Session>();
  const seen = { opened: [] as OpenRequest[], closed: [] as (string | undefined)[] };
  const logged: LogEvent[] = [];
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
    controller: createConnectController({
      store,
      log: (event) => logged.push(event),
      ...(devAuto === undefined ? {} : { devAuto }),
    }),
    logged: () => logged,
    opened: () => seen.opened,
    /* why: クッキーが無い要求でも close は呼ばれる（何もしない）。数えると読めなくなる */
    closed: () => seen.closed.filter((id) => id !== undefined),
    sessions,
  };
};

describe("status", () => {
  it("識別子が無ければ未接続", async () => {
    const { controller } = setup();

    expect(await controller.status(undefined)).toEqual({ status: { connected: false } });
  });

  /* why: 失効の判定は store が持つ。controller は undefined を未接続に写すだけ */
  it("知らない識別子も未接続", async () => {
    const { controller } = setup();

    expect(await controller.status("expired")).toEqual({ status: { connected: false } });
  });

  it("生きていれば接続先と経路を返す", async () => {
    const { controller } = setup();
    const opened = await controller.open(undefined, CREDENTIALS);

    expect(await controller.status(opened.ok ? opened.value.id : "")).toEqual({
      status: { connected: true, uri: `secured:${URI}`, mode: "manual" },
    });
  });

  /* why: 識別子を返すのは新しく繋いだときだけ。毎回返すと、ルートが同じ値の
     クッキーを張り直し続ける */
  it("繋がっているときは識別子を返さない", async () => {
    const { controller } = setup();
    const opened = await controller.open(undefined, CREDENTIALS);

    expect(await controller.status(opened.ok ? opened.value.id : "")).not.toHaveProperty("id");
  });
});

describe("status — dev 自動接続", () => {
  it("設定が無ければ繋ぎに行かない", async () => {
    const { controller, opened } = setup();

    await controller.status(undefined);

    expect(opened()).toEqual([]);
  });

  it("繋がっていなければ .env の資格情報で繋ぐ", async () => {
    const { controller, opened } = setup({ devAuto: DEV_AUTO });

    await controller.status(undefined);

    expect(opened()[0]).toEqual({ ...DEV_AUTO, mode: "dev-auto" });
  });

  it("識別子と dev-auto の接続状態を返す", async () => {
    const { controller } = setup({ devAuto: DEV_AUTO });

    expect(await controller.status(undefined)).toEqual({
      id: "s1",
      status: { connected: true, uri: `secured:${DEV_AUTO.uri}`, mode: "dev-auto" },
    });
  });

  /* why: 手で繋いだ接続を自動接続で置き換えない。切断して手入力に戻す道を塞ぐ
     （docs/03_api.md#歯止め の 5） */
  it("既に繋がっていれば繋ぎ直さない", async () => {
    const { controller, opened } = setup({ devAuto: DEV_AUTO });
    const manual = await controller.open(undefined, CREDENTIALS);

    const reported = await controller.status(manual.ok ? manual.value.id : "");

    expect(opened()).toHaveLength(1);
    expect(reported.status).toMatchObject({ mode: "manual" });
  });

  /* why: 繋がらない相手を設定していても、手入力の接続画面までは進める */
  it("繋がらなければ未接続を返す", async () => {
    const { controller } = setup({ fails: true, devAuto: DEV_AUTO });

    expect(await controller.status(undefined)).toEqual({ status: { connected: false } });
  });

  it("繋がらなかった理由を残す", async () => {
    const { controller, logged } = setup({ fails: true, devAuto: DEV_AUTO });

    await controller.status(undefined);

    expect(logged()).toEqual([
      { event: "error", name: "DevAutoConnectFailed", message: "繋がりません" },
    ]);
  });

  it("失効した識別子でも繋ぎ直す", async () => {
    const { controller } = setup({ devAuto: DEV_AUTO });

    expect(await controller.status("expired")).toMatchObject({ id: "s1" });
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
