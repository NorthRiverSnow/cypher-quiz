/* 問題キーの代数と、キーからの引き当て。**model も controller も引く共通部分**
 * （docs/02_architecture.md#5-ディレクトリ）。出題キューと box の進みは quiz.ts */

import type { Direction, SectionId } from "../types";
import type { Card } from "./deck";

/** カード × 方向で 1 問。習熟度は向きごとに数える（docs/01_spec.md#2-出題形式） */
export type QuestionKey = `${string}:${Direction}`;

export const keyOf = (cardId: string, direction: Direction): QuestionKey =>
  `${cardId}:${direction}`;

export const cardIdOf = (key: QuestionKey): string => key.slice(0, key.lastIndexOf(":"));

export const directionOf = (key: QuestionKey): Direction =>
  key.endsWith(":forward") ? "forward" : "reverse";

export const allKeys = (deck: readonly Card[]): QuestionKey[] =>
  deck.flatMap((card) => [keyOf(card.id, "forward"), keyOf(card.id, "reverse")]);

export const cardById = (deck: readonly Card[], id: string): Card | undefined =>
  deck.find((card) => card.id === id);

export const cardOf = (deck: readonly Card[], key: QuestionKey): Card | undefined =>
  cardById(deck, cardIdOf(key));

export const sectionOf = (deck: readonly Card[], key: QuestionKey): SectionId | undefined =>
  cardOf(deck, key)?.section;

export const keysOf = (deck: readonly Card[], section: SectionId): QuestionKey[] =>
  allKeys(deck.filter((card) => card.section === section));

/* why: デッキに出てくる順で並べる。`SECTION_LABELS` の順に頼ると、デッキに無い章も並ぶ */
export const sectionsOf = (deck: readonly Card[]): SectionId[] => [
  ...new Set(deck.map(({ section }) => section)),
];
