import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";

import "./styles";
import { AppRoutes } from "./routes";
import { ErrorScreen } from "./view/organisms/ErrorScreen/ErrorScreen";
import { ErrorBoundary } from "./view/templates/ErrorBoundary/ErrorBoundary";
import { QuizLayout } from "./view/templates/QuizLayout/QuizLayout";

const el = document.getElementById("root");
if (!el) throw new Error("#root が無い");

createRoot(el).render(
  <StrictMode>
    <ErrorBoundary
      fallback={(error) => (
        <QuizLayout>
          <ErrorScreen message={error.message} onReload={() => window.location.reload()} />
        </QuizLayout>
      )}
    >
      {/* why: GitHub Pages は SPA のフォールバックを持たない。`/quiz` を直に開くと 404 になり、
          `404.html` を置く手も、消えたアセットの要求に HTML が返って白い画面になる
          （docs/04_roadmap.md#フェーズ-f--配る） */}
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>,
);
