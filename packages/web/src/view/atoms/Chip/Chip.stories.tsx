import type { Meta, StoryObj } from "@storybook/react-vite";

import { Chip, type ChipKind } from "./Chip";

const NODES: readonly { kind: ChipKind; label: string }[] = [
  { kind: "team", label: "Team" },
  { kind: "engineer", label: "Engineer" },
  { kind: "service", label: "Service" },
  { kind: "incident", label: "Incident" },
];

const meta = {
  title: "atoms/Chip",
  component: Chip,
  parameters: { layout: "padded" },
  args: { kind: "team", children: "Team" },
  argTypes: { kind: { control: "inline-radio", options: NODES.map((n) => n.kind) } },
  decorators: [
    (Story) => (
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Chip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 既定: Story = {};

/* 結果表に出るノード種別の 4 色 */
export const 種類: Story = {
  render: () => (
    <>
      {NODES.map(({ kind, label }) => (
        <Chip key={kind} kind={kind}>
          {label}
        </Chip>
      ))}
    </>
  ),
};
