import type { Direction, MissedCard, SectionId, SectionScore } from "../types";
import type { Card } from "./deck";
import { type Box, allDone, distribution, isDone, nextBox } from "./leitner";
import { type Rng, shuffle } from "./rng";

/** カード × 方向で 1 問。習熟度は向きごとに数える（docs/01_spec.md#2-出題形式） */
export type QuestionKey = `${string}:${Direction}`;

export type Boxes = Readonly<Record<string, Box>>;

/** 1 回の答え。同じ問題に複数回答えれば複数入る */
export type Answer = Readonly<{ key: QuestionKey; correct: boolean }>;

export type QuizState = Readonly<{
  /** 残りの出題。先頭が今の 1 問 */
  queue: readonly QuestionKey[];
  boxes: Boxes;
  /* why: この出題を組んでからの回答。box は「2 回連続で正解したか」しか持たないので、
     出題数・正解数・間違えた問題は box から復元できない。保存はしない
     （docs/01_spec.md#6-復習間隔反復 が保存すると書いているのは box だけ） */
  answers: readonly Answer[];
}>;

/** サマリに出すもの（docs/01_spec.md#7-画面と導線） */
export type Score = Readonly<{
  asked: number;
  correct: number;
  bySection: readonly SectionScore[];
  missed: readonly MissedCard[];
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
export const createQuiz = (
  deck: readonly Card[],
  rng: Rng,
  boxes: Boxes = {},
  answers: readonly Answer[] = [],
): QuizState => {
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

  return { queue, boxes: filled, answers };
};

export const currentKey = (state: QuizState): QuestionKey | undefined => state.queue[0];

/** 今の 1 問に答える。完了したものはキューから外し、残りは後ろへ回す */
export const answerCurrent = (state: QuizState, correct: boolean): QuizState => {
  const key = currentKey(state);
  if (key === undefined) return state;

  const box = nextBox(state.boxes[key] ?? 0, correct);
  const boxes: Boxes = { ...state.boxes, [key]: box };
  const answers: readonly Answer[] = [...state.answers, { key, correct }];
  const rest = state.queue.slice(1);

  if (isDone(box)) return { queue: rest, boxes, answers };

  const at = Math.min(correct ? rest.length : REINSERT_AFTER, rest.length);

  return { queue: [...rest.slice(0, at), key, ...rest.slice(at)], boxes, answers };
};

export const counts = (state: QuizState): [number, number, number] =>
  distribution(Object.values(state.boxes));

export const isComplete = (state: QuizState): boolean => allDone(Object.values(state.boxes));

const sectionOf = (deck: readonly Card[], key: QuestionKey): SectionId | undefined =>
  deck.find(({ id }) => id === cardIdOf(key))?.section;

/* why: 同じ問題を 2 回間違えても 1 つ。一覧はカード×方向の一覧で、回数の一覧ではない */
const missedKeys = (answers: readonly Answer[]): QuestionKey[] => [
  ...new Set(answers.filter(({ correct }) => !correct).map(({ key }) => key)),
];

/* why: 数えるのは問題で、回答ではない。1 度でも間違えた問題は、そのあと正解しても
   不正解として数える（docs/01_spec.md#7-画面と導線） */
const askedKeys = (answers: readonly Answer[]): QuestionKey[] => [
  ...new Set(answers.map(({ key }) => key)),
];

const tally = (answers: readonly Answer[]): Readonly<{ asked: number; correct: number }> => {
  const missed = new Set(missedKeys(answers));
  const asked = askedKeys(answers);

  return { asked: asked.length, correct: asked.filter((key) => !missed.has(key)).length };
};

/* why: 章は 6 つで固定。出題されなかった章も 0 / 0 で並べる——章別を見るのは
   「次に読み直す章」を決めるためで、抜けていると比べられない */
const scoreBySection = (deck: readonly Card[], answers: readonly Answer[]): SectionScore[] =>
  [...new Set(deck.map(({ section }) => section))].map((section) => ({
    section,
    ...tally(answers.filter((answer) => sectionOf(deck, answer.key) === section)),
  }));

const missedCards = (deck: readonly Card[], answers: readonly Answer[]): MissedCard[] =>
  missedKeys(answers).flatMap((key) => {
    const card = deck.find(({ id }) => id === cardIdOf(key));

    return card === undefined
      ? []
      : [{ section: card.section, name: card.name, direction: directionOf(key) }];
  });

/**
 * サマリに出す成績。
 *
 * @param deck 章とカード名を引くために要る
 */
export const score = (state: QuizState, deck: readonly Card[]): Score => ({
  ...tally(state.answers),
  bySection: scoreBySection(deck, state.answers),
  missed: missedCards(deck, state.answers),
});

/**
 * 間違えた問題だけで組み直す。**box はそのまま**——完了しているので、
 * 正解すれば消え、間違えれば 0 に戻ってまた出る。
 */
export const retryMissed = (state: QuizState, rng: Rng): QuizState => ({
  queue: shuffle(missedKeys(state.answers), rng),
  boxes: state.boxes,
  answers: [],
});
