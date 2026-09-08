import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { Card } from "../../atoms/Card/Card";
import { Text } from "../../atoms/Text/Text";
import { ThemeToggle } from "../../atoms/ThemeToggle/ThemeToggle";
import { QuizLayout } from "../QuizLayout/QuizLayout";
import { Corner } from "./Corner";

const meta = {
  title: "templates/Corner",
  component: Corner,
  parameters: { layout: "fullscreen" },
  args: { children: <ThemeToggle theme="light" onToggle={fn()} /> },
  /* 画面の隅に固定されるので、本文と重なっていないかを見る */
  decorators: [
    (Story) => (
      <>
        <QuizLayout>
          <Card>
            <Text variant="prose">画面の中身。隅の道具はこの上に重なる</Text>
          </Card>
        </QuizLayout>
        <Story />
      </>
    ),
  ],
} satisfies Meta<typeof Corner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 既定: Story = {};
