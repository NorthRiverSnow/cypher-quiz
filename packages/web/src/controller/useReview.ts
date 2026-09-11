import { useState } from "react";

import type { Card } from "../model/deck";
import { DECK } from "../model/deck.data";
import { answerOf, promptOf } from "../model/question";
import { chosenFor, keyOf } from "../model/quiz";
import { DIRECTION_LABELS, type CodeSegment, type Direction, type SectionId } from "../types";
import type { Progress } from "./useProgress";

/* why: URL は手で書ける。向きの一覧を増やさずに絞るため、ラベル表を出どころにする */
const isDirection = (value: string): value is Direction => value in DIRECTION_LABELS;

export type Review = Readonly<{
  section: SectionId;
  direction: Direction;
  /** 表に出ていた設問 */
  prompt: string;
  correct: string;
  /** そのとき選んだ肢 */
  chosen: string;
  code?: readonly CodeSegment[];
  expected?: string;
  note?: string;
  warn?: string;
  /** 実行ボタンを出してよいか（docs/01_spec.md#書き込み系-5-枚は実行ボタンを出さない） */
  runnable: boolean;
}>;

/**
 * 間違えた問題を開き直す。**保存を読むだけで、何も書かない。**
 *
 * why: 答えた記録が無ければ undefined を返す。URL を手で書けば知らないカードにも
 * 辿り着けるので、画面はこれを見て結果へ送り返す
 */
export const useReview = (
  cardId: string,
  direction: string,
  progress: Progress,
  deck: readonly Card[] = DECK,
): Review | undefined => {
  const [{ answers }] = useState(() => progress.load());

  if (!isDirection(direction)) {
    return undefined;
  }

  const card = deck.find(({ id }) => id === cardId);
  const chosen = chosenFor(answers, keyOf(cardId, direction));

  if (card === undefined || chosen === undefined) {
    return undefined;
  }

  return {
    section: card.section,
    direction,
    prompt: promptOf(card, direction),
    correct: answerOf(card, direction),
    chosen,
    runnable: card.runnable,
    ...(card.code === undefined ? {} : { code: card.code }),
    ...(card.expected === undefined ? {} : { expected: card.expected }),
    ...(card.note === undefined ? {} : { note: card.note }),
    ...(card.warn === undefined ? {} : { warn: card.warn }),
  };
};
