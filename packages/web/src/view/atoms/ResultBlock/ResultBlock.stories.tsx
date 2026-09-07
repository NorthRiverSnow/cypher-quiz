import type { Meta, StoryObj } from "@storybook/react-vite";

import { ResultBlock } from "./ResultBlock";

const COUNT = <b style={{ color: "var(--keep)" }}>3 行</b>;

const meta = {
  title: "atoms/ResultBlock",
  component: ResultBlock,
  parameters: { layout: "padded" },
  args: {
    children: (
      <>
        {"telemetry-ingest   Go\ngrid-monitor       Go\ndispatch-optimizer Python\n"}
        {COUNT}
      </>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "var(--col)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ResultBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 既定: Story = {};

export const 一行: Story = { args: { children: "Killua Zoldyck   0" } };

/* 実データの最長行は 45 字で、この幅では溢れない。**桁を保って横スクロールする**ことを
   見せたいので、意図的に長くしてある */
export const 横に溢れる: Story = {
  args: {
    children:
      "INC-2103  [customer-portal, auth-service, billing-engine, payment-gateway, reporting-service]\n" +
      "INC-2120  [telemetry-ingest, grid-monitor, dispatch-optimizer, meter-reader, tariff-service]\n" +
      "2 行",
  },
};
