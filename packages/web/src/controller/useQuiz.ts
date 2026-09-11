import { useCallback, useMemo, useState } from "react";

import type { Card } from "../model/deck";
import { DECK } from "../model/deck.data";
import { type Question, buildQuestion } from "../model/question";
import {
  type QuizState,
  answerCurrent,
  cardIdOf,
  counts as countsOf,
  createQuiz,
  currentKey,
  directionOf,
  isComplete,
} from "../model/quiz";
import { createRng } from "../model/rng";
import type { Progress } from "./useProgress";

/** 表か裏のどちらか。出題が尽きたら `undefined` になる */
export type Face =
  | Readonly<{ side: "question"; card: Card; question: Question; selected?: number }>
  | Readonly<{
      side: "back";
      card: Card;
      question: Question;
      /** 選んだ肢の位置 */
      choice: number;
      correct: boolean;
    }>;

export type Quiz = Readonly<{
  counts: [number, number, number];
  face: Face | undefined;
  /** 全ての向きが box 2 に届いた */
  complete: boolean;
  select: (choice: number) => void;
  /** 選んでいなければ何もしない */
  answer: () => void;
  next: () => void;
}>;

export type QuizOptions = Readonly<{
  deck?: readonly Card[];
  /** 出題順と肢の並びを決める。固定するのはテストだけ */
  seed?: number;
}>;

type Answered = Readonly<{ card: Card; question: Question; choice: number; correct: boolean }>;

/**
 * 出題の状態と、答え合わせ。**習熟度と成績の保存もここが呼ぶ。**
 *
 * why: 画面ごとに mount される。やり直しは保存を書き換えてから遷移すればよく、
 * ここに口を作らない（docs/02_architecture.md#やり直しは保存を書き換えて遷移する）
 *
 * why: 肢の並びは useMemo で今の 1 問に固定する。毎レンダリング組み直すと、
 * 選んでいる途中で並びが変わる
 */
export const useQuiz = (progress: Progress, { deck = DECK, seed }: QuizOptions = {}): Quiz => {
  const [rng] = useState(() => createRng(seed ?? Date.now()));
  const [state, setState] = useState<QuizState>(() => {
    const { boxes, answers } = progress.load();

    return createQuiz(deck, rng, boxes, answers);
  });
  const [selected, setSelected] = useState<number>();
  const [answered, setAnswered] = useState<Answered>();

  const key = currentKey(state);

  const asked = useMemo(() => {
    const card = key === undefined ? undefined : deck.find(({ id }) => id === cardIdOf(key));

    return card === undefined || key === undefined
      ? undefined
      : { card, question: buildQuestion(card, deck, directionOf(key), rng) };
  }, [deck, key, rng]);

  const answer = useCallback(() => {
    if (asked === undefined || selected === undefined) {
      return;
    }

    const correct = selected === asked.question.answer;
    const advanced = answerCurrent(state, correct, asked.question.choices[selected] ?? "");

    setAnswered({ ...asked, choice: selected, correct });
    setState(advanced);
    progress.save({ boxes: advanced.boxes, answers: advanced.answers });
  }, [asked, progress, selected, state]);

  const next = useCallback(() => {
    setAnswered(undefined);
    setSelected(undefined);
  }, []);

  const face = useMemo((): Face | undefined => {
    if (answered !== undefined) {
      return { side: "back", ...answered };
    }

    return asked === undefined
      ? undefined
      : { side: "question", ...asked, ...(selected === undefined ? {} : { selected }) };
  }, [answered, asked, selected]);

  return {
    counts: countsOf(state.boxes, deck),
    face,
    complete: isComplete(state),
    select: setSelected,
    answer,
    next,
  };
};
