import {
  type ApiError,
  type ConnectRequest,
  type ConnectionStatus,
  type Result,
  err,
  ok,
} from "@cypher-quiz/shared";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { SWRConfig, useSWRConfig } from "swr";
import { afterEach, describe, expect, it } from "vite-plus/test";

import type { ApiClient } from "../api/client";
import { CONNECTION_KEY, useConnection } from "./useConnection";
import { useNotices } from "./useNotices";

afterEach(cleanup);

const CONNECTED: ConnectionStatus = { connected: true, uri: "bolt://neo4j:7687", mode: "dev-auto" };
const MANUAL: ConnectionStatus = { connected: true, uri: "bolt://localhost:7687", mode: "manual" };
const CREDENTIALS: ConnectRequest = {
  uri: "bolt://localhost:7687",
  user: "neo4j",
  password: "hunter2",
};

const FAILED: ApiError = { kind: "connect-failed", message: "繋がりません" };

type Replies = Readonly<{
  status?: Result<ConnectionStatus, ApiError>;
  connect?: Result<ConnectionStatus, ApiError>;
  disconnect?: Result<ConnectionStatus, ApiError>;
}>;

/* why: SWR は既定でグローバルなキャッシュを持つ。テストごとに新しい Map を渡さないと、
   前のテストの接続状態が次のテストの初期値になる */
const wrapperWith = (extra: Record<string, unknown> = {}) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(SWRConfig, { value: { provider: () => new Map(), ...extra } }, children);
  };

const wrapper = wrapperWith();

/* why: 最初の取得が終わる前に connect を呼ぶと、後から届いた onSuccess が
   connect の失敗の通知を取り下げてしまい、順序でテストが揺れる */
const settled = (result: { current: { connection: { loading: boolean } } }) =>
  waitFor(() => expect(result.current.connection.loading).toBe(false));

const setup = (replies: Replies = {}, config: Record<string, unknown> = {}) => {
  const calls: string[] = [];
  const client: ApiClient = {
    status: async () => {
      calls.push("status");

      return replies.status ?? ok({ connected: false });
    },
    connect: async (request) => {
      calls.push(`connect:${request.uri}`);

      return replies.connect ?? ok(MANUAL);
    },
    disconnect: async () => {
      calls.push("disconnect");

      return replies.disconnect ?? ok({ connected: false });
    },
    run: async () => err(FAILED),
  };

  const rendered = renderHook(
    () => {
      const notices = useNotices();

      return { notices, connection: useConnection(notices, client) };
    },
    { wrapper: wrapperWith(config) },
  );

  return { ...rendered, calls: () => calls };
};

describe("最初の取得", () => {
  it("取得が終わるまで status は undefined", () => {
    const { result } = setup();

    expect(result.current.connection.status).toBeUndefined();
    expect(result.current.connection.loading).toBe(true);
  });

  it("接続状態をそのまま渡す", async () => {
    const { result } = setup({ status: ok(CONNECTED) });

    await waitFor(() => expect(result.current.connection.status).toEqual(CONNECTED));
  });

  it("取得に失敗したら status は undefined のまま", async () => {
    const { result } = setup({ status: err(FAILED) });

    await waitFor(() => expect(result.current.notices.items).toHaveLength(1));
    expect(result.current.connection.status).toBeUndefined();
  });

  it("取得に失敗したら通知に積む", async () => {
    const { result } = setup({ status: err(FAILED) });

    await waitFor(() =>
      expect(result.current.notices.items[0]).toEqual({
        kind: "connect",
        tone: "alarm",
        title: "接続できません",
        detail: "繋がりません",
      }),
    );
  });
});

describe("connect", () => {
  it("資格情報をそのまま渡す", async () => {
    const { result, calls } = setup();

    await settled(result);
    await act(async () => void (await result.current.connection.connect(CREDENTIALS)));

    expect(calls()).toContain(`connect:${CREDENTIALS.uri}`);
  });

  it("繋がったら true を返し、status が入れ替わる", async () => {
    const { result } = setup({ connect: ok(MANUAL) });
    let connected = false;

    await settled(result);
    await act(async () => {
      connected = await result.current.connection.connect(CREDENTIALS);
    });

    expect(connected).toBe(true);
    expect(result.current.connection.status).toEqual(MANUAL);
  });

  /* why: 繋ぎ直しに失敗しただけで、今の接続を画面から消さない */
  it("繋がらなければ false を返し、status を変えない", async () => {
    const { result } = setup({ status: ok(CONNECTED), connect: err(FAILED) });
    let connected = true;

    await waitFor(() => expect(result.current.connection.status).toEqual(CONNECTED));
    await act(async () => {
      connected = await result.current.connection.connect(CREDENTIALS);
    });

    expect(connected).toBe(false);
    expect(result.current.connection.status).toEqual(CONNECTED);
  });

  it("繋がらなければ通知に積む", async () => {
    const { result } = setup({ connect: err(FAILED) });

    await settled(result);
    await act(async () => void (await result.current.connection.connect(CREDENTIALS)));

    expect(result.current.notices.items[0]).toMatchObject({
      kind: "connect",
      detail: "繋がりません",
    });
  });

  it("繋がったら前の通知を取り下げる", async () => {
    const { result } = setup({ status: err(FAILED) });

    await waitFor(() => expect(result.current.notices.items).toHaveLength(1));
    await act(async () => void (await result.current.connection.connect(CREDENTIALS)));

    expect(result.current.notices.items).toEqual([]);
  });
});

describe("disconnect", () => {
  it("未接続になる", async () => {
    const { result } = setup({ status: ok(CONNECTED) });

    await waitFor(() => expect(result.current.connection.status).toEqual(CONNECTED));
    await act(async () => await result.current.connection.disconnect());

    expect(result.current.connection.status).toEqual({ connected: false });
  });

  /* why: 切った後に取り直すと、dev 自動接続がその場で繋ぎ直して手入力に戻れない
     （docs/03_api.md#歯止め の 5） */
  it("切った後にサーバへ問い合わせない", async () => {
    const { result, calls } = setup({ status: ok(CONNECTED) });

    await waitFor(() => expect(result.current.connection.status).toEqual(CONNECTED));
    await act(async () => await result.current.connection.disconnect());

    expect(calls().filter((call) => call === "status")).toHaveLength(1);
  });
});

describe("想定外の失敗", () => {
  const broken = () => {
    const client: ApiClient = {
      status: () => Promise.reject(new TypeError("client のバグ")),
      connect: async () => ok(MANUAL),
      disconnect: async () => ok({ connected: false }),
      run: async () => err(FAILED),
    };

    return renderHook(
      () => {
        const notices = useNotices();

        return { notices, connection: useConnection(notices, client) };
      },
      { wrapper },
    );
  };

  /* why: client 自身が throw したら message は信用できない。決まった文で出す */
  it("ApiError でない throw も通知に積む", async () => {
    const { result } = broken();

    await waitFor(() =>
      expect(result.current.notices.items[0]).toEqual({
        kind: "connect",
        tone: "alarm",
        title: "接続できません",
        detail: "接続状態を取得できません",
      }),
    );
  });

  it("読み込み中のまま止まらない", async () => {
    const { result } = broken();

    await waitFor(() => expect(result.current.connection.loading).toBe(false));
  });
});

/* why: 既定は無限に再試行する。not-connected を投げ直しても状態は変わらない。
   既定の間隔（5 秒）ではテストが待てないので、間隔だけ詰めて数える */
it("失敗しても再試行しない", async () => {
  const { result, calls } = setup({ status: err(FAILED) }, { errorRetryInterval: 5 });

  await settled(result);
  await new Promise((resolve) => setTimeout(resolve, 200));

  expect(calls().filter((call) => call === "status")).toHaveLength(1);
});

/* why: 失敗のあと取り直して繋がったら、残っている通知を消す。
   revalidateOnReconnect は既定で有効なので、この経路は実際に通る */
it("取り直して繋がったら通知を取り下げる", async () => {
  const replies = [err(FAILED), ok(CONNECTED)];
  const client: ApiClient = {
    status: async () => replies.shift() ?? ok(CONNECTED),
    connect: async () => ok(MANUAL),
    disconnect: async () => ok({ connected: false }),
    run: async () => err(FAILED),
  };

  const { result } = renderHook(
    () => {
      const notices = useNotices();

      return {
        notices,
        connection: useConnection(notices, client),
        revalidate: useSWRConfig().mutate,
      };
    },
    { wrapper },
  );

  await waitFor(() => expect(result.current.notices.items).toHaveLength(1));
  await act(async () => void (await result.current.revalidate(CONNECTION_KEY)));

  expect(result.current.notices.items).toEqual([]);
  expect(result.current.connection.status).toEqual(CONNECTED);
});
