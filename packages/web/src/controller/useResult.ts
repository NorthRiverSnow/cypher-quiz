import { useCallback, useState } from "react";

import type { Card } from "../model/deck";
import { DECK } from "../model/deck.data";
import { keysOfSections } from "../model/quiz.common";
import { type Score, answerCounts, answersIn, resetMissed, score } from "../model/quiz";
import type { Progress } from "./useProgress";

export type Result = Readonly<{
  /** 進捗バーに渡す 正解 / 不正解 / 完了までに残る回答 */
  counts: [number, number, number];
  score: Score;
  /** 選んだ章の、間違えた問題の box を 0 に戻す。**成績は消さない** */
  retryMissed: () => void;
}>;

/**
 * サマリに出すもの。**クイズを組まない**——保存された回答を数えるだけ。
 *
 * why: 読むのは mount のとき 1 回。やり直しは保存を書き換えてから遷移するので、
 * この画面を描き直す必要がない（docs/02_architecture.md#やり直しは保存を書き換えて遷移する）
 *
 * @param deck 章とカード名を引くために要る
 */
export const useResult = (progress: Progress, deck: readonly Card[] = DECK): Result => {
  const [{ boxes, answers }] = useState(() => progress.load());
  /* why: 章は mount のとき 1 回だけ読む。成績はこの範囲で数える
     （docs/01_spec.md#7-画面と導線） */
  const [targetQuestions] = useState(() => keysOfSections(deck, progress.loadSections()));

  /* why: 戻すのは box だけで、回答は 1 つも捨てない。捨てると、スタート画面の章の成績が
     解き直したぶんだけになる。**1 度でも間違えた問題は正解しても不正解**なので、
     残したままでも解き直しの結果は成績に入らない（docs/01_spec.md#選んだ章に限るもの）

     why: box を戻す範囲は選んだ章に絞る。保存は 1 つなので、絞らないと
     前に解いた章の box まで巻き戻る */
  const retryMissed = useCallback(() => {
    progress.save({
      boxes: resetMissed(boxes, answersIn(answers, targetQuestions)),
      answers,
    });
  }, [answers, boxes, progress, targetQuestions]);

  return {
    counts: answerCounts(answers, boxes, targetQuestions),
    score: score(answers, deck, targetQuestions),
    retryMissed,
  };
};
