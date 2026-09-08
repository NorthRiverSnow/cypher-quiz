import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import "./styles";
import { AppRoutes } from "./routes";

const el = document.getElementById("root");
if (!el) throw new Error("#root が無い");

createRoot(el).render(
  <StrictMode>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </StrictMode>,
);
