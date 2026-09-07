import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { Button } from "./Button";

const meta = {
  title: "atoms/Button",
  component: Button,
  parameters: { layout: "padded" },
  args: { children: "決定", onClick: fn() },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 既定: Story = {};

export const 無効: Story = { args: { disabled: true } };

export const 副: Story = { args: { children: "接続せずに始める", variant: "quiet" } };

export const 副の無効: Story = {
  args: { children: "接続せずに始める", variant: "quiet", disabled: true },
};

/* 並べたときに押す先が 1 つに見えるか */
export const 主と副: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: "var(--space-sm)", justifyContent: "flex-end" }}>
      <Button {...args} variant="quiet">
        接続せずに始める
      </Button>
      <Button {...args}>接続する</Button>
    </div>
  ),
};
