import { useNavigate } from "react-router";

import { useProgress } from "../controller/useProgress";
import { useQuiz } from "../controller/useQuiz";
import { StartPage } from "../view/pages/StartPage/StartPage";
import type { ScreenProps } from "./screen";

export const StartScreen = ({ notices, band }: ScreenProps) => {
  const navigate = useNavigate();
  const progress = useProgress(notices);
  const { remaining } = useQuiz(progress);

  return (
    <StartPage
      notices={band}
      onStart={() => void navigate("/connect")}
      {...(remaining === undefined ? {} : { remaining })}
    />
  );
};
