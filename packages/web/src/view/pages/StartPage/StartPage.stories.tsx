import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { StartPage } from "./StartPage";

const meta = {
  title: "pages/StartPage",
  component: StartPage,
  parameters: { layout: "fullscreen" },
  args: { onStart: fn() },
} satisfies Meta<typeof StartPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 既定: Story = {};

/* 端末に進捗が残っている状態（docs/01_spec.md#6-復習間隔反復） */
export const 続きがある: Story = { args: { remaining: 32 } };
