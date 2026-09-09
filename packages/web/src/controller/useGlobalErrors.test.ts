import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import type { Notices } from "./useNotices";

import { useGlobalErrors } from "./useGlobalErrors";
import { useNotices } from "./useNotices";

afterEach(cleanup);

const setup = () =>
  renderHook(() => {
    const notices = useNotices();
    useGlobalErrors(notices);

    return notices;
  });

const throwInWindow = (error: unknown) => {
  act(() => {
    window.dispatchEvent(new ErrorEvent("error", { error, message: "そのまま" }));
  });
};

const rejectInWindow = (reason: unknown) => {
  act(() => {
    window.dispatchEvent(Object.assign(new Event("unhandledrejection"), { reason }));
  });
};

describe("useGlobalErrors", () => {
  it("捕まえていない例外を通知に積む", () => {
    const { result } = setup();

    throwInWindow(new Error("読み込みに失敗しました"));

    expect(result.current.items).toEqual([
      {
        kind: "unexpected",
        tone: "alarm",
        title: "予期しないエラーが起きました",
        detail: "読み込みに失敗しました",
      },
    ]);
  });

  /* why: ErrorBoundary は描画中しか拾わない。await の外で reject した Promise はここで拾う */
  it("捕まえていない reject を通知に積む", () => {
    const { result } = setup();

    rejectInWindow(new Error("fetch が失敗しました"));

    expect(result.current.items[0]?.detail).toBe("fetch が失敗しました");
  });

  /* why: reject の値は Error でないこともある（文字列や undefined） */
  it("Error でない値も文言にする", () => {
    const { result } = setup();

    rejectInWindow("接続が切れました");

    expect(result.current.items[0]?.detail).toBe("接続が切れました");
  });

  it("同じ種類なので積み上がらない", () => {
    const { result } = setup();

    throwInWindow(new Error("1 回目"));
    throwInWindow(new Error("2 回目"));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.detail).toBe("2 回目");
  });

  /* why: 外した後も購読が残ると、消えた画面の通知が次の画面に出る */
  it("片付けたら購読をやめる", () => {
    const report = vi.fn((_kind, result) => result);
    const notices = { items: [], dismiss: vi.fn(), report } as unknown as Notices;
    const { unmount } = renderHook(() => useGlobalErrors(notices));

    throwInWindow(new Error("片付ける前"));
    expect(report).toHaveBeenCalledTimes(1);

    unmount();
    throwInWindow(new Error("片付けた後"));
    rejectInWindow(new Error("片付けた後"));

    expect(report).toHaveBeenCalledTimes(1);
  });
});
