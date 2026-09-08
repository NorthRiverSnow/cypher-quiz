import type { Meta, StoryObj } from "@storybook/react-vite";

import { ResultTable } from "./ResultTable";

const meta = {
  title: "molecules/ResultTable",
  component: ResultTable,
  parameters: { layout: "padded" },
  args: {
    columns: ["e.name", "n"],
    rows: [["Killua Zoldyck", "0"]],
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "var(--col)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ResultTable>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 既定: Story = {};

export const 複数列: Story = {
  args: {
    columns: ["s.name", "s.language"],
    rows: [
      ["telemetry-ingest", "Go"],
      ["grid-monitor", "Go"],
      ["dispatch-optimizer", "Python"],
    ],
  },
};

/* ノードで返った値はラベルの色で出す */
export const ノードを含む: Story = {
  args: {
    columns: ["s", "t", "e"],
    rows: [
      [
        { kind: "service", text: "telemetry-ingest" },
        { kind: "team", text: "Grid Operations" },
        { kind: "engineer", text: "Killua Zoldyck" },
      ],
      [
        { kind: "service", text: "billing-engine" },
        { kind: "team", text: "Billing" },
        { kind: "engineer", text: "Mika Virtanen" },
      ],
    ],
  },
};

/* 日付を含む表。桁を揃えたいので折り返さない */
export const 日付を含む: Story = {
  args: {
    columns: ["i.id", "i.date", "i.severity", "i.title"],
    rows: [
      ["INC-2118", "2026-01-14", "SEV1", "Meter reader fleet disconnects"],
      ["INC-2120", "2026-02-03", "SEV1", "Billing engine OOM during rollup"],
    ],
  },
};
