import type { SectionId } from "../types";
import type { Card } from "./deck";
import { type QuestionKey, keysOf, sectionsOf } from "./quiz.common";
import { isDone } from "./leitner";
import { type Answer, type Boxes, tally } from "./quiz";

/**
 * スタート画面の 1 行が持つもの（docs/01_spec.md#7-画面と導線）。
 */
export type SectionProgress = Readonly<{
  section: SectionId;
  /** その章の問題数。カードの枚数 × 2 方向 */
  total: number;
  /** 正解した問題の数。**1 度でも間違えた問題は数えない** */
  correct: number;
  state: "fresh" | "ongoing" | "done";
}>;

/**
 * 1 つの章の状態。
 *
 * why: 完了を先に見る。「不正解だけもう一度」で成績を消しても box は 2 のままなので、
 * 回答の有無から先に見ると、完了した章が未着手に見える
 */
export const sectionProgress = (
  section: SectionId,
  boxes: Boxes,
  answers: readonly Answer[],
  deck: readonly Card[],
): SectionProgress => {
  const keys = keysOf(deck, section);
  const own = new Set<QuestionKey>(keys);
  const mine = answers.filter(({ key }) => own.has(key));

  return {
    section,
    total: keys.length,
    correct: tally(mine).correct,
    /* why: [].every は true。デッキに無い章を渡すと完了になる */
    state:
      keys.length > 0 && keys.every((key) => isDone(boxes[key] ?? 0))
        ? "done"
        : mine.length === 0
          ? "fresh"
          : "ongoing",
  };
};

export const allSectionProgress = (
  boxes: Boxes,
  answers: readonly Answer[],
  deck: readonly Card[],
): SectionProgress[] =>
  sectionsOf(deck).map((section) => sectionProgress(section, boxes, answers, deck));
