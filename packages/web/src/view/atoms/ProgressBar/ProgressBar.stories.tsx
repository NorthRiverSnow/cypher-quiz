import type { Meta, StoryObj } from "@storybook/react-vite";

import { ProgressBar } from "./ProgressBar";

/* 30 枚 × 2 方向 = 60 問（docs/01_spec.md#2-出題形式） */
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

export const 始めたばかり: Story = { args: { counts: [60, 0, 0] } };

export const 完了: Story = { args: { counts: [0, 0, 60] } };

/* 誤答して box 0 に戻ったものがある状態 */
export const 差し戻しあり: Story = { args: { counts: [12, 20, 28] } };
