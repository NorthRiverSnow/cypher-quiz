import { isOk } from "@cypher-quiz/shared";
import neo4j, { type Driver } from "neo4j-driver";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { createLogger } from "../log";
import { type OpenRequest, type StoreDeps, createDriverStore } from "./driverStore";

const URI = process.env.NEO4J_TEST_URI ?? "bolt://localhost:7688";
const PASSWORD = process.env.NEO4J_PASSWORD ?? "";

const REAL: OpenRequest = {
  uri: URI,
  user: "neo4j",
  password: PASSWORD,
  mode: "manual",
};

const opened: { close: () => Promise<void> }[] = [];

afterEach(async () => {
  await Promise.all(opened.splice(0).map((driver) => driver.close()));
});

const harness = (override: Partial<StoreDeps> = {}) => {
  const written: string[] = [];
  const clock = { now: 0 };
  let issued = 0;

  const deps: StoreDeps = {
    log: createLogger({ now: () => new Date(0), write: (line) => written.push(line) }),
    now: () => clock.now,
    newId: () => `s${++issued}`,
    createDriver: ({ uri, user, password }) => {
      const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

      opened.push(driver);

      return driver;
    },
    idleMs: 30 * 60 * 1000,
    maxSessions: 20,
    ...override,
  };

  return {
    store: createDriverStore(deps),
    clock,
    events: () => written.map((line) => JSON.parse(line) as Record<string, unknown>),
  };
};

/* why: 疎通・TTL・上限は繋ぐ相手の中身に依らない。実 DB を待たずに時計を進める */
const stubbed = (override: Partial<StoreDeps> = {}, onConnect: () => void = () => undefined) => {
  const drivers: { closed: number }[] = [];

  return {
    ...harness({
      createDriver: () => {
        const state = { closed: 0 };

        drivers.push(state);

        return {
          getServerInfo: async () => {
            onConnect();

            return {};
          },
          close: async () => {
            state.closed += 1;
          },
        } as unknown as Driver;
      },
      ...override,
    }),
    drivers,
  };
};

const idOf = async (store: ReturnType<typeof harness>["store"], request = REAL) => {
  const result = await store.open(request);

  if (!isOk(result)) {
    throw new Error(result.error.message);
  }

  return result.value;
};

describe("createDriverStore — 実 DB", () => {
  it("繋がれば識別子を返し、引ける", async () => {
    const { store } = harness();
    const id = await idOf(store);

    expect(await store.get(id)).toMatchObject({ uri: URI, mode: "manual" });
  });

  /* why: 保管庫が password を持つと、ログにも応答にも出しうる形で残る */
  it("持つのは driver と接続先と経路だけ", async () => {
    const { store } = harness();
    const session = await store.get(await idOf(store));

    expect(Object.keys(session ?? {}).sort()).toEqual(["driver", "mode", "uri"]);
  });

  it("データベースを渡せば覚えている", async () => {
    const { store } = harness();
    const id = await idOf(store, { ...REAL, database: "neo4j" });

    expect(await store.get(id)).toMatchObject({ database: "neo4j" });
  });

  it("パスワードが違えば connect-failed", async () => {
    const { store } = harness();
    const result = await store.open({ ...REAL, password: "ちがう" });

    expect(result).toMatchObject({ ok: false, error: { kind: "connect-failed" } });
  });

  it("届かない相手も connect-failed", async () => {
    const { store } = harness();
    const result = await store.open({ ...REAL, uri: "bolt://localhost:1" });

    expect(result).toMatchObject({ ok: false, error: { kind: "connect-failed" } });
  });

  it("閉じたら引けない", async () => {
    const { store } = harness();
    const id = await idOf(store);

    await store.close(id);

    expect(await store.get(id)).toBeUndefined();
  });

  it("知らない識別子とクッキー無しは undefined", async () => {
    const { store } = harness();

    expect(await store.get("そんなIDは無い")).toBeUndefined();
    expect(await store.get(undefined)).toBeUndefined();
  });
});

describe("createDriverStore — 疎通", () => {
  /* why: 繋がらなかったドライバを手放すと、閉じる者がいなくなる */
  it("疎通に失敗したらドライバを閉じ、保管しない", async () => {
    const { store, drivers } = stubbed({}, () => {
      throw Object.assign(new Error("繋がらない"), { code: "ServiceUnavailable" });
    });

    const result = await store.open(REAL);

    expect(result).toMatchObject({ ok: false, error: { kind: "connect-failed" } });
    expect(drivers[0]?.closed).toBe(1);
    expect(await store.get("s1")).toBeUndefined();
  });
});

describe("createDriverStore — 失効", () => {
  it("idle を過ぎたら引けず、ドライバも閉じる", async () => {
    const { store, clock, drivers } = stubbed({ idleMs: 1000 });
    const id = await idOf(store);

    clock.now = 1000;

    expect(await store.get(id)).toBeUndefined();
    expect(drivers[0]?.closed).toBe(1);
  });

  /* why: 起点は「最後に使ったとき」。開いたときのままだと、使い続けていても切れる */
  it("使うたびに起点が今になる", async () => {
    const { store, clock } = stubbed({ idleMs: 1000 });
    const id = await idOf(store);

    clock.now = 999;
    await store.get(id);
    clock.now = 1998;

    expect(await store.get(id)).toBeDefined();
  });

  it("sweep は閉じた数を返す", async () => {
    const { store, clock } = stubbed({ idleMs: 1000 });

    await idOf(store);
    await idOf(store);
    clock.now = 1000;

    expect(await store.sweep()).toBe(2);
    expect(await store.sweep()).toBe(0);
  });
});

describe("createDriverStore — 上限", () => {
  it("超えたら最後に使ったのが最も古いものを閉じる", async () => {
    const { store, clock, drivers } = stubbed({ maxSessions: 2 });
    const first = await idOf(store);

    clock.now = 1;
    const second = await idOf(store);

    clock.now = 2;
    await store.get(first);

    clock.now = 3;
    const third = await idOf(store);

    expect(await store.get(second)).toBeUndefined();
    expect(await store.get(first)).toBeDefined();
    expect(await store.get(third)).toBeDefined();
    expect(drivers[1]?.closed).toBe(1);
  });

  it("閉じたことを warn に残す", async () => {
    const { store, events } = stubbed({ maxSessions: 1 });

    await idOf(store);
    await idOf(store);

    expect(events()).toContainEqual(
      expect.objectContaining({ level: "warn", name: "SessionEvicted" }),
    );
  });
});

describe("createDriverStore — 識別子", () => {
  it("開くたびに違う値になる", async () => {
    const { store } = stubbed();

    expect(await idOf(store)).not.toBe(await idOf(store));
  });
});
