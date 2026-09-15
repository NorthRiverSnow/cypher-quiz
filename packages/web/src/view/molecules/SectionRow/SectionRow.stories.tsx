import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { SectionRow } from "./SectionRow";

/* 状態の文言は docs/01_spec.md#7-画面と導線 */
const meta = {
  title: "molecules/SectionRow",
  component: SectionRow,
  parameters: { layout: "padded" },
  args: { label: "読み取りの骨格", status: "0 / 10", checked: false, onToggle: fn() },
  decorators: [
    /* why: 面を --panel にする。行はカードの中に置かれ、--ground の上では
       「成績をリセット」の赤が 4.40 まで下がって AA を切る */
    (Story) => (
      <div style={{ maxWidth: "var(--col)", background: "var(--panel)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SectionRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 未着手: Story = {};

export const 選択中: Story = { args: { checked: true } };

export const 進行中: Story = { args: { status: "進行中", onReset: fn() } };

export const 完了: Story = { args: { status: "8 / 10", onReset: fn() } };

export const 全て: Story = { args: { label: "全て", status: "60 問・最初から" } };

/* 一覧で最も長い章名。状態が行の外へ出ないこと */
export const 長い章名: Story = {
  args: { label: "サブクエリ・スキーマ・診断", status: "8 / 8", onReset: fn() },
};
