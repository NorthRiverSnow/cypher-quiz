import { useCallback, useState } from "react";

import type { Card } from "../model/deck";
import { DECK } from "../model/deck.data";
import { keysOfSections } from "../model/quiz.common";
import {
  type Score,
  answerCounts,
  answersIn,
  answersOutside,
  resetMissed,
  score,
} from "../model/quiz";
import type { Progress } from "./useProgress";

export type Result = Readonly<{
  /** 進捗バーに渡す 正解 / 不正解 / 完了までに残る回答 */
  counts: [number, number, number];
  score: Score;
  /** 選んだ章の、間違えた問題の box を 0 に戻す。**その章の成績は空になる** */
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

  /* why: 選んだ章の外へは触れない。保存は 1 つなので、範囲を絞らないと
     前に解いた章の box と成績まで巻き戻る（docs/01_spec.md#選んだ章に限るもの） */
  const retryMissed = useCallback(() => {
    progress.save({
      boxes: resetMissed(boxes, answersIn(answers, targetQuestions)),
      answers: answersOutside(answers, targetQuestions),
    });
  }, [answers, boxes, progress, targetQuestions]);

  return {
    counts: answerCounts(answers, boxes, targetQuestions),
    score: score(answers, deck, targetQuestions),
    retryMissed,
  };
};
