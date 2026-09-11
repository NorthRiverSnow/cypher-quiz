import { type ApiError, type QueryResult, err, ok } from "@cypher-quiz/shared";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { SWRConfig } from "swr";
import { afterEach, describe, expect, it } from "vite-plus/test";

import type { ApiClient } from "../api/client";
import { useNotices } from "./useNotices";
import { useRun } from "./useRun";

afterEach(cleanup);

const RESULT: QueryResult = { columns: ["n"], rows: [["a"]], elapsedMs: 3 };

/* why: controller が結果表の形に直して渡す。elapsedMs は表に出さない */
const TABLE = { columns: ["n"], rows: [["a"]] };
const BROKEN: ApiError = { kind: "unexpected", message: "想定外" };
const CYPHER = "MATCH (n) RETURN n";

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(SWRConfig, { value: { provider: () => new Map() } }, children);

const setup = (reply: ApiError | QueryResult = RESULT, connected = true) => {
  const asked: string[] = [];
  const client: ApiClient = {
    status: async () => ok({ connected: false }),
    connect: async () => ok({ connected: false }),
    disconnect: async () => ok({ connected: false }),
    run: async ({ cypher }) => {
      asked.push(cypher);

      return "kind" in reply ? err(reply) : ok(reply);
    },
  };

  return {
    ...renderHook(
      () => {
        const notices = useNotices();

        return { notices, run: useRun(notices, connected, client) };
      },
      { wrapper },
    ),
    asked: () => asked,
  };
};

describe("実行していないとき", () => {
  it("繋がっていれば idle", () => {
    const { result } = setup();

    expect(result.current.run.status).toBe("idle");
    expect(result.current.run.result).toBeUndefined();
  });

  /* why: 押しても失敗すると分かる状態を、押す前に見せる */
  it("繋がっていなければ offline", () => {
    const { result } = setup(RESULT, false);

    expect(result.current.run.status).toBe("offline");
  });
});

describe("成功したとき", () => {
  it("入力したクエリをそのまま送る", async () => {
    const { result, asked } = setup();

    await act(async () => await result.current.run.run(CYPHER));

    expect(asked()).toEqual([CYPHER]);
  });

  it("結果を返し、idle に戻る", async () => {
    const { result } = setup();

    await act(async () => await result.current.run.run(CYPHER));

    expect(result.current.run.result).toEqual(TABLE);
    expect(result.current.run.status).toBe("idle");
  });

  it("reset で結果が消える", async () => {
    const { result } = setup();

    await act(async () => await result.current.run.run(CYPHER));
    act(() => result.current.run.reset());

    await waitFor(() => expect(result.current.run.result).toBeUndefined());
  });
});

/* why: 送ったクエリが原因の失敗だけカードの中に出す。残りは接続か DB の障害で、
   繋ぎ直しや読み込み直しが要る（docs/01_spec.md#8-失敗の伝え方） */
describe("クエリが原因の失敗はカードの中に出す", () => {
  it.each([
    ["read-only-violation", "rejected"],
    ["syntax-error", "error"],
    ["invalid-request", "error"],
    ["timeout", "error"],
  ] as const)("%s は %s になる", async (kind, status) => {
    const { result } = setup({ kind, message: "だめ" });

    await act(async () => await result.current.run.run(CYPHER));

    expect(result.current.run.status).toBe(status);
    expect(result.current.notices.items).toEqual([]);
  });
});

describe("接続と障害は帯に出す", () => {
  it.each(["not-connected", "connect-failed", "unexpected"] as const)(
    "%s は帯に積み、カードには出さない",
    async (kind) => {
      const { result } = setup({ kind, message: "DB が応答しません" });

      await act(async () => await result.current.run.run(CYPHER));

      expect(result.current.notices.items).toEqual([
        {
          kind: "run",
          tone: "alarm",
          title: "クエリを実行できません",
          detail: "DB が応答しません",
        },
      ]);
      expect(result.current.run.status).toBe("idle");
      expect(result.current.run.errorMessage).toBeUndefined();
    },
  );

  it("成功したら帯を取り下げる", async () => {
    const replies: (ApiError | QueryResult)[] = [{ kind: "unexpected", message: "だめ" }, RESULT];
    const client: ApiClient = {
      status: async () => ok({ connected: false }),
      connect: async () => ok({ connected: false }),
      disconnect: async () => ok({ connected: false }),
      run: async () => {
        const reply = replies.shift() ?? RESULT;

        return "kind" in reply ? err(reply) : ok(reply);
      },
    };

    const { result } = renderHook(
      () => {
        const notices = useNotices();

        return { notices, run: useRun(notices, true, client) };
      },
      { wrapper },
    );

    await act(async () => await result.current.run.run(CYPHER));
    expect(result.current.notices.items).toHaveLength(1);

    await act(async () => await result.current.run.run(CYPHER));
    expect(result.current.notices.items).toEqual([]);
  });

  /* why: クエリが原因の失敗に切り替わったら、前の帯は用済み */
  it("次にクエリが原因で失敗したら帯を取り下げる", async () => {
    const replies: ApiError[] = [
      { kind: "unexpected", message: "だめ" },
      { kind: "syntax-error", message: "RETRUN" },
    ];
    const client: ApiClient = {
      status: async () => ok({ connected: false }),
      connect: async () => ok({ connected: false }),
      disconnect: async () => ok({ connected: false }),
      run: async () => err(replies.shift() ?? BROKEN),
    };

    const { result } = renderHook(
      () => {
        const notices = useNotices();

        return { notices, run: useRun(notices, true, client) };
      },
      { wrapper },
    );

    await act(async () => await result.current.run.run(CYPHER));
    expect(result.current.notices.items).toHaveLength(1);

    await act(async () => await result.current.run.run(CYPHER));
    expect(result.current.notices.items).toEqual([]);
    expect(result.current.run.status).toBe("error");
  });
});

describe("失敗したとき", () => {
  it("error のときだけ DB の文言を渡す", async () => {
    const { result } = setup({ kind: "syntax-error", message: "RETRUN は綴りが違います" });

    await act(async () => await result.current.run.run(CYPHER));

    expect(result.current.run.errorMessage).toBe("RETRUN は綴りが違います");
  });

  /* why: rejected と offline は編集欄が決まった文を出す。DB の文言を重ねない */
  it("rejected では文言を渡さない", async () => {
    const { result } = setup({ kind: "read-only-violation", message: "書き込みは実行できません" });

    await act(async () => await result.current.run.run(CYPHER));

    expect(result.current.run.errorMessage).toBeUndefined();
  });

  /* why: 呼ぶ側に try を書かせない。trigger は既定で reject する */
  it("run は throw しない", async () => {
    const { result } = setup({ kind: "syntax-error", message: "だめ" });
    let threw = false;

    await act(async () => {
      await result.current.run.run(CYPHER).catch(() => {
        threw = true;
      });
    });

    expect(threw).toBe(false);
  });

  it("失敗しても結果は空のまま", async () => {
    const { result } = setup({ kind: "syntax-error", message: "だめ" });

    await act(async () => await result.current.run.run(CYPHER));

    expect(result.current.run.result).toBeUndefined();
  });
});

/* why: 実行中だけ押せない状態にする。止めないと running を通り過ぎて観測できない */
it("応答を待っている間は running", async () => {
  let release: (() => void) | undefined;
  const client: ApiClient = {
    status: async () => ok({ connected: false }),
    connect: async () => ok({ connected: false }),
    disconnect: async () => ok({ connected: false }),
    run: async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });

      return ok(RESULT);
    },
  };

  const { result } = renderHook(
    () => {
      const notices = useNotices();

      return { notices, run: useRun(notices, true, client) };
    },
    { wrapper },
  );

  act(() => void result.current.run.run(CYPHER));

  await waitFor(() => expect(result.current.run.status).toBe("running"));

  await act(async () => {
    release?.();
    await Promise.resolve();
  });

  await waitFor(() => expect(result.current.run.status).toBe("idle"));
  expect(result.current.run.result).toEqual(TABLE);
});
