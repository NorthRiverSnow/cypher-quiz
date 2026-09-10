import { useNavigate } from "react-router";

import { useProgress } from "../controller/useProgress";
import { useQuiz } from "../controller/useQuiz";
import { StartPage } from "../view/pages/StartPage/StartPage";
import type { ScreenProps } from "./screen";

/* why: 全て box 0 は「まだ何もしていない」と同じ。残り 60 問と出しても情報を持たない
   （docs/01_spec.md#7-画面と導線） */
const remainingOf = ([left, learning, done]: readonly [number, number, number]) =>
  learning + done === 0 ? undefined : left + learning;

export const StartScreen = ({ notices, band }: ScreenProps) => {
  const navigate = useNavigate();
  const progress = useProgress(notices);
  const { counts } = useQuiz(progress);
  const remaining = remainingOf(counts);

  return (
    <StartPage
      notices={band}
      onStart={() => void navigate("/connect")}
      {...(remaining === undefined ? {} : { remaining })}
    />
  );
};
