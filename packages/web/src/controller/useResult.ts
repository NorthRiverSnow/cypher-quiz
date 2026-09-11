import { useCallback, useState } from "react";

import type { Card } from "../model/deck";
import { DECK } from "../model/deck.data";
import { type Score, answerCounts, resetMissed, score } from "../model/quiz";
import type { Progress } from "./useProgress";

export type Result = Readonly<{
  /** 進捗バーに渡す 正解 / 不正解 / 完了までに残る回答 */
  counts: [number, number, number];
  score: Score;
  /** 進捗も成績も消す */
  restart: () => void;
  /** 間違えた問題の box を 0 に戻し、成績を空にする */
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

  const restart = useCallback(() => {
    progress.clear();
  }, [progress]);

  const retryMissed = useCallback(() => {
    progress.save({ boxes: resetMissed(boxes, answers), answers: [] });
  }, [answers, boxes, progress]);

  return {
    counts: answerCounts(answers, boxes, deck),
    score: score(answers, deck),
    restart,
    retryMissed,
  };
};
