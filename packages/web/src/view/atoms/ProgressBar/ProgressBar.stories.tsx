import type { Meta, StoryObj } from "@storybook/react-vite";

import { ProgressBar } from "./ProgressBar";

/* 左から 正解 / 不正解 / 残り。数え方は docs/07_design.md#進捗バー */
const meta = {
  title: "atoms/ProgressBar",
  component: ProgressBar,
  parameters: { layout: "padded" },
  args: { counts: [48, 12, 72] },
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

export const まだ答えていない: Story = { args: { counts: [0, 0, 120] } };

export const 始めたばかり: Story = { args: { counts: [2, 1, 118] } };

/** 60 問に 1 度ずつ正解した。完了にはもう一周要るので、まだ半分残る */
export const 一周したところ: Story = { args: { counts: [60, 0, 60] } };

export const 不正解あり: Story = { args: { counts: [30, 25, 90] } };

export const 完了間近: Story = { args: { counts: [116, 22, 2] } };

export const 全問正解: Story = { args: { counts: [120, 0, 0] } };
