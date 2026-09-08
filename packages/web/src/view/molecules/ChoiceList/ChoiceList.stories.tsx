import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { ChoiceList } from "./ChoiceList";

const PROSE = [
  "グラフの中から、指定した形に当てはまる組み合わせをすべて探して行にする",
  "見つからなくても行を捨てず、変数を null にして通す",
  "直前の MATCH または WITH の結果を絞る",
  "クエリを前半と後半に区切り、結果を渡す関所。集約・スコープ切断・集約後の絞り込みが同時に起きる",
];

const meta = {
  title: "molecules/ChoiceList",
  component: ChoiceList,
  parameters: { layout: "padded" },
  args: { choices: PROSE, kind: "prose", onSelect: fn() },
  argTypes: {
    kind: { control: "inline-radio", options: ["prose", "syntax"] },
    selected: { control: { type: "number", min: 0, max: 3 } },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "34rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ChoiceList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 既定: Story = {};

export const 選択中: Story = { args: { selected: 1 } };
