import { useState } from "react";
import { Navigate, useNavigate } from "react-router";

import { useConnection } from "../controller/useConnection";
import { useProgress } from "../controller/useProgress";
import { type QuizOptions, useQuiz } from "../controller/useQuiz";
import { useRun } from "../controller/useRun";
import { QuizPage, type QuizFace } from "../view/pages/QuizPage/QuizPage";
import type { ScreenProps } from "./screen";

/* why: 出題順と肢の並びを固定し、少ない枚数で完了まで進められるようにする。
   渡すのはテストだけ（useQuiz の同名の引数と同じ理由） */
export type QuizScreenProps = ScreenProps & QuizOptions;

export const QuizScreen = ({ notices, band, ...options }: QuizScreenProps) => {
  const navigate = useNavigate();
  const progress = useProgress(notices);
  const quiz = useQuiz(progress, options);
  const { status } = useConnection(notices);
  const run = useRun(notices, status?.connected === true);
  /* why: 編集中の本文は画面が持つ。次のカードへ進むたびに捨てる */
  const [draft, setDraft] = useState<string>();

  const { face } = quiz;

  /* why: 章を選ばずに来たらスタートへ返す。結果へ送ると 0 問のサマリが出る */
  if (quiz.empty) {
    return <Navigate to="/" replace />;
  }

  /* why: 出題が尽きたら結果へ。effect で送ると 1 度空の画面が描かれる */
  if (face === undefined) {
    return <Navigate to="/result" replace />;
  }

  const next = () => {
    setDraft(undefined);
    run.reset();
    quiz.next();
  };

  const shown: QuizFace =
    face.side === "question"
      ? {
          side: "question",
          question: {
            section: face.card.section,
            direction: face.question.direction,
            prompt: face.question.prompt,
            choices: face.question.choices,
            ...(face.selected === undefined ? {} : { selected: face.selected }),
            onSelect: quiz.select,
            onAnswer: quiz.answer,
          },
        }
      : {
          side: "back",
          back: {
            section: face.card.section,
            kind: face.question.direction === "forward" ? "prose" : "syntax",
            chosen: face.question.choices[face.choice] ?? "",
            correct: face.question.choices[face.question.answer] ?? "",
            ...(face.card.code === undefined ? {} : { code: face.card.code }),
            ...(face.card.expected === undefined ? {} : { expected: face.card.expected }),
            ...(face.card.note === undefined ? {} : { note: face.card.note }),
            ...(face.card.warn === undefined ? {} : { warn: face.card.warn }),
            ...(!face.card.mutates && face.cypher !== undefined
              ? {
                  editor: {
                    ...(draft === undefined ? {} : { value: draft }),
                    onChange: setDraft,
                    onEdit: () => setDraft(face.cypher ?? ""),
                    onRun: () => void run.run(draft ?? face.cypher ?? ""),
                    onReset: () => setDraft(undefined),
                    status: run.status,
                    listing: face.card.listing ?? false,
                    ...(run.errorMessage === undefined ? {} : { errorMessage: run.errorMessage }),
                  },
                }
              : {}),
            ...(run.result === undefined ? {} : { result: run.result }),
            onNext: quiz.complete ? () => void navigate("/result") : next,
            isLast: quiz.complete,
          },
        };

  return <QuizPage notices={band} counts={quiz.counts} face={shown} />;
};
