import type { CSSProperties } from "react";

import { Button } from "../../atoms/Button/Button";
import { Card } from "../../atoms/Card/Card";
import { Text } from "../../atoms/Text/Text";
import { QuizLayout } from "../../templates/QuizLayout/QuizLayout";

export type StartPageProps = {
  onStart: () => void;
  /* 前回の続きがあるときの残り問題数。無い（未着手）なら渡さない */
  remaining?: number;
};

const STACK: CSSProperties = { display: "grid", gap: "var(--space-md)" };

/* why: 見出しと本文の 2 列を一覧が持ち、行は subgrid でそれを使う。行ごとに列を組むと
   見出しの幅が行ごとに決まり、本文の左端が揃わない */
const POINTS: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  rowGap: "var(--space-xs)",
  columnGap: "var(--space-sm)",
};

const POINT: CSSProperties = {
  display: "grid",
  gridColumn: "1 / -1",
  gridTemplateColumns: "subgrid",
  alignItems: "baseline",
};

const ACTIONS: CSSProperties = { display: "flex", justifyContent: "flex-end" };

const POINT_ITEMS: readonly { key: string; text: string }[] = [
  { key: "60 問", text: "30 枚のカードを、構文 → 目的と目的 → 構文の両方で出します" },
  { key: "4 択", text: "2 回続けて正解すると完了。不正解はそのセッション中にもう一度出ます" },
  { key: "任意", text: "DB に繋ぐと、裏面のサンプルクエリを編集して実行できます" },
];

export const StartPage = ({ onStart, remaining }: StartPageProps) => (
  <QuizLayout>
    <Card>
      <div style={STACK}>
        <Text as="h1" variant="display">
          Cypher クイズ
        </Text>
        <Text variant="annotation" tone="soft">
          NordWind ワークショップの Cypher 教材から、30 枚のカードを 4 択で解きます。
        </Text>

        <div style={POINTS}>
          {POINT_ITEMS.map((item) => (
            <div key={item.key} style={POINT}>
              <Text variant="micro" tone="accent">
                {item.key}
              </Text>
              <Text variant="annotation" tone="soft">
                {item.text}
              </Text>
            </div>
          ))}
        </div>

        <div style={ACTIONS}>
          <Button onClick={onStart}>
            {remaining === undefined ? "クイズスタート！" : `続きから（残り ${remaining} 問）`}
          </Button>
        </div>
      </div>
    </Card>
  </QuizLayout>
);
