import type { ReactNode } from "react";

import { ProgressBar, type ProgressBarProps } from "../../atoms/ProgressBar/ProgressBar";
import { CardBack, type CardBackProps } from "../../organisms/CardBack/CardBack";
import { FlashCard, type FlashCardProps } from "../../organisms/FlashCard/FlashCard";
import { QuizLayout } from "../../templates/QuizLayout/QuizLayout";

export type QuizFace =
  | { side: "question"; question: FlashCardProps }
  | { side: "back"; back: CardBackProps };

export type QuizPageProps = {
  notices?: ReactNode;
  counts: ProgressBarProps["counts"];
  face: QuizFace;
};

export const QuizPage = ({ notices, counts, face }: QuizPageProps) => (
  <QuizLayout notices={notices} progress={<ProgressBar counts={counts} />}>
    {face.side === "question" ? <FlashCard {...face.question} /> : <CardBack {...face.back} />}
  </QuizLayout>
);
