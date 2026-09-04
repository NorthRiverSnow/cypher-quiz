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
