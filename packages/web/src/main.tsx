import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

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
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
