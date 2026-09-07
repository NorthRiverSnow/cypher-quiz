import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

const el = document.getElementById("root");
if (!el) throw new Error("#root が無い");

createRoot(el).render(
  <StrictMode>
    {/* TODO: フェーズ D で controller と繋いで pages/QuizScreen を描く */}
    <p>足場のみ</p>
  </StrictMode>,
);
