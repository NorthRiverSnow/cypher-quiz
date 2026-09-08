import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";

import type { Box } from "../model/leitner";
import type { Store } from "../model/progress";
import { useNotices } from "./useNotices";
import { useProgress } from "./useProgress";

afterEach(cleanup);

const BOXES = { "match:forward": 1 as Box, "match:reverse": 2 as Box };

/** setItem が例外を throw するかどうかを、テストの途中で切り替えられる偽ストア */
const switchableStore = () => {
  const items = new Map<string, string>();
  const state = { broken: false };

  const store: Store = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      if (state.broken) throw new Error("QuotaExceededError");
      items.set(key, value);
    },
    removeItem: (key) => void items.delete(key),
  };

  return { store, state };
};

const setup = (store: Store) =>
  renderHook(() => {
    const notices = useNotices();

    return { notices, progress: useProgress(notices, store) };
  });

describe("useProgress", () => {
  it("保存したものを読み出せる", () => {
    const { store } = switchableStore();
    const { result } = setup(store);

    act(() => void result.current.progress.save(BOXES));

    expect(result.current.progress.load()).toEqual(BOXES);
  });

  it("保存できたら通知は出ない", () => {
    const { store } = switchableStore();
    const { result } = setup(store);

    act(() => void result.current.progress.save(BOXES));

    expect(result.current.notices.items).toEqual([]);
  });

  it("保存に失敗したら通知に積む", () => {
    const { store, state } = switchableStore();
    state.broken = true;
    const { result } = setup(store);

    act(() => void result.current.progress.save(BOXES));

    expect(result.current.notices.items).toEqual([
      {
        kind: "progress-save",
        tone: "warn",
        title: "進捗を保存できません",
        detail: "この端末では保存が使えません。解き進められますが、次回は最初からになります",
      },
    ]);
  });

  /* why: 保存が復帰したら通知は嘘になる。次の成功で取り下げる */
  it("次に成功したら通知を取り下げる", () => {
    const { store, state } = switchableStore();
    state.broken = true;
    const { result } = setup(store);

    act(() => void result.current.progress.save(BOXES));
    expect(result.current.notices.items).toHaveLength(1);

    state.broken = false;
    act(() => void result.current.progress.save(BOXES));

    expect(result.current.notices.items).toEqual([]);
  });

  it("保存の結果を返す", () => {
    const { store, state } = switchableStore();
    state.broken = true;
    const { result } = setup(store);

    let saved: unknown;
    act(() => {
      saved = result.current.progress.save(BOXES);
    });

    expect(saved).toEqual({ ok: false, error: "store-unavailable" });
  });

  /* why: 保存が無くても空で始める。読み出しは失敗として扱わない */
  it("保存が無ければ空を読む", () => {
    const { store } = switchableStore();
    const { result } = setup(store);

    expect(result.current.progress.load()).toEqual({});
    expect(result.current.notices.items).toEqual([]);
  });
});
