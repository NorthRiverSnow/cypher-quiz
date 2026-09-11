import type { ReactNode } from "react";

import type { Direction, SectionId } from "../../../types";
import { Text } from "../../atoms/Text/Text";
import { CardBack, type CardBackProps } from "../../organisms/CardBack/CardBack";
import { CHOICE_KIND, PROMPT_VARIANT } from "../../organisms/FlashCard/FlashCard";
import { QuizLayout } from "../../templates/QuizLayout/QuizLayout";

export type ReviewPageProps = {
  notices?: ReactNode;
  section: SectionId;
  direction: Direction;
  /** 表に出ていた設問 */
  prompt: string;
  /** 裏の中身。書体は direction から決まるので受けない */
  back: Omit<CardBackProps, "header" | "isLast" | "kind" | "nextLabel" | "onNext" | "section">;
  onBack: () => void;
};

const GROUP = { display: "grid", gap: "var(--space-xs)" } as const;

/* why: 進捗バーを出さない。解き直しではないので、残り枚数は判断に使えない
   （docs/01_spec.md#復習の画面） */
export const ReviewPage = ({
  notices,
  section,
  direction,
  prompt,
  back,
  onBack,
}: ReviewPageProps) => (
  <QuizLayout notices={notices}>
    <CardBack
      {...back}
      section={section}
      kind={CHOICE_KIND[direction]}
      header={
        /* why: 裏だけでは何を問われたか分からない。出題のときと同じ書体で設問を置く */
        <div style={GROUP}>
          <Text variant="micro" tone="muted">
            問題
          </Text>
          <Text as="h1" variant={PROMPT_VARIANT[direction]}>
            {prompt}
          </Text>
        </div>
      }
      onNext={onBack}
      nextLabel="結果に戻る"
    />
  </QuizLayout>
);
