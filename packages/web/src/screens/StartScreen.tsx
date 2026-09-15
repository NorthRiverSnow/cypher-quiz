import { useNavigate } from "react-router";

import { useProgress } from "../controller/useProgress";
import { HAS_API } from "../env";
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
      canRunQuery={HAS_API}
      onStart={() => {
        start();
        /* why: api が居なければ接続画面を出さない。繋ぐ先が無いので、出しても進むしかない */
        void navigate(HAS_API ? "/connect" : "/quiz");
      }}
    />
  );
};
