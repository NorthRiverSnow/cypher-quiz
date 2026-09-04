import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { SECTION_LABELS } from "../../../types";
import { FlashCard } from "./FlashCard";

const ROLE = "見つからなくても行を捨てず、変数を null にして通す";

const ROLES = [
  "グラフの中から、指定した形に当てはまる組み合わせをすべて探して行にする",
  ROLE,
  "直前の MATCH または WITH の結果を絞る",
  "クエリを前半と後半に区切り、結果を渡す関所。集約・スコープ切断・集約後の絞り込みが同時に起きる",
];

const SYNTAXES = ["MATCH", "OPTIONAL MATCH", "WHERE", "WITH"];

const meta = {
  title: "organisms/FlashCard",
  component: FlashCard,
  parameters: { layout: "padded" },
  args: {
    section: "skeleton",
    direction: "forward",
    prompt: "OPTIONAL MATCH",
    choices: ROLES,
    onSelect: fn(),
    onAnswer: fn(),
  },
  argTypes: {
    section: { control: "select", options: Object.keys(SECTION_LABELS) },
    direction: { control: "inline-radio", options: ["forward", "reverse"] },
    selected: { control: { type: "number", min: 0, max: 3 } },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "var(--col)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FlashCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 既定: Story = {};

export const 逆順: Story = {
  args: { direction: "reverse", prompt: ROLE, choices: SYNTAXES },
};

export const 選択中: Story = { args: { selected: 1 } };
