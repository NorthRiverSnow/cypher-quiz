import { useNavigate } from "react-router";

import { useProgress } from "../controller/useProgress";
import { useResult } from "../controller/useResult";
import { ResultPage } from "../view/pages/ResultPage/ResultPage";
import type { ScreenProps } from "./screen";

export const ResultScreen = ({ notices, band }: ScreenProps) => {
  const navigate = useNavigate();
  const { counts, score, restart, retryMissed } = useResult(useProgress(notices));

  /* why: 保存を書き換えてから遷移する。次の QuizScreen がそれを読んで組み直す
     （docs/02_architecture.md#やり直しは保存を書き換えて遷移する） */
  const restartWith = (write: () => void) => () => {
    write();
    void navigate("/quiz");
  };

  return (
    <ResultPage
      notices={band}
      counts={counts}
      summary={{
        ...score,
        onOpenCard: ({ id, direction }) => void navigate(`/review/${id}/${direction}`),
        onRestart: restartWith(restart),
        onRetryMissed: restartWith(retryMissed),
      }}
    />
  );
};
