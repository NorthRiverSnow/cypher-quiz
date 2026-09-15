import type { MissedCard, SectionScore } from "../types";
import type { Card } from "./deck";
import { type QuestionKey, allKeys, cardOf, directionOf, sectionOf } from "./quiz.common";
import { type Box, DONE, allDone, isDone, nextBox, remaining as notDone } from "./leitner";
import { type Rng, shuffle } from "./rng";

export type Boxes = Readonly<Record<string, Box>>;

/** 1 回の答え。同じ問題に複数回答えれば複数入る */
export type Answer = Readonly<{
  key: QuestionKey;
  /* why: chosen から導かない。カードの文言を直すと、過去の正誤が書き換わる */
  correct: boolean;
  /** 選んだ肢の文言。結果画面から裏を開き直すときに要る */
  chosen: string;
}>;

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
export const answerCurrent = (state: QuizState, correct: boolean, chosen: string): QuizState => {
  const key = currentKey(state);
  if (key === undefined) return state;

  const box = nextBox(state.boxes[key] ?? 0, correct);
  const boxes: Boxes = { ...state.boxes, [key]: box };
  const answers: readonly Answer[] = [...state.answers, { key, correct, chosen }];
  const rest = state.queue.slice(1);

  if (isDone(box)) return { queue: rest, boxes, answers };

  const at = Math.min(correct ? rest.length : REINSERT_AFTER, rest.length);

  return { queue: [...rest.slice(0, at), key, ...rest.slice(at)], boxes, answers };
};

/* why: 保存された boxes だけを数えない。デッキにカードを足すと、古い保存には
   そのキーが無く、合計が問題数に届かない */
export const remaining = (boxes: Boxes, deck: readonly Card[]): number =>
  notDone(allKeys(deck).map((key) => boxes[key] ?? 0));

export const isComplete = (state: QuizState): boolean => allDone(Object.values(state.boxes));

/* why: 同じ問題を 2 回間違えても 1 つ。一覧はカード×方向の一覧で、回数の一覧ではない */
const missedKeys = (answers: readonly Answer[]): QuestionKey[] => [
  ...new Set(answers.filter(({ correct }) => !correct).map(({ key }) => key)),
];

/* why: 数えるのは問題で、回答ではない。1 度でも間違えた問題は、そのあと正解しても
   不正解として数える（docs/01_spec.md#7-画面と導線） */
const askedKeys = (answers: readonly Answer[]): QuestionKey[] => [
  ...new Set(answers.map(({ key }) => key)),
];

/** 出題数と正解数。**数えるのは問題で、回答の回数ではない**（docs/01_spec.md#7-画面と導線） */
export const tally = (answers: readonly Answer[]): Readonly<{ asked: number; correct: number }> => {
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
    const card = cardOf(deck, key);

    return card === undefined
      ? []
      : [{ id: card.id, section: card.section, name: card.name, direction: directionOf(key) }];
  });

/**
 * 進捗バーに出す 3 つ。**単位は回答で、問題ではない。**
 *
 * why: 残りを「まだ答えていない問題」で数えると、全問を一周した時点でバーが満杯になる。
 * 完了には 2 回連続の正解が要るので、満杯になってからも同じだけ出題される
 */
export const answerCounts = (
  answers: readonly Answer[],
  boxes: Boxes,
  deck: readonly Card[],
): [number, number, number] => {
  const correct = answers.filter((answer) => answer.correct).length;
  /* why: 残りは「完了まであと何回正解が要るか」。間違えると box が 0 に戻るので、ここが増える */
  const left = allKeys(deck).reduce((sum, key) => sum + (DONE - (boxes[key] ?? 0)), 0);

  return [correct, answers.length - correct, left];
};

/**
 * サマリに出す成績。
 *
 * why: 引くのは回答だけ。結果画面はクイズを組み直さずに、保存された回答から出せる
 *
 * @param deck 章とカード名を引くために要る
 */
export const score = (answers: readonly Answer[], deck: readonly Card[]): Score => ({
  ...tally(answers),
  bySection: scoreBySection(deck, answers),
  missed: missedCards(deck, answers),
});

/**
 * 間違えた問題の box を 0 に戻す。**次に `createQuiz` が積むのはこれだけ**になる。
 *
 * why: キューは保存していないので、「この問題だけ出す」を伝える手段が box しかない。
 * 0 に戻る以上、解き直しにも 2 回連続の正解が要る（docs/01_spec.md#7-画面と導線）
 */
/**
 * その問題で最後に選んだ肢。**間違えた問題の裏を開き直すのに使う。**
 *
 * why: 同じ問題に何度も答えるので、最後の 1 回を採る
 */
export const chosenFor = (answers: readonly Answer[], key: QuestionKey): string | undefined =>
  answers.findLast((answer) => answer.key === key)?.chosen;

export const resetMissed = (boxes: Boxes, answers: readonly Answer[]): Boxes => ({
  ...boxes,
  ...Object.fromEntries(missedKeys(answers).map((key): [QuestionKey, Box] => [key, 0])),
});
