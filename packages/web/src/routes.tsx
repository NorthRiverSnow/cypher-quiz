import { useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router";

import { OPTIONAL_MATCH, SET_REMOVE, WITH } from "./fixtures/cards";
import type { ConnectInput } from "./view/organisms/ConnectForm/ConnectForm";
import { ConnectPage } from "./view/pages/ConnectPage/ConnectPage";
import { QuizPage, type QuizFace } from "./view/pages/QuizPage/QuizPage";
import { ResultPage } from "./view/pages/ResultPage/ResultPage";
import { StartPage } from "./view/pages/StartPage/StartPage";

/* URL とページの対応。ページは全状態を props で受ける純関数なので、遷移はここで
 * navigate に繋ぐ（docs/02_architecture.md#url-とページの対応）
 *
 * TODO: フェーズ D で状態を controller（useQuiz / useConnection）から受ける。
 * 今はここに置いた useState と fixtures の 3 枚で導線だけを通している
 */
const DECK = [OPTIONAL_MATCH, WITH, SET_REMOVE] as const;

const EMPTY: ConnectInput = { uri: "", user: "", password: "", database: "" };

const Start = () => {
  const navigate = useNavigate();

  return <StartPage onStart={() => void navigate("/connect")} />;
};

const Connect = () => {
  const navigate = useNavigate();
  const [values, setValues] = useState<ConnectInput>(EMPTY);

  return (
    <ConnectPage
      values={values}
      onChange={(field, value) => setValues((prev) => ({ ...prev, [field]: value }))}
      onConnect={() => void navigate("/quiz")}
      onStart={() => void navigate("/quiz")}
      onDisconnect={() => setValues(EMPTY)}
    />
  );
};

const Quiz = () => {
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
          /* 実行はバックエンド待ち。編集はできるが実行はできない状態を出す */
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

  return <QuizPage counts={[DECK.length - done, 0, done]} face={face} />;
};

const Result = () => {
  const navigate = useNavigate();

  return (
    <ResultPage
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

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Start />} />
    <Route path="/connect" element={<Connect />} />
    <Route path="/quiz" element={<Quiz />} />
    <Route path="/result" element={<Result />} />
    {/* why: 知らない URL はスタートへ送る。空白の画面を出さない */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
