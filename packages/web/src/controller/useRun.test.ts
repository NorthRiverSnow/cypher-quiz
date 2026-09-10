import { type ApiError, type QueryResult, err, ok } from "@cypher-quiz/shared";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { SWRConfig } from "swr";
import { afterEach, describe, expect, it } from "vite-plus/test";

import type { ApiClient } from "../api/client";
import { useRun } from "./useRun";

afterEach(cleanup);

const RESULT: QueryResult = { columns: ["n"], rows: [["a"]], elapsedMs: 3 };
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
    ...renderHook(() => useRun(connected, client), { wrapper }),
    asked: () => asked,
  };
};

describe("実行していないとき", () => {
  it("繋がっていれば idle", () => {
    const { result } = setup();

    expect(result.current.status).toBe("idle");
    expect(result.current.result).toBeUndefined();
  });

  /* why: 押しても失敗すると分かる状態を、押す前に見せる */
  it("繋がっていなければ offline", () => {
    const { result } = setup(RESULT, false);

    expect(result.current.status).toBe("offline");
  });
});

describe("成功したとき", () => {
  it("入力したクエリをそのまま送る", async () => {
    const { result, asked } = setup();

    await act(async () => await result.current.run(CYPHER));

    expect(asked()).toEqual([CYPHER]);
  });

  it("結果を返し、idle に戻る", async () => {
    const { result } = setup();

    await act(async () => await result.current.run(CYPHER));

    expect(result.current.result).toEqual(RESULT);
    expect(result.current.status).toBe("idle");
  });

  it("reset で結果が消える", async () => {
    const { result } = setup();

    await act(async () => await result.current.run(CYPHER));
    act(() => result.current.reset());

    await waitFor(() => expect(result.current.result).toBeUndefined());
  });
});

describe("失敗したとき", () => {
  it.each([
    ["not-connected", "offline"],
    ["read-only-violation", "rejected"],
    ["syntax-error", "error"],
    ["timeout", "error"],
    ["connect-failed", "error"],
    ["unexpected", "error"],
  ] as const)("%s は %s になる", async (kind, status) => {
    const { result } = setup({ kind, message: "だめ" });

    await act(async () => await result.current.run(CYPHER));

    expect(result.current.status).toBe(status);
  });

  it("error のときだけ DB の文言を渡す", async () => {
    const { result } = setup({ kind: "syntax-error", message: "RETRUN は綴りが違います" });

    await act(async () => await result.current.run(CYPHER));

    expect(result.current.errorMessage).toBe("RETRUN は綴りが違います");
  });

  /* why: rejected と offline は編集欄が決まった文を出す。DB の文言を重ねない */
  it("rejected では文言を渡さない", async () => {
    const { result } = setup({ kind: "read-only-violation", message: "書き込みは実行できません" });

    await act(async () => await result.current.run(CYPHER));

    expect(result.current.errorMessage).toBeUndefined();
  });

  /* why: 呼ぶ側に try を書かせない。trigger は既定で reject する */
  it("run は throw しない", async () => {
    const { result } = setup({ kind: "syntax-error", message: "だめ" });
    let threw = false;

    await act(async () => {
      await result.current.run(CYPHER).catch(() => {
        threw = true;
      });
    });

    expect(threw).toBe(false);
  });

  it("失敗しても結果は空のまま", async () => {
    const { result } = setup({ kind: "syntax-error", message: "だめ" });

    await act(async () => await result.current.run(CYPHER));

    expect(result.current.result).toBeUndefined();
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

  const { result } = renderHook(() => useRun(true, client), { wrapper });

  act(() => void result.current.run(CYPHER));

  await waitFor(() => expect(result.current.status).toBe("running"));

  await act(async () => {
    release?.();
    await Promise.resolve();
  });

  await waitFor(() => expect(result.current.status).toBe("idle"));
  expect(result.current.result).toEqual(RESULT);
});
