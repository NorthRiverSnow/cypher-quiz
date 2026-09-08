import { ProgressBar, type ProgressBarProps } from "../../atoms/ProgressBar/ProgressBar";
import { CardBack, type CardBackProps } from "../../organisms/CardBack/CardBack";
import { FlashCard, type FlashCardProps } from "../../organisms/FlashCard/FlashCard";
import { QuizLayout } from "../../templates/QuizLayout/QuizLayout";

export type QuizFace =
  | { side: "question"; question: FlashCardProps }
  | { side: "back"; back: CardBackProps };

export type QuizPageProps = {
  counts: ProgressBarProps["counts"];
  face: QuizFace;
};

export const QuizPage = ({ counts, face }: QuizPageProps) => (
  <QuizLayout progress={<ProgressBar counts={counts} />}>
    {face.side === "question" ? <FlashCard {...face.question} /> : <CardBack {...face.back} />}
  </QuizLayout>
);
