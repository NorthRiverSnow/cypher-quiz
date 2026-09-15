import { useNavigate } from "react-router";

import { useProgress } from "../controller/useProgress";
import { useResult } from "../controller/useResult";
import { ResultPage } from "../view/pages/ResultPage/ResultPage";
import type { ScreenProps } from "./screen";

export const ResultScreen = ({ notices, band }: ScreenProps) => {
  const navigate = useNavigate();
  const { counts, score, retryMissed } = useResult(useProgress(notices));

  return (
    <ResultPage
      notices={band}
      counts={counts}
      summary={{
        ...score,
        onOpenCard: ({ id, direction }) => void navigate(`/review/${id}/${direction}`),
        /* why: 何も消さずにスタートへ戻す。消すのは章を選んで開始したとき
           （docs/01_spec.md#スタート画面--出す章を選ぶ） */
        onRestart: () => void navigate("/"),
        onRetryMissed: () => {
          retryMissed();
          void navigate("/quiz");
        },
      }}
    />
  );
};
