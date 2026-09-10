import { describe, expect, it } from "vite-plus/test";

import type { Box } from "./leitner";
import { type Saved, type Store, clear, load, save } from "./progress";

const KEY = "cypher-quiz:progress";

const EMPTY: Saved = { boxes: {}, answers: [] };

const SAVED: Saved = {
  boxes: { "match:forward": 1 as Box, "match:reverse": 2 as Box },
  answers: [
    { key: "match:forward", correct: false },
    { key: "match:forward", correct: true },
  ],
};

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

const loaded = (raw: string) => load(fakeStore({ [KEY]: raw }).store);

describe("save と load", () => {
  it("保存したものをそのまま読める", () => {
    const { store } = fakeStore();

    expect(save(store, SAVED)).toEqual({ ok: true, value: undefined });
    expect(load(store)).toEqual(SAVED);
  });

  it("保存が無ければ空を返す", () => {
    expect(load(fakeStore().store)).toEqual(EMPTY);
  });

  it("空でも保存できる", () => {
    const { store } = fakeStore();
    save(store, EMPTY);

    expect(load(store)).toEqual(EMPTY);
  });

  /* why: 成績も残す。結果画面でリロードしても正解率と不正解一覧が消えない */
  it("同じ問題への複数回の回答を、順番のまま残す", () => {
    const { store } = fakeStore();
    save(store, SAVED);

    expect(load(store).answers).toEqual(SAVED.answers);
  });
});

describe("壊れた保存", () => {
  /* why: 進捗が無くても解けるので、知らせずに空から始める */
  it("JSON でなければ空を返す", () => {
    expect(loaded("{壊れている")).toEqual(EMPTY);
  });

  it.each(["[1,2]", "3", "null", '"文字列"'])("%s なら空を返す", (raw) => {
    expect(loaded(raw)).toEqual(EMPTY);
  });

  /* why: 手で書き換えられる場所なので、箱の値として通らないものは捨てる */
  it("box にならない値は捨て、正しいものだけ残す", () => {
    const raw = JSON.stringify({
      boxes: { "a:forward": 1, "b:forward": 9, "c:forward": "2", "d:forward": 0 },
      answers: [],
    });

    expect(loaded(raw).boxes).toEqual({ "a:forward": 1, "d:forward": 0 });
  });

  it("回答として通らないものは捨てる", () => {
    const raw = JSON.stringify({
      boxes: {},
      answers: [
        { key: "a:forward", correct: true },
        { key: "a:sideways", correct: true },
        { key: "b:reverse", correct: "はい" },
        { key: 3, correct: false },
        "文字列",
        null,
      ],
    });

    expect(loaded(raw).answers).toEqual([{ key: "a:forward", correct: true }]);
  });

  it("answers が配列でなければ空にする", () => {
    expect(loaded(JSON.stringify({ boxes: { "a:forward": 1 }, answers: {} }))).toEqual({
      boxes: { "a:forward": 1 },
      answers: [],
    });
  });

  /* why: 形を変える前の保存が残っていても、進捗として読み込まない */
  it("boxes を持たない形は空として扱う", () => {
    expect(loaded(JSON.stringify({ "a:forward": 1 }))).toEqual(EMPTY);
  });
});

describe("保存できない環境", () => {
  /* why: プライベートモードでは setItem が例外を throw する。進捗が残らないだけで、
     クイズは続けられる */
  it("失敗を Result で返し、例外を投げない", () => {
    expect(save(brokenStore(), SAVED)).toEqual({ ok: false, error: "store-unavailable" });
  });
});

describe("clear", () => {
  it("進捗も成績も消す", () => {
    const { store, items } = fakeStore();
    save(store, SAVED);

    clear(store);

    expect(items.has(KEY)).toBe(false);
    expect(load(store)).toEqual(EMPTY);
  });
});
