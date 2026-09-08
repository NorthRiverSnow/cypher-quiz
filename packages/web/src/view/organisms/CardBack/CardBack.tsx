import type { CSSProperties } from "react";

import { SECTION_LABELS, type SectionId } from "../../../types";
import { Button } from "../../atoms/Button/Button";
import { CodeBlock, type CodeSegment } from "../../atoms/CodeBlock/CodeBlock";
import { Card } from "../../atoms/Card/Card";
import { Icon, type IconName } from "../../atoms/Icon/Icon";
import { ResultBlock } from "../../atoms/ResultBlock/ResultBlock";
import { SectionLabel } from "../../atoms/SectionLabel/SectionLabel";
import { TEXT, Text } from "../../atoms/Text/Text";
import type { ChoiceKind } from "../../molecules/ChoiceList/ChoiceList";
import { Note } from "../../molecules/Note/Note";
import { QueryEditor, type QueryEditorProps } from "../../molecules/QueryEditor/QueryEditor";
import { ResultTable, type ResultTableProps } from "../../molecules/ResultTable/ResultTable";

export type CardBackProps = {
  section: SectionId;
  kind: ChoiceKind;
  chosen: string;
  correct: string;
  code?: readonly CodeSegment[];
  expected?: string;
  note?: string;
  warn?: string;
  editor?: Omit<QueryEditorProps, "code">;
  /** 実行して返ってきた行。期待される実行結果とは別に、下へ積む */
  result?: ResultTableProps;
  onNext: () => void;
  /** 最後の 1 枚なら進む先は結果。残っていれば次のカード */
  isLast?: boolean;
};

const STACK: CSSProperties = { display: "grid", gap: "var(--space-md)" };

const GROUP: CSSProperties = { display: "grid", gap: "var(--space-xs)" };

const MARKED: CSSProperties = { display: "flex", alignItems: "flex-start", gap: "var(--space-xs)" };

const ACTIONS: CSSProperties = { display: "flex", justifyContent: "flex-end" };

type AnswerProps = {
  icon: IconName;
  tone: "keep" | "alarm";
  kind: ChoiceKind;
  children: string;
};

/* why: マークを本文の 1 行と同じ高さの箱に入れて中央寄せする。
   箱は Text の外なので、高さは段階表から計算する */
const Answer = ({ icon, tone, kind, children }: AnswerProps) => (
  <div style={MARKED}>
    <span
      style={{
        flex: "none",
        display: "grid",
        placeItems: "center",
        height: `calc(${TEXT[kind].fontSize} * ${TEXT[kind].lineHeight})`,
      }}
    >
      <Icon name={icon} size="1rem" color={`var(--${tone})`} />
    </span>
    <Text variant={kind} tone={tone}>
      {children}
    </Text>
  </div>
);

export const CardBack = ({
  section,
  kind,
  chosen,
  correct,
  code,
  expected,
  note,
  warn,
  editor,
  result,
  onNext,
  isLast = false,
}: CardBackProps) => {
  /* why: 正誤を props で受けない。受けると「正解なのに違う肢を正しいと出す」組み合わせが作れる */
  const isCorrect = chosen === correct;
  const verdictTone = isCorrect ? "keep" : "alarm";

  return (
    <Card>
      <div style={STACK}>
        <SectionLabel>{SECTION_LABELS[section]}</SectionLabel>

        <div style={GROUP}>
          {/* why: 記号だけなので、読み上げの名前を label で与える */}
          <Icon
            name={isCorrect ? "radio_button_unchecked" : "close"}
            label={isCorrect ? "正解" : "不正解"}
            size="2rem"
            color={`var(--${verdictTone})`}
          />
          {!isCorrect && (
            <Text variant="micro" tone="muted">
              正しい肢
            </Text>
          )}
          <Answer icon="radio_button_unchecked" tone="keep" kind={kind}>
            {correct}
          </Answer>
        </div>

        {!isCorrect && (
          <div style={GROUP}>
            <Text variant="micro" tone="muted">
              選んだ肢
            </Text>
            <Answer icon="close" tone="alarm" kind={kind}>
              {chosen}
            </Answer>
          </div>
        )}

        {code !== undefined &&
          (editor === undefined ? (
            <CodeBlock code={code} />
          ) : (
            <QueryEditor code={code} {...editor} />
          ))}
        {expected !== undefined && (
          <div style={GROUP}>
            <Text variant="micro" tone="muted">
              期待される実行結果
            </Text>
            <ResultBlock>{expected}</ResultBlock>
          </div>
        )}
        {result !== undefined && (
          <div style={GROUP}>
            <Text variant="micro" tone="muted">
              実行結果
            </Text>
            <ResultTable {...result} />
          </div>
        )}
        {note !== undefined && (
          <Text variant="prose" tone="soft">
            {note}
          </Text>
        )}
        {warn !== undefined && (
          <Note tone="warn" icon="warning" iconLabel="罠">
            {warn}
          </Note>
        )}

        <div style={ACTIONS}>
          <Button onClick={onNext}>{isLast ? "結果を見る" : "次の問題"}</Button>
        </div>
      </div>
    </Card>
  );
};
