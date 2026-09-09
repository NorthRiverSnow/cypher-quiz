import type { CSSProperties, ReactNode } from "react";

export type QuizLayoutProps = {
  notices?: ReactNode;
  progress?: ReactNode;
  children: ReactNode;
};

const PAGE: CSSProperties = { padding: "var(--space-xl) var(--space-md)" };

const COLUMN: CSSProperties = {
  maxWidth: "var(--col)",
  margin: "0 auto",
  display: "grid",
  gap: "var(--space-lg)",
};

export const QuizLayout = ({ notices, progress, children }: QuizLayoutProps) => (
  <div style={PAGE}>
    <div style={COLUMN}>
      {notices}
      {progress}
      {children}
    </div>
  </div>
);
