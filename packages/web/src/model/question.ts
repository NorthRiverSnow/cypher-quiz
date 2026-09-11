import type { Direction } from "../types";
import type { Card } from "./deck";
import { type Rng, shuffle } from "./rng";

export const CHOICE_COUNT = 4;

export type Question = Readonly<{
  cardId: string;
  direction: Direction;
  prompt: string;
  choices: readonly string[];
  /** choices の中で正解の位置 */
  answer: number;
}>;

/** 正順は構文を見せて目的を選ばせる。逆順はその逆（docs/01_spec.md#2-出題形式） */
export const promptOf = (card: Card, direction: Direction) =>
  direction === "forward" ? card.name : card.role;

export const answerOf = (card: Card, direction: Direction) =>
  direction === "forward" ? card.role : card.name;

/**
 * 不正解の肢を 3 つ選ぶ。同じ章を先に使い、足りなければ他章から補う。
 *
 * @param deck 同じ章から引くために全体を渡す
 */
const distractors = (card: Card, deck: readonly Card[], direction: Direction, rng: Rng) => {
  const correct = answerOf(card, direction);
  const others = deck.filter((other) => other.id !== card.id);
  const sameSection = others.filter((other) => other.section === card.section);
  const otherSections = others.filter((other) => other.section !== card.section);

  const texts = [...shuffle(sameSection, rng), ...shuffle(otherSections, rng)].map((other) =>
    answerOf(other, direction),
  );

  /* why: 同じ文言のカードが混ざると、正解が 2 つある問題になる */
  const unique = [...new Set(texts)].filter((text) => text !== correct);

  return unique.slice(0, CHOICE_COUNT - 1);
};

/**
 * 1 枚のカードから 4 択を組む。
 *
 * @param deck 不正解の肢の供給元
 * @param rng 肢の並びと不正解の選択に使う
 */
export const buildQuestion = (
  card: Card,
  deck: readonly Card[],
  direction: Direction,
  rng: Rng,
): Question => {
  const correct = answerOf(card, direction);
  const choices = shuffle([correct, ...distractors(card, deck, direction, rng)], rng);

  return {
    cardId: card.id,
    direction,
    prompt: promptOf(card, direction),
    choices,
    answer: choices.indexOf(correct),
  };
};
