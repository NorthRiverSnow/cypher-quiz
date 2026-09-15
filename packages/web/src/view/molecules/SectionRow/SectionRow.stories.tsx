import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { Card } from "../../atoms/Card/Card";
import { SectionRow } from "./SectionRow";

/* 状態の文言は docs/01_spec.md#7-画面と導線 */
const meta = {
  title: "molecules/SectionRow",
  component: SectionRow,
  parameters: { layout: "padded" },
  args: { label: "読み取りの骨格", status: "0 / 10", checked: false, onToggle: fn() },
  decorators: [
    /* why: Card に入れて撮る。行は必ずカードの中に置かれ、面の色で文字のコントラストが変わる */
    (Story) => (
      <div style={{ maxWidth: "var(--col)" }}>
        <Card>
          <Story />
        </Card>
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
