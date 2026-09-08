import type { Direction } from "../types";
import type { Card } from "./deck";
import { type Box, allDone, distribution, isDone, nextBox } from "./leitner";
import { type Rng, shuffle } from "./rng";

/** カード × 方向で 1 問。習熟度は向きごとに数える（docs/01_spec.md#2-出題形式） */
export type QuestionKey = `${string}:${Direction}`;

export type Boxes = Readonly<Record<string, Box>>;

export type QuizState = Readonly<{
  /** 残りの出題。先頭が今の 1 問 */
  queue: readonly QuestionKey[];
  boxes: Boxes;
}>;

/** 不正解のカードを何問後ろに差し戻すか。0 なら次の問題がまた同じカードになる */
const REINSERT_AFTER = 3;

export const keyOf = (cardId: string, direction: Direction): QuestionKey =>
  `${cardId}:${direction}`;

export const cardIdOf = (key: QuestionKey): string => key.slice(0, key.lastIndexOf(":"));

export const directionOf = (key: QuestionKey): Direction =>
  key.endsWith(":forward") ? "forward" : "reverse";

export const allKeys = (deck: readonly Card[]): QuestionKey[] =>
  deck.flatMap((card) => [keyOf(card.id, "forward"), keyOf(card.id, "reverse")]);

/**
 * 出題を組む。完了済みは並べず、box の低いものを先に出す。
 *
 * @param boxes 前回までの習熟度。無ければ全て box 0 から始める
 */
export const createQuiz = (deck: readonly Card[], rng: Rng, boxes: Boxes = {}): QuizState => {
  const keys = allKeys(deck);
  const filled: Boxes = Object.fromEntries(
    keys.map((key): [QuestionKey, Box] => [key, boxes[key] ?? 0]),
  );
  /* why: box ごとに固めてから混ぜる。まとめて混ぜると、覚えていないものが後半に流れる。
     box 2（完了）は並べないので、この絞り込みが出題の対象も決めている */
  const queue = [0, 1].flatMap((box) =>
    shuffle(
      keys.filter((key) => filled[key] === box),
      rng,
    ),
  );

  return { queue, boxes: filled };
};

export const currentKey = (state: QuizState): QuestionKey | undefined => state.queue[0];

/** 今の 1 問に答える。完了したものはキューから外し、残りは後ろへ回す */
export const answerCurrent = (state: QuizState, correct: boolean): QuizState => {
  const key = currentKey(state);
  if (key === undefined) return state;

  const box = nextBox(state.boxes[key] ?? 0, correct);
  const boxes: Boxes = { ...state.boxes, [key]: box };
  const rest = state.queue.slice(1);

  if (isDone(box)) return { queue: rest, boxes };

  const at = Math.min(correct ? rest.length : REINSERT_AFTER, rest.length);

  return { queue: [...rest.slice(0, at), key, ...rest.slice(at)], boxes };
};

export const counts = (state: QuizState): [number, number, number] =>
  distribution(Object.values(state.boxes));

export const isComplete = (state: QuizState): boolean => allDone(Object.values(state.boxes));
