import { ProgressBar, type ProgressBarProps } from "../../atoms/ProgressBar/ProgressBar";
import { Summary, type SummaryProps } from "../../organisms/Summary/Summary";
import { QuizLayout } from "../../templates/QuizLayout/QuizLayout";

export type ResultPageProps = {
  counts: ProgressBarProps["counts"];
  summary: SummaryProps;
};

export const ResultPage = ({ counts, summary }: ResultPageProps) => (
  <QuizLayout progress={<ProgressBar counts={counts} />}>
    <Summary {...summary} />
  </QuizLayout>
);
