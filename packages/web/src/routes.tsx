import { Navigate, Route, Routes } from "react-router";

import { useGlobalErrors } from "./controller/useGlobalErrors";
import { useNotices } from "./controller/useNotices";
import { useTheme } from "./controller/useTheme";
import type { QuizOptions } from "./controller/useQuiz";
import { ConnectScreen } from "./screens/ConnectScreen";
import { QuizScreen } from "./screens/QuizScreen";
import { ResultScreen } from "./screens/ResultScreen";
import { ReviewScreen } from "./screens/ReviewScreen";
import { StartScreen } from "./screens/StartScreen";
import { ThemeToggle } from "./view/atoms/ThemeToggle/ThemeToggle";
import { NoticeList } from "./view/organisms/NoticeList/NoticeList";
import { Corner } from "./view/templates/Corner/Corner";

/* URL と画面の対応（docs/02_architecture.md#url-とページの対応）。
 * 画面が hook を呼び、ページは props だけを受ける */
/* why: 出題を固定できるようにする。渡すのはテストだけ */
export type AppRoutesProps = Readonly<{ quiz?: QuizOptions }>;

export const AppRoutes = ({ quiz }: AppRoutesProps = {}) => {
  const [theme, toggleTheme] = useTheme();
  const notices = useNotices();

  useGlobalErrors(notices);

  /* why: 帯はここで 1 度だけ組む。画面ごとに組むと同じ JSX が 5 つ並ぶ */
  const band = <NoticeList items={notices.items} onDismiss={notices.dismiss} />;
  const slot = { notices, band };

  return (
    <>
      <Corner>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </Corner>
      <Routes>
        <Route path="/" element={<StartScreen {...slot} />} />
        <Route path="/connect" element={<ConnectScreen {...slot} />} />
        <Route path="/quiz" element={<QuizScreen {...slot} {...quiz} />} />
        <Route path="/result" element={<ResultScreen {...slot} />} />
        <Route path="/review/:cardId/:direction" element={<ReviewScreen {...slot} />} />
        {/* why: 知らない URL はスタートへ送る。空白の画面を出さない */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};
