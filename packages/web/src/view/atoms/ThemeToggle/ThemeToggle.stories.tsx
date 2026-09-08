import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { ThemeToggle } from "./ThemeToggle";

const meta = {
  title: "atoms/ThemeToggle",
  component: ThemeToggle,
  parameters: { layout: "padded" },
  args: { theme: "light", onToggle: fn() },
  argTypes: { theme: { control: "inline-radio", options: ["light", "dark"] } },
} satisfies Meta<typeof ThemeToggle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const light: Story = {};

export const dark: Story = { args: { theme: "dark" } };
