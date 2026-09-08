import type { CSSProperties, ReactNode } from "react";

export type QuizLayoutProps = {
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

export const QuizLayout = ({ progress, children }: QuizLayoutProps) => (
  <div style={PAGE}>
    <div style={COLUMN}>
      {progress}
      {children}
    </div>
  </div>
);
