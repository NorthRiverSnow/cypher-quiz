import type { Meta, StoryObj } from "@storybook/react-vite";

import { ProgressBar } from "../../atoms/ProgressBar/ProgressBar";
import { Card } from "../../atoms/Card/Card";
import { Text } from "../../atoms/Text/Text";
import { NoticeList } from "../../organisms/NoticeList/NoticeList";
import { QuizLayout } from "./QuizLayout";

const meta = {
  title: "templates/QuizLayout",
  component: QuizLayout,
  parameters: { layout: "fullscreen" },
  args: {
    progress: <ProgressBar counts={[38, 14, 8]} />,
    children: (
      <Card>
        <Text variant="prose">画面の中身が入る場所</Text>
      </Card>
    ),
  },
} satisfies Meta<typeof QuizLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 既定: Story = {};

/* 縦に積む間隔を見る。中身が 2 枚になる画面は無いが、間隔は枚数に依らない */
export const 中身が複数: Story = {
  args: {
    children: (
      <>
        <Card>
          <Text variant="prose">1 枚目</Text>
        </Card>
        <Card>
          <Text variant="prose">2 枚目</Text>
        </Card>
      </>
    ),
  },
};

export const 通知あり: Story = {
  args: {
    notices: (
      <NoticeList
        items={[{ kind: "progress-save", tone: "warn", title: "進捗を保存できません" }]}
        onDismiss={() => {}}
      />
    ),
  },
};

export const 通知が複数: Story = {
  args: {
    notices: (
      <NoticeList
        items={[
          {
            kind: "run",
            tone: "alarm",
            title: "クエリを実行できません",
            detail: "Variable e.nam not defined (line 2, column 8)",
          },
          { kind: "progress-save", tone: "warn", title: "進捗を保存できません" },
        ]}
        onDismiss={() => {}}
      />
    ),
  },
};
