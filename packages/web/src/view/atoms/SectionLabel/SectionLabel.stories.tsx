import type { Meta, StoryObj } from "@storybook/react-vite";

import { SectionLabel } from "./SectionLabel";

const meta = {
  title: "atoms/SectionLabel",
  component: SectionLabel,
  parameters: { layout: "padded" },
  args: { children: "読み取りの骨格" },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "var(--col)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SectionLabel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 既定: Story = {};

/* 罫線が残りを埋めるので、ラベルが長いと罫線が短くなる */
export const 長いラベル: Story = { args: { children: "サブクエリ・スキーマ・診断" } };
