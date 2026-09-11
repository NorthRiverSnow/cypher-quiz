import { ok } from "@cypher-quiz/shared";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";

import type { Card } from "../model/deck";
import type { Saved } from "../model/progress";
import type { Progress } from "./useProgress";
import { useResult } from "./useResult";

afterEach(cleanup);

const card = (id: string, section: Card["section"]): Card => ({
  id,
  section,
  name: `${id} の構文`,
  role: `${id} の役目`,
  runnable: true,
  mutates: false,
});

const DECK: readonly Card[] = [card("match", "skeleton"), card("with", "shaping")];

/** 2 枚 × 2 方向 */
const QUESTIONS = DECK.length * 2;

const setup = (saved: Saved = { boxes: {}, answers: [] }) => {
  const written: Saved[] = [];
  let cleared = 0;

  const progress: Progress = {
    load: () => saved,
    save: (next) => {
      written.push(next);

      return ok(undefined);
    },
    clear: () => {
      cleared += 1;
    },
  };

  return {
    ...renderHook(() => useResult(progress, DECK)),
    written: () => written,
    cleared: () => cleared,
  };
};

describe("成績", () => {
  it("保存が無ければ全て 0", () => {
    const { result } = setup();

    expect(result.current.score).toMatchObject({ asked: 0, correct: 0, missed: [] });
  });

  it("保存された回答から数える", () => {
    const { result } = setup({
      boxes: {},
      answers: [
        { key: "match:forward", correct: true, chosen: "あ" },
        { key: "with:reverse", correct: false, chosen: "い" },
      ],
    });

    expect(result.current.score).toMatchObject({ asked: 2, correct: 1 });
    expect(result.current.score.missed).toEqual([
      { id: "with", section: "shaping", name: "with の構文", direction: "reverse" },
    ]);
  });

  it("章別は出題されなかった章も並ぶ", () => {
    const { result } = setup();

    expect(result.current.score.bySection).toHaveLength(2);
  });
});

describe("進捗バー", () => {
  it("保存が無ければ全問が box 0", () => {
    const { result } = setup();

    expect(result.current.counts).toEqual([QUESTIONS, 0, 0]);
  });

  /* why: 保存に無いキーも box 0 として数える。デッキにカードを足したときに合計が減らない */
  it("保存に有るぶんだけ進む", () => {
    const { result } = setup({ boxes: { "match:forward": 2, "with:reverse": 1 }, answers: [] });

    expect(result.current.counts).toEqual([QUESTIONS - 2, 1, 1]);
  });
});

describe("もう一度", () => {
  it("保存を消す", () => {
    const { result, cleared, written } = setup({
      boxes: { "match:forward": 2 },
      answers: [{ key: "match:forward", correct: true, chosen: "あ" }],
    });

    act(() => result.current.restart());

    expect(cleared()).toBe(1);
    expect(written()).toEqual([]);
  });
});

describe("不正解だけもう一度", () => {
  const MISSED: Saved = {
    boxes: { "match:forward": 2, "with:reverse": 2 },
    answers: [
      { key: "match:forward", correct: true, chosen: "あ" },
      { key: "with:reverse", correct: false, chosen: "い" },
    ],
  };

  /* why: box を 0 に戻すことで、次に組む出題がこれだけになる */
  it("間違えた問題の box だけ 0 に戻す", () => {
    const { result, written } = setup(MISSED);

    act(() => result.current.retryMissed());

    expect(written()[0]?.boxes).toEqual({ "match:forward": 2, "with:reverse": 0 });
  });

  it("成績を空にする", () => {
    const { result, written } = setup(MISSED);

    act(() => result.current.retryMissed());

    expect(written()[0]?.answers).toEqual([]);
  });

  it("消さずに書き換える", () => {
    const { result, cleared } = setup(MISSED);

    act(() => result.current.retryMissed());

    expect(cleared()).toBe(0);
  });
});
