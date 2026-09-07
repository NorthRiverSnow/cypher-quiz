import type { Meta, StoryObj } from "@storybook/react-vite";

import { TEXT, Text, type TextVariant, TONES } from "./Text";

const VARIANTS = Object.keys(TEXT) as TextVariant[];

const SAMPLE: Record<TextVariant, string> = {
  micro: "§ Skeleton",
  numeral: "1",
  code: "MATCH (t:Team)-[:OWNS]->(s:Service)",
  annotation: "DISTINCT を外すと 13 が 20 になる。",
  prose: "見つからなくても行を捨てず、変数を null にして通す",
  syntax: "OPTIONAL MATCH",
  titleProse: "見つからなくても行を捨てず、変数を null にして通す",
  title: "OPTIONAL MATCH",
  display: "意匠の実値",
};

const meta = {
  title: "atoms/Text",
  component: Text,
  parameters: { layout: "padded" },
  args: { variant: "prose", children: SAMPLE.prose },
  argTypes: {
    variant: { control: "select", options: VARIANTS },
    tone: { control: "select", options: Object.keys(TONES) },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "var(--col)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 既定: Story = {};

export const 型: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "1.1rem" }}>
      {VARIANTS.map((variant) => (
        <div key={variant} style={{ display: "grid", gap: "0.15rem" }}>
          <Text variant="micro" tone="muted">
            {variant} · {TEXT[variant].fontSize}
          </Text>
          <Text variant={variant}>{SAMPLE[variant]}</Text>
        </div>
      ))}
    </div>
  ),
};
