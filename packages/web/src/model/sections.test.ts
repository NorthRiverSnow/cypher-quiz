import { describe, expect, it } from "vite-plus/test";

import type { Card } from "./deck";
import { keyOf } from "./quiz.common";
import type { Answer, Boxes } from "./quiz";
import { allSectionProgress, resetSections, sectionProgress, startingFrom } from "./sections";

const deck: Card[] = [
  { id: "a", section: "skeleton", name: "A", role: "あ", mutates: false },
  { id: "b", section: "skeleton", name: "B", role: "い", mutates: false },
  { id: "c", section: "lists", name: "C", role: "う", mutates: false },
];

const answer = (id: string, correct: boolean): Answer => ({
  key: keyOf(id, "forward"),
  correct,
  chosen: "肢",
});

const done = (ids: readonly string[]): Boxes =>
  Object.fromEntries(
    ids.flatMap((id) => [
      [keyOf(id, "forward"), 2],
      [keyOf(id, "reverse"), 2],
    ]),
  );

/** skeleton 章（a / b の 2 枚 = 4 問）の状態。他の章は lists の c だけ */
const skeletonProgress = (boxes: Boxes, answers: readonly Answer[]) =>
  sectionProgress("skeleton", boxes, answers, deck);

describe("章の状態", () => {
  it("回答が無ければ未着手", () => {
    expect(skeletonProgress({}, [])).toMatchObject({ total: 4, correct: 0, state: "fresh" });
  });

  it("回答があり完了していなければ進行中", () => {
    expect(skeletonProgress({}, [answer("a", true)])).toMatchObject({ state: "ongoing" });
  });

  it("全問が box 2 なら完了", () => {
    expect(skeletonProgress(done(["a", "b"]), [answer("a", true)])).toMatchObject({
      state: "done",
    });
  });

  /* why: 「不正解だけもう一度」は成績を消さずに追記する。box だけ 2 の章を未着手にしない */
  it("成績が空でも box が全て 2 なら完了", () => {
    expect(skeletonProgress(done(["a", "b"]), [])).toMatchObject({ state: "done" });
  });

  /* why: [].every は true。デッキに無い章を渡すと完了になる */
  it("デッキに無い章は完了にしない", () => {
    expect(sectionProgress("writing", {}, [], deck)).toMatchObject({ total: 0, state: "fresh" });
  });

  it("他の章の回答を数えない", () => {
    expect(skeletonProgress({}, [answer("c", true)])).toMatchObject({ correct: 0, state: "fresh" });
  });
});

describe("正解した問題の数", () => {
  it("正解した問題を数える", () => {
    expect(skeletonProgress({}, [answer("a", true)]).correct).toBe(1);
  });

  /* why: 1 度でも間違えた問題は、そのあと正解しても数えない（docs/01_spec.md#7-画面と導線） */
  it("間違えたあと正解しても数えない", () => {
    expect(skeletonProgress({}, [answer("a", false), answer("a", true)]).correct).toBe(0);
  });

  it("同じ問題に何度正解しても 1 つ", () => {
    expect(skeletonProgress({}, [answer("a", true), answer("a", true)]).correct).toBe(1);
  });
});

describe("章を並べる", () => {
  it("デッキの章を全て返す", () => {
    expect(allSectionProgress({}, [], deck).map(({ section }) => section)).toEqual([
      "skeleton",
      "lists",
    ]);
  });

  it("章ごとに数える", () => {
    const progress = allSectionProgress({}, [answer("a", true), answer("c", false)], deck);

    expect(progress).toMatchObject([
      { section: "skeleton", total: 4, correct: 1, state: "ongoing" },
      { section: "lists", total: 2, correct: 0, state: "ongoing" },
    ]);
  });
});

describe("章の記録をリセットする", () => {
  const saved = {
    boxes: { [keyOf("a", "forward")]: 2, [keyOf("c", "forward")]: 1 } as Boxes,
    answers: [answer("a", true), answer("c", false)],
  };

  it("その章だけ未着手に戻す", () => {
    const next = resetSections(["skeleton"], saved.boxes, saved.answers, deck);

    expect(next.boxes).toEqual({ [keyOf("c", "forward")]: 1 });
    expect(next.answers).toEqual([answer("c", false)]);
  });

  it("何も渡さなければ変えない", () => {
    expect(resetSections([], saved.boxes, saved.answers, deck)).toEqual(saved);
  });
});

describe("選んだ章で始める", () => {
  /** skeleton は a / b。全問 box 2 で完了。lists の c は手つかず */
  const boxes = { ...done(["a", "b"]), [keyOf("c", "forward")]: 1 } as Boxes;
  const answers = [answer("a", true), answer("c", true)];

  it("完了した章は捨てて最初から出す", () => {
    const next = startingFrom(["skeleton"], boxes, answers, deck);

    expect(next.boxes[keyOf("a", "forward")]).toBeUndefined();
    expect(next.answers).toEqual([answer("c", true)]);
  });

  it("完了していない章はそのまま続ける", () => {
    expect(startingFrom(["lists"], boxes, answers, deck)).toEqual({ boxes, answers });
  });

  /* why: 6 章すべてを選んだら総ざらい。完了しているかを見ずに全部捨てる */
  it("全ての章を選ぶと、完了していなくても全部捨てる", () => {
    const next = startingFrom(["skeleton", "lists"], boxes, answers, deck);

    expect(next).toEqual({ boxes: {}, answers: [] });
  });

  it("何も選ばなければ変えない", () => {
    expect(startingFrom([], boxes, answers, deck)).toEqual({ boxes, answers });
  });
});
