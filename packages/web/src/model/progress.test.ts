import { describe, expect, it } from "vite-plus/test";

import type { Box } from "./leitner";
import { clearBoxes, loadBoxes, saveBoxes, type Store } from "./progress";

const KEY = "cypher-quiz:progress";

const fakeStore = (initial: Record<string, string> = {}) => {
  const items = new Map(Object.entries(initial));

  const store: Store = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };

  return { store, items };
};

const brokenStore = (): Store => ({
  getItem: () => null,
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
  removeItem: () => undefined,
});

describe("saveBoxes と loadBoxes", () => {
  it("保存したものをそのまま読める", () => {
    const { store } = fakeStore();
    const boxes = { "match:forward": 1 as Box, "match:reverse": 2 as Box };

    expect(saveBoxes(store, boxes)).toEqual({ ok: true, value: undefined });
    expect(loadBoxes(store)).toEqual(boxes);
  });

  it("保存が無ければ空を返す", () => {
    expect(loadBoxes(fakeStore().store)).toEqual({});
  });

  it("空の習熟度も保存できる", () => {
    const { store } = fakeStore();
    saveBoxes(store, {});

    expect(loadBoxes(store)).toEqual({});
  });
});

describe("壊れた保存", () => {
  /* why: 進捗が無くても解けるので、知らせずに空から始める */
  it("JSON でなければ空を返す", () => {
    expect(loadBoxes(fakeStore({ [KEY]: "{壊れている" }).store)).toEqual({});
  });

  it("配列や数値なら空を返す", () => {
    expect(loadBoxes(fakeStore({ [KEY]: "[1,2]" }).store)).toEqual({});
    expect(loadBoxes(fakeStore({ [KEY]: "3" }).store)).toEqual({});
    expect(loadBoxes(fakeStore({ [KEY]: "null" }).store)).toEqual({});
  });

  /* why: 手で書き換えられる場所なので、箱の値として通らないものは捨てる */
  it("box にならない値は捨て、正しいものだけ残す", () => {
    const raw = JSON.stringify({
      "a:forward": 1,
      "b:forward": 9,
      "c:forward": "2",
      "d:forward": 0,
    });

    expect(loadBoxes(fakeStore({ [KEY]: raw }).store)).toEqual({
      "a:forward": 1,
      "d:forward": 0,
    });
  });
});

describe("保存できない環境", () => {
  /* why: プライベートモードでは setItem が例外を throw する。進捗が残らないだけで、
     クイズは続けられる */
  it("失敗を Result で返し、例外を投げない", () => {
    expect(saveBoxes(brokenStore(), { "a:forward": 1 as Box })).toEqual({
      ok: false,
      error: "store-unavailable",
    });
  });
});

describe("clearBoxes", () => {
  it("保存を消す", () => {
    const { store, items } = fakeStore();
    saveBoxes(store, { "a:forward": 2 as Box });

    clearBoxes(store);

    expect(items.has(KEY)).toBe(false);
    expect(loadBoxes(store)).toEqual({});
  });
});
