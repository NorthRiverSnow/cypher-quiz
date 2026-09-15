import { useNavigate } from "react-router";

import { useProgress } from "../controller/useProgress";
import { useStart } from "../controller/useStart";
import { StartPage } from "../view/pages/StartPage/StartPage";
import type { ScreenProps } from "./screen";

export const StartScreen = ({ notices, band }: ScreenProps) => {
  const navigate = useNavigate();
  const progress = useProgress(notices);
  const { sections, allStatus, toggle, toggleAll, canStart, start } = useStart(progress);

  return (
    <StartPage
      notices={band}
      picker={{ sections, allStatus, onToggle: toggle, onToggleAll: toggleAll }}
      canStart={canStart}
      onStart={() => {
        start();
        void navigate("/connect");
      }}
    />
  );
};
