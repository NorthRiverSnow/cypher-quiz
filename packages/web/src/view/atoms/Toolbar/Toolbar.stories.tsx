import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { IconButton } from "../IconButton/IconButton";
import { Toolbar } from "./Toolbar";

const meta = {
  title: "atoms/Toolbar",
  component: Toolbar,
  parameters: { layout: "padded" },
  args: {
    children: (
      <>
        <IconButton icon="restart_alt" label="リセット" onClick={fn()} />
        <IconButton icon="play_arrow" label="実行" onClick={fn()} />
      </>
    ),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          maxWidth: "var(--col)",
          border: "var(--border-width) solid var(--rule-soft)",
          borderRadius: "var(--radius)",
          background: "var(--panel-sunken)",
        }}
      >
        <Story />
        <div style={{ padding: "var(--space-sm)", color: "var(--muted)" }}>本文の面</div>
      </div>
    ),
  ],
} satisfies Meta<typeof Toolbar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 既定: Story = {};

/* 押せない道具だけのとき */
export const 無効: Story = {
  args: {
    children: (
      <>
        <IconButton icon="restart_alt" label="リセット" onClick={fn()} disabled />
        <IconButton icon="play_arrow" label="実行" onClick={fn()} disabled />
      </>
    ),
  },
};
