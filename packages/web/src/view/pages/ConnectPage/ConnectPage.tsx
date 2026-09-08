import { ConnectForm, type ConnectFormProps } from "../../organisms/ConnectForm/ConnectForm";
import { QuizLayout } from "../../templates/QuizLayout/QuizLayout";

export type ConnectPageProps = ConnectFormProps;

export const ConnectPage = (props: ConnectPageProps) => (
  <QuizLayout>
    <ConnectForm {...props} />
  </QuizLayout>
);
