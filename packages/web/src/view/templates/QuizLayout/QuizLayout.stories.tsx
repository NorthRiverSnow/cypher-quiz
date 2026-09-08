import type { Meta, StoryObj } from "@storybook/react-vite";

import { ProgressBar } from "../../atoms/ProgressBar/ProgressBar";
import { Card } from "../../atoms/Card/Card";
import { Text } from "../../atoms/Text/Text";
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
