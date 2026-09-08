import type { Meta, StoryObj } from "@storybook/react-vite";

import { Card } from "./Card";

const meta = {
  title: "atoms/Card",
  component: Card,
  parameters: { layout: "padded" },
  args: {
    children: "1px の罫線、4px の角丸、極めて淡い影。アプリ UI ではなく編集物の佇まい。",
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "var(--col)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 既定: Story = {};
