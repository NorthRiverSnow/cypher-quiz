import type { Meta, StoryObj } from "@storybook/react-vite";

import { ICONS, Icon } from "./Icon";

const SEMANTIC_TOKENS = ["--warn", "--alarm", "--keep", "--accent", "--muted"];
const SIZES = ["0.9rem", "1.25rem", "1.75rem", "2.5rem"];

const meta = {
  title: "atoms/Icon",
  component: Icon,
  parameters: { layout: "padded" },
  args: { name: "warning", label: "注意" },
  argTypes: {
    name: { control: "select", options: Object.keys(ICONS) },
    fill: { control: "inline-radio", options: [0, 1] },
    size: { control: "text" },
  },
  decorators: [
    (Story) => (
      <div style={{ display: "flex", alignItems: "center", gap: "1.2rem", color: "var(--ink)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Icon>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 既定: Story = {};

export const 大きさ: Story = {
  render: (args) => (
    <>
      {SIZES.map((size) => (
        <Icon key={size} {...args} size={size} />
      ))}
    </>
  ),
};

export const 塗り: Story = {
  render: (args) => (
    <>
      <Icon {...args} fill={0} size="1.75rem" />
      <Icon {...args} fill={1} size="1.75rem" />
    </>
  ),
};

export const 意味色: Story = {
  render: (args) => (
    <>
      {SEMANTIC_TOKENS.map((token) => (
        <Icon key={token} {...args} color={`var(${token})`} size="1.75rem" />
      ))}
    </>
  ),
};
