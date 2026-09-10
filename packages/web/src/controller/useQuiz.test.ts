import { ok } from "@cypher-quiz/shared";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";

import type { Card } from "../model/deck";
import type { Boxes } from "../model/quiz";
import type { Progress } from "./useProgress";
import { useQuiz } from "./useQuiz";

afterEach(cleanup);

const card = (id: string, section: Card["section"]): Card => ({
  id,
  section,
  name: `${id} の構文`,
  role: `${id} の役目`,
  runnable: true,
  mutates: false,
});

const DECK: readonly Card[] = [
  card("match", "skeleton"),
  card("where", "skeleton"),
  card("with", "shaping"),
  card("collect", "shaping"),
];

/** 1 枚 × 2 方向。4 枚なので 8 問 */
const QUESTIONS = DECK.length * 2;

const setup = (boxes: Boxes = {}) => {
  const saved: Boxes[] = [];
  let cleared = 0;

  const progress: Progress = {
    load: () => boxes,
    save: (next) => {
      saved.push(next);

      return ok(undefined);
    },
    clear: () => {
      cleared += 1;
    },
  };

  return {
    ...renderHook(() => useQuiz(progress, { deck: DECK, seed: 42 })),
    saved: () => saved,
    cleared: () => cleared,
  };
};

/** 今の 1 問に正解 or 不正解で答えて、次へ進む */
const answerWith = (result: { current: ReturnType<typeof useQuiz> }, correct: boolean) => {
  const face = result.current.face;

  if (face?.side !== "question") {
    throw new Error("表が出ていない");
  }

  const wrong = (face.question.answer + 1) % face.question.choices.length;

  act(() => result.current.select(correct ? face.question.answer : wrong));
  act(() => result.current.answer());
  act(() => result.current.next());
};

describe("出題", () => {
  it("最初は表が出る", () => {
    const { result } = setup();

    expect(result.current.face?.side).toBe("question");
  });

  it("4 択になる", () => {
    const { result } = setup();
    const face = result.current.face;

    expect(face?.side === "question" && face.question.choices).toHaveLength(4);
  });

  it("正解が肢に含まれる", () => {
    const { result } = setup();
    const face = result.current.face;

    if (face?.side !== "question") {
      throw new Error("表が出ていない");
    }

    expect(face.question.choices[face.question.answer]).toBeDefined();
  });

  /* why: 毎レンダリング組み直すと、選んでいる途中で肢の並びが変わる */
  it("選んでも肢の並びが変わらない", () => {
    const { result } = setup();
    const before = result.current.face;

    act(() => result.current.select(1));

    const after = result.current.face;

    expect(after?.side === "question" && after.question.choices).toEqual(
      before?.side === "question" ? before.question.choices : undefined,
    );
  });

  it("保存された習熟度から始める", () => {
    const done: Boxes = Object.fromEntries(
      DECK.flatMap(({ id }) => [
        [`${id}:forward`, 2],
        [`${id}:reverse`, 2],
      ]),
    );
    const { result } = setup(done);

    expect(result.current.face).toBeUndefined();
    expect(result.current.complete).toBe(true);
  });
});

describe("答え合わせ", () => {
  it("選ばずに答えても何も起きない", () => {
    const { result, saved } = setup();

    act(() => result.current.answer());

    expect(result.current.face?.side).toBe("question");
    expect(saved()).toEqual([]);
  });

  it("答えると裏になる", () => {
    const { result } = setup();

    act(() => result.current.select(0));
    act(() => result.current.answer());

    expect(result.current.face?.side).toBe("back");
  });

  it("裏は選んだ肢と正誤を持つ", () => {
    const { result } = setup();
    const asked = result.current.face;

    if (asked?.side !== "question") {
      throw new Error("表が出ていない");
    }

    act(() => result.current.select(asked.question.answer));
    act(() => result.current.answer());

    const back = result.current.face;

    expect(back?.side === "back" && back).toMatchObject({
      choice: asked.question.answer,
      correct: true,
    });
  });

  it("間違えたら correct が false", () => {
    const { result } = setup();
    const asked = result.current.face;

    if (asked?.side !== "question") {
      throw new Error("表が出ていない");
    }

    act(() => result.current.select((asked.question.answer + 1) % 4));
    act(() => result.current.answer());

    expect(result.current.face?.side === "back" && result.current.face.correct).toBe(false);
  });

  it("裏では答えたカードを見せ続ける", () => {
    const { result } = setup();
    const asked = result.current.face;

    if (asked?.side !== "question") {
      throw new Error("表が出ていない");
    }

    act(() => result.current.select(0));
    act(() => result.current.answer());

    expect(result.current.face?.card.id).toBe(asked.card.id);
  });

  it("次へ進むと表に戻り、選択が消える", () => {
    const { result } = setup();

    act(() => result.current.select(0));
    act(() => result.current.answer());
    act(() => result.current.next());

    const face = result.current.face;

    expect(face?.side).toBe("question");
    expect(face?.side === "question" && face.selected).toBeUndefined();
  });
});

describe("習熟度", () => {
  it("答えるたびに保存する", () => {
    const { result, saved } = setup();

    answerWith(result, true);

    expect(saved()).toHaveLength(1);
  });

  it("正解で box が上がる", () => {
    const { result, saved } = setup();
    const face = result.current.face;
    const key = face?.side === "question" ? `${face.card.id}:${face.question.direction}` : "";

    answerWith(result, true);

    expect(saved()[0]?.[key]).toBe(1);
  });

  it("不正解で box 0 に戻る", () => {
    const { result, saved } = setup();
    const face = result.current.face;
    const key = face?.side === "question" ? `${face.card.id}:${face.question.direction}` : "";

    answerWith(result, false);

    expect(saved()[0]?.[key]).toBe(0);
  });

  it("counts が進む", () => {
    const { result } = setup();

    expect(result.current.counts).toEqual([QUESTIONS, 0, 0]);

    answerWith(result, true);

    expect(result.current.counts).toEqual([QUESTIONS - 1, 1, 0]);
  });
});

describe("最後まで解く", () => {
  it("全問 2 回正解すると complete になる", () => {
    const { result } = setup();

    for (let i = 0; i < QUESTIONS * 2; i += 1) {
      if (result.current.face === undefined) {
        break;
      }

      answerWith(result, true);
    }

    expect(result.current.complete).toBe(true);
    expect(result.current.face).toBeUndefined();
    expect(result.current.counts).toEqual([0, 0, QUESTIONS]);
  });

  /* why: 不正解は 3 問後ろに戻る。出題が尽きずに回り続ける */
  it("間違え続けても出題が尽きない", () => {
    const { result } = setup();

    for (let i = 0; i < 20; i += 1) {
      answerWith(result, false);
    }

    expect(result.current.face?.side).toBe("question");
    expect(result.current.complete).toBe(false);
  });
});

describe("restart", () => {
  it("保存された習熟度を消して組み直す", () => {
    const done: Boxes = Object.fromEntries(
      DECK.flatMap(({ id }) => [
        [`${id}:forward`, 2],
        [`${id}:reverse`, 2],
      ]),
    );
    const { result, cleared } = setup(done);

    expect(result.current.face).toBeUndefined();

    act(() => result.current.restart());

    expect(cleared()).toBe(1);
    expect(result.current.face?.side).toBe("question");
    expect(result.current.counts).toEqual([QUESTIONS, 0, 0]);
  });

  it("裏を出していても表に戻る", () => {
    const { result } = setup();

    act(() => result.current.select(0));
    act(() => result.current.answer());
    act(() => result.current.restart());

    expect(result.current.face?.side).toBe("question");
  });
});
