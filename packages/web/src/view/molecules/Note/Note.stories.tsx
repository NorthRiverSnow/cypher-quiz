import type { Meta, StoryObj } from "@storybook/react-vite";

import { Note, type NoteTone } from "./Note";

const TONES: NoteTone[] = ["warn", "keep", "alarm", "accent"];

const SHORT = "DISTINCT を落とすと 13 が 20 になる。";
const LONG =
  "DISTINCT を落として count(t) にすると、13 が 20 になる。集約は重複を数えるので、" +
  "同じチームを複数回たどった分だけ値が膨らむ。";

const meta = {
  title: "molecules/Note",
  component: Note,
  parameters: { layout: "padded" },
  args: { tone: "warn", icon: "warning", iconLabel: "注意", children: SHORT },
  argTypes: {
    tone: { control: "inline-radio", options: TONES },
    icon: { control: "inline-radio", options: [undefined, "warning"] },
  },
  decorators: [
    (Story) => (
      <div style={{ display: "grid", gap: "0.9rem", maxWidth: "34rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Note>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 既定: Story = {};

export const 折り返し: Story = { args: { children: LONG } };

export const アイコンなし: Story = { args: { icon: undefined, children: LONG } };

export const 色調: Story = {
  render: (args) => (
    <>
      {TONES.map((tone) => (
        <Note key={tone} {...args} tone={tone}>
          {tone} — {SHORT}
        </Note>
      ))}
    </>
  ),
};
