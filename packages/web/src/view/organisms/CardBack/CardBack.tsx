import type { CSSProperties } from "react";

import { SECTION_LABELS, type SectionId } from "../../../types";
import { CodeBlock, type CodeSegment } from "../../atoms/CodeBlock/CodeBlock";
import { Card } from "../../atoms/Card/Card";
import { Icon, type IconName } from "../../atoms/Icon/Icon";
import { ResultBlock } from "../../atoms/ResultBlock/ResultBlock";
import { SectionLabel } from "../../atoms/SectionLabel/SectionLabel";
import { TEXT, Text } from "../../atoms/Text/Text";
import type { ChoiceKind } from "../../molecules/ChoiceList/ChoiceList";
import { Note } from "../../molecules/Note/Note";
import { QueryEditor, type QueryEditorProps } from "../../molecules/QueryEditor/QueryEditor";

export type CardBackProps = {
  section: SectionId;
  kind: ChoiceKind;
  chosen: string;
  correct: string;
  code?: readonly CodeSegment[];
  expected?: string;
  note?: string;
  warn?: string;
  /* why: 実行できるカードだけ渡す。渡さなければ枠付きのコードを出すだけにする。
     構文列挙のみの 5 枚と書き込み系の 5 枚は実行させない
     （docs/01_spec.md#4-クエリの実行と編集） */
  editor?: Omit<QueryEditorProps, "code">;
};

const STACK: CSSProperties = { display: "grid", gap: "var(--space-md)" };

const GROUP: CSSProperties = { display: "grid", gap: "var(--space-xs)" };

const MARKED: CSSProperties = { display: "flex", alignItems: "flex-start", gap: "var(--space-xs)" };

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
}: CardBackProps) => {
  /* why: 正誤を props で受けない。受けると「正答なのに違う肢を正しいと出す」組み合わせが作れる */
  const isCorrect = chosen === correct;
  const verdictTone = isCorrect ? "keep" : "alarm";

  return (
    <Card>
      <div style={STACK}>
        <SectionLabel>{SECTION_LABELS[section]}</SectionLabel>

        <div style={GROUP}>
          {/* why: 誤答のときは肢が 2 つ並ぶので、正解の側にも見出しを付ける */}
          {/* why: 文字を出さず記号だけにする。読み上げには label が要る */}
          <Icon
            name={isCorrect ? "radio_button_unchecked" : "close"}
            label={isCorrect ? "正答" : "誤答"}
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
        {expected !== undefined && <ResultBlock>{expected}</ResultBlock>}
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
      </div>
    </Card>
  );
};
