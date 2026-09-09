import type { ReactNode } from "react";

import { ConnectForm, type ConnectFormProps } from "../../organisms/ConnectForm/ConnectForm";
import { QuizLayout } from "../../templates/QuizLayout/QuizLayout";

export type ConnectPageProps = ConnectFormProps & { notices?: ReactNode };

export const ConnectPage = ({ notices, ...props }: ConnectPageProps) => (
  <QuizLayout notices={notices}>
    <ConnectForm {...props} />
  </QuizLayout>
);
