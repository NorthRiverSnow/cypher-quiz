import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const el = document.getElementById('root');
if (!el) throw new Error('#root が無い');

createRoot(el).render(
  <StrictMode>
    <p>足場のみ。画面はフェーズ A で Storybook から組む。</p>
  </StrictMode>,
);
