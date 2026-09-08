import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { OPTIONAL_MATCH, SET_REMOVE, WITH } from "../../../fixtures/cards";
import { CardBack } from "./CardBack";

/* 実行できるカードに渡すもの。結線は controller の仕事なので story では記録だけ取る */
const EDITOR = { onChange: fn(), onRun: fn(), onReset: fn() };

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
    editor: EDITOR,
    onNext: fn(),
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

export const 正解: Story = {};

export const 不正解: Story = {
  args: { chosen: OPTIONAL_MATCH.choices[2] },
};

export const 最後の1枚: Story = { args: { isLast: true } };

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

/* 書き込み系のカード。構文の列挙だけで、期待される実行結果も持たない */
export const 実行不可: Story = {
  args: {
    section: SET_REMOVE.section,
    chosen: SET_REMOVE.role,
    correct: SET_REMOVE.role,
    code: SET_REMOVE.code,
    expected: undefined,
    note: undefined,
    warn: SET_REMOVE.warn,
    editor: undefined,
  },
};

/* 未接続。実行だけ押せない */
export const 未接続: Story = { args: { editor: { ...EDITOR, status: "offline" } } };

/* 実行してエラーが返った状態。罠を持つカードだと注記が 2 つ並ぶ */
export const 実行エラー: Story = {
  args: {
    section: WITH.section,
    chosen: WITH.choices[0],
    correct: WITH.role,
    code: WITH.code,
    expected: WITH.expected,
    note: WITH.note,
    warn: WITH.warn,
    editor: {
      ...EDITOR,
      value: "MATCH (e:Engineer)-[:MEMBER_OF]->(t:Team)\nWHERE teams_involved > 1\nRETURN count(i)",
      status: "error",
      errorMessage: "Variable `teams_involved` not defined (line 2, column 7)",
    },
  },
};

/* 編集すると色が消え、リセットが押せるようになる */
export const 編集済み: Story = {
  args: {
    editor: {
      ...EDITOR,
      value: "MATCH (e:Engineer)\nOPTIONAL MATCH (e)-[:RESPONDED_TO]->(i:Incident)\nRETURN e.name",
    },
  },
};
