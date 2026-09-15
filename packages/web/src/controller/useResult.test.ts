import { ok } from "@cypher-quiz/shared";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";

import type { Card } from "../model/deck";
import type { Saved } from "../model/quiz";
import type { Progress } from "./useProgress";
import { useResult } from "./useResult";

afterEach(cleanup);

const card = (id: string, section: Card["section"]): Card => ({
  id,
  section,
  name: `${id} の構文`,
  role: `${id} の役目`,
  mutates: false,
});

const DECK: readonly Card[] = [card("match", "skeleton"), card("with", "shaping")];

/** 2 枚 × 2 方向 */
/** 既定はデッキの全章。章の選択は useStart のテストで見る */
const SECTIONS = [...new Set(DECK.map(({ section }) => section))];

const QUESTIONS = DECK.length * 2;

/** 1 問につき 2 回続けて正解が要る */
const TO_COMPLETE = QUESTIONS * 2;

const setup = (saved: Saved = { boxes: {}, answers: [] }, sections = SECTIONS) => {
  const written: Saved[] = [];

  const progress: Progress = {
    load: () => saved,
    save: (next) => {
      written.push(next);

      return ok(undefined);
    },
    loadSections: () => sections,
    saveSections: () => ok(undefined),
  };

  return {
    ...renderHook(() => useResult(progress, DECK)),
    written: () => written,
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
  it("保存が無ければ全てが残り", () => {
    const { result } = setup();

    expect(result.current.counts).toEqual([0, 0, TO_COMPLETE]);
  });

  /* why: 問題ではなく回答で数える。同じ問題への 2 回目も 1 つに数える */
  it("正解と不正解を分けて数える", () => {
    const { result } = setup({
      boxes: { "match:forward": 1, "with:reverse": 1 },
      answers: [
        { key: "match:forward", correct: true, chosen: "あ" },
        { key: "with:reverse", correct: false, chosen: "い" },
        { key: "with:reverse", correct: true, chosen: "う" },
      ],
    });

    expect(result.current.counts).toEqual([2, 1, TO_COMPLETE - 2]);
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

  /* why: スタート画面は保存された回答から章の成績を出す。捨てると、
     解き直したぶんだけが残って正解数が減る（docs/01_spec.md#選んだ章に限るもの） */
  it("解き直す章の、それまでの回答を捨てない", () => {
    const { result, written } = setup(MISSED);

    act(() => result.current.retryMissed());

    expect(written()[0]?.answers).toEqual(MISSED.answers);
  });

  /* why: 保存は 1 つ。範囲を絞らないと、前に解いた章の box まで巻き戻る
     （docs/01_spec.md#選んだ章に限るもの） */
  it("選ばなかった章の box は戻さない", () => {
    const { result, written } = setup(MISSED, ["skeleton"]);

    act(() => result.current.retryMissed());

    expect(written()[0]?.boxes).toEqual({ "match:forward": 2, "with:reverse": 2 });
  });

  it("選ばなかった章の box は戻さないまま、回答も全て残す", () => {
    const { result, written } = setup(MISSED, ["skeleton"]);

    act(() => result.current.retryMissed());

    expect(written()[0]?.answers).toEqual(MISSED.answers);
  });
});

describe("選んだ章に限る", () => {
  const ANSWERS = [
    { key: "match:forward", correct: true, chosen: "あ" },
    { key: "with:reverse", correct: false, chosen: "い" },
  ] as const;

  it("選んだ章だけ成績に並べる", () => {
    const { result } = setup({ boxes: {}, answers: [...ANSWERS] }, ["skeleton"]);

    expect(result.current.score.bySection).toEqual([{ section: "skeleton", asked: 1, correct: 1 }]);
    expect(result.current.score).toMatchObject({ asked: 1, correct: 1 });
  });

  it("選ばなかった章の不正解を一覧に出さない", () => {
    const { result } = setup({ boxes: {}, answers: [...ANSWERS] }, ["skeleton"]);

    expect(result.current.score.missed).toEqual([]);
  });

  it("進捗バーの分母が選んだ章の分だけになる", () => {
    const { result } = setup({ boxes: {}, answers: [] }, ["skeleton"]);

    expect(result.current.counts).toEqual([0, 0, 4]);
  });
});
