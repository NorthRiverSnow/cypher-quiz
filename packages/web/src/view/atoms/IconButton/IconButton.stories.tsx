import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { IconButton } from "./IconButton";

const meta = {
  title: "atoms/IconButton",
  component: IconButton,
  parameters: { layout: "padded" },
  args: { icon: "play_arrow", label: "実行", onClick: fn() },
  argTypes: { icon: { control: "select", options: ["play_arrow", "restart_alt", "close"] } },
  decorators: [
    (Story) => (
      <div
        style={{
          display: "flex",
          gap: "0.3rem",
          background: "var(--panel-sunken)",
          padding: "0.5rem",
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof IconButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 既定: Story = {};

export const 無効: Story = { args: { disabled: true } };

/* 実行とリセットは並べて置く */
export const 並べる: Story = {
  render: (args) => (
    <>
      <IconButton {...args} icon="play_arrow" label="実行" />
      <IconButton {...args} icon="restart_alt" label="リセット" />
    </>
  ),
};
