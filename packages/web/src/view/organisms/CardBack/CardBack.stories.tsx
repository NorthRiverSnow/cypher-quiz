import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { OPTIONAL_MATCH, WITH } from "../../../fixtures/cards";
import { CardBack } from "./CardBack";

const meta = {
  title: "organisms/CardBack",
  component: CardBack,
  parameters: { layout: "padded" },
  args: {
    section: OPTIONAL_MATCH.section,
    kind: "prose",
    chosen: OPTIONAL_MATCH.role,
    correct: OPTIONAL_MATCH.role,
    code: OPTIONAL_MATCH.code,
    expected: OPTIONAL_MATCH.expected,
    note: OPTIONAL_MATCH.note,
    /* 実行できるのが標準。出ないほうが例外 */
    onRun: fn(),
    onReset: fn(),
  },
  argTypes: { kind: { control: "inline-radio", options: ["prose", "syntax"] } },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "var(--col)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CardBack>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 正答: Story = {};

export const 誤答: Story = {
  args: { chosen: OPTIONAL_MATCH.choices[2] },
};

/* 罠を持つカード。裏面で最も情報が多くなる形 */
export const 罠のあるカード: Story = {
  args: {
    section: WITH.section,
    chosen: WITH.choices[0],
    correct: WITH.role,
    code: WITH.code,
    expected: WITH.expected,
    note: WITH.note,
    warn: WITH.warn,
  },
};

/* 構文列挙だけのカードは、クエリも結果も持たない */
export const 逆順で解説だけ: Story = {
  args: {
    kind: "syntax",
    chosen: "MATCH",
    correct: "OPTIONAL MATCH",
    code: undefined,
    expected: undefined,
    note: OPTIONAL_MATCH.note,
  },
};

/* 実行させないカード。道具を出さない */
export const 実行不可: Story = {
  args: { onRun: undefined, onReset: undefined },
};

/* 未接続。実行だけ押せない */
export const 未接続: Story = { args: { runDisabled: true } };

/* まだ編集していないのでリセットできない */
export const 編集前: Story = { args: { resetDisabled: true } };
