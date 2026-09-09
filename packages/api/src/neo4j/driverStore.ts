import {
  type ApiError,
  type ConnectionStatus,
  type Result,
  attemptAsync,
  err,
  ok,
} from "@cypher-quiz/shared";
import type { Driver } from "neo4j-driver";

import type { Logger } from "../log";
import { closeQuietly } from "./closeQuietly";
import { reportDriverError } from "./toApiError";

/* why: スキーマから引く。接続の経路を増やしたときに 2 箇所直さずに済む */
type Mode = Extract<ConnectionStatus, { connected: true }>["mode"];

export type Credentials = Readonly<{ uri: string; user: string; password: string }>;

export type OpenRequest = Credentials &
  Readonly<{
    database?: string;
    mode: Mode;
  }>;

/* why: password を持たない。ドライバに渡したら捨てる——保管庫が持つと、
   ログにも応答にも出しうる形で残る（docs/03_api.md#正直に言っておくこと） */
export type Session = Readonly<{
  driver: Driver;
  uri: string;
  database?: string;
  mode: Mode;
}>;

export type StoreDeps = Readonly<{
  log: Logger;
  now: () => number;
  /** 推測できない値を返すこと。クッキーに載る唯一の識別子 */
  newId: () => string;
  createDriver: (credentials: Credentials) => Driver;
  /** 最後に使ってからこれを過ぎた接続を閉じる */
  idleMs: number;
  /** 超えたら、最後に使ったのが最も古い接続を閉じる */
  maxSessions: number;
}>;

export type DriverStore = {
  open: (request: OpenRequest) => Promise<Result<string, ApiError>>;
  /** 引くたびに idle の起点を今にする。失効していれば undefined */
  get: (id: string | undefined) => Promise<Session | undefined>;
  close: (id: string | undefined) => Promise<void>;
  /** 閉じた数 */
  sweep: () => Promise<number>;
};

type Entry = Readonly<{ session: Session; lastUsedAt: number }>;

/**
 * 接続を持つ唯一の場所。**プロセスの中だけ**——再起動で全て消える。
 *
 * why: クラスではなくクロージャにする。Map への変更をこの関数の中に閉じられる
 * （docs/02_architecture.md#バックエンド--クロージャを返すファクトリ）
 */
export const createDriverStore = (deps: StoreDeps): DriverStore => {
  const entries = new Map<string, Entry>();

  const drop = async (id: string) => {
    const entry = entries.get(id);

    if (entry === undefined) {
      return;
    }

    entries.delete(id);
    await closeQuietly(deps.log, "DriverCloseFailed", entry.session.driver);
  };

  const sweep = async () => {
    const expired = [...entries]
      .filter(([, entry]) => deps.now() - entry.lastUsedAt >= deps.idleMs)
      .map(([id]) => id);

    await Promise.all(expired.map((id) => drop(id)));

    return expired.length;
  };

  /* why: 上限に達したら拒否せず、最後に使ったのが最も古いものを閉じる。拒否すると、
     使われていない接続が居座るだけで新しい利用者が繋げなくなる */
  const evictOverflow = async () => {
    while (entries.size > 0 && entries.size >= deps.maxSessions) {
      const [oldest] = [...entries].reduce((a, b) => (a[1].lastUsedAt <= b[1].lastUsedAt ? a : b));

      deps.log(
        { event: "error", name: "SessionEvicted", message: `上限 ${deps.maxSessions} 件` },
        "warn",
      );
      await drop(oldest);
    }
  };

  return {
    open: async ({ uri, user, password, database, mode }) => {
      await sweep();

      const driver = deps.createDriver({ uri, user, password });
      /* why: 作っただけでは繋がらない。ここで確かめないと、最初のクエリまで
         失敗が分からない（verifyConnectivity は非推奨） */
      const reached = await attemptAsync(
        () => driver.getServerInfo(),
        (cause) => cause,
      );

      if (!reached.ok) {
        await closeQuietly(deps.log, "DriverCloseFailed", driver);

        return err(reportDriverError(deps.log, reached.error));
      }

      await evictOverflow();

      const id = deps.newId();

      entries.set(id, {
        lastUsedAt: deps.now(),
        session: { driver, uri, mode, ...(database === undefined ? {} : { database }) },
      });

      return ok(id);
    },

    get: async (id) => {
      await sweep();

      if (id === undefined) {
        return undefined;
      }

      const entry = entries.get(id);

      if (entry === undefined) {
        return undefined;
      }

      entries.set(id, { ...entry, lastUsedAt: deps.now() });

      return entry.session;
    },

    close: async (id) => {
      if (id !== undefined) {
        await drop(id);
      }
    },

    sweep,
  };
};
