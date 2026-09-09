import type { ReactNode } from "react";

import { ProgressBar, type ProgressBarProps } from "../../atoms/ProgressBar/ProgressBar";
import { Summary, type SummaryProps } from "../../organisms/Summary/Summary";
import { QuizLayout } from "../../templates/QuizLayout/QuizLayout";

export type ResultPageProps = {
  notices?: ReactNode;
  counts: ProgressBarProps["counts"];
  summary: SummaryProps;
};

export const ResultPage = ({ notices, counts, summary }: ResultPageProps) => (
  <QuizLayout notices={notices} progress={<ProgressBar counts={counts} />}>
    <Summary {...summary} />
  </QuizLayout>
);
