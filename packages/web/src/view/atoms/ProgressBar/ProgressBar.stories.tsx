import type { Meta, StoryObj } from "@storybook/react-vite";

import { ProgressBar } from "./ProgressBar";

/* 30 枚 × 2 方向 = 60 問。左から 正解 / 不正解 / まだ（docs/07_design.md#進捗バー） */
const meta = {
  title: "atoms/ProgressBar",
  component: ProgressBar,
  parameters: { layout: "padded" },
  args: { counts: [38, 14, 8] },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "var(--col)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProgressBar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 既定: Story = {};

export const まだ答えていない: Story = { args: { counts: [0, 0, 60] } };

export const 始めたばかり: Story = { args: { counts: [2, 1, 57] } };

export const 不正解あり: Story = { args: { counts: [12, 20, 28] } };

export const 全問答えた: Story = { args: { counts: [48, 12, 0] } };

export const 全問正解: Story = { args: { counts: [60, 0, 0] } };
