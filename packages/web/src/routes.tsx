import { type ReactNode, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router";

import { useGlobalErrors } from "./controller/useGlobalErrors";
import { useNotices } from "./controller/useNotices";
import { useTheme } from "./controller/useTheme";
import { OPTIONAL_MATCH, SET_REMOVE, WITH } from "./fixtures/cards";
import { ConnectScreen } from "./screens/ConnectScreen";
import { StartScreen } from "./screens/StartScreen";
import { ThemeToggle } from "./view/atoms/ThemeToggle/ThemeToggle";
import { NoticeList } from "./view/organisms/NoticeList/NoticeList";
import { QuizPage, type QuizFace } from "./view/pages/QuizPage/QuizPage";
import { ResultPage } from "./view/pages/ResultPage/ResultPage";
import { Corner } from "./view/templates/Corner/Corner";

/* URL とページの対応。ページは全状態を props で受ける純関数なので、遷移はここで
 * navigate に繋ぐ（docs/02_architecture.md#url-とページの対応）
 *
 * TODO: フェーズ D で状態を controller（useQuiz / useConnection）から受ける。
 * 今はここに置いた useState と fixtures の 3 枚で導線だけを通している
 */
const DECK = [OPTIONAL_MATCH, WITH, SET_REMOVE] as const;

type Slot = { notices: ReactNode };

const Quiz = ({ notices }: Slot) => {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number>();
  const [answered, setAnswered] = useState(false);
  const [draft, setDraft] = useState<string>();

  const card = DECK[index] ?? OPTIONAL_MATCH;
  const isLast = index === DECK.length - 1;

  const next = () => {
    setSelected(undefined);
    setAnswered(false);
    setDraft(undefined);
    if (isLast) {
      void navigate("/result");
      return;
    }
    setIndex(index + 1);
  };

  const face: QuizFace = answered
    ? {
        side: "back",
        back: {
          section: card.section,
          kind: "prose",
          chosen: card.choices[selected ?? card.answer] ?? "",
          correct: card.role,
          code: card.code,
          expected: card.expected,
          note: card.note,
          warn: card.warn,
          editor:
            card.code === undefined
              ? undefined
              : {
                  value: draft,
                  onChange: setDraft,
                  onRun: () => undefined,
                  onReset: () => setDraft(undefined),
                  status: "offline",
                },
          onNext: next,
          isLast,
        },
      }
    : {
        side: "question",
        question: {
          section: card.section,
          direction: "forward",
          prompt: card.name,
          choices: card.choices,
          selected,
          onSelect: setSelected,
          onAnswer: () => setAnswered(true),
        },
      };

  const done = index + (answered ? 1 : 0);

  return <QuizPage notices={notices} counts={[DECK.length - done, 0, done]} face={face} />;
};

const Result = ({ notices }: Slot) => {
  const navigate = useNavigate();

  return (
    <ResultPage
      notices={notices}
      counts={[0, 0, DECK.length]}
      summary={{
        asked: DECK.length,
        correct: DECK.length,
        bySection: DECK.map((card) => ({ section: card.section, asked: 1, correct: 1 })),
        missed: [],
        onOpenCard: () => void navigate("/quiz"),
        onRestart: () => void navigate("/quiz"),
        onRetryMissed: () => void navigate("/quiz"),
      }}
    />
  );
};

export const AppRoutes = () => {
  const [theme, toggleTheme] = useTheme();
  const notices = useNotices();

  useGlobalErrors(notices);

  const band = <NoticeList items={notices.items} onDismiss={notices.dismiss} />;

  return (
    <>
      <Corner>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </Corner>
      <Routes>
        <Route path="/" element={<StartScreen notices={notices} band={band} />} />
        <Route path="/connect" element={<ConnectScreen notices={notices} band={band} />} />
        <Route path="/quiz" element={<Quiz notices={band} />} />
        <Route path="/result" element={<Result notices={band} />} />
        {/* why: 知らない URL はスタートへ送る。空白の画面を出さない */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};
