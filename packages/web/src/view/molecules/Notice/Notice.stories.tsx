import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { Notice } from "./Notice";

const meta = {
  title: "molecules/Notice",
  component: Notice,
  parameters: { layout: "padded" },
  args: {
    tone: "warn",
    title: "進捗を保存できません",
    detail: "この端末では保存が使えません。解き進められますが、次回は最初からになります",
    onDismiss: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "var(--col)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Notice>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 注意: Story = {};

export const エラー: Story = {
  args: {
    tone: "alarm",
    title: "クエリを実行できません",
    detail: "Variable `e.nam` not defined (line 2, column 8)",
  },
};

/* サーバからの文言が無い失敗 */
export const 詳細なし: Story = {
  args: { tone: "alarm", title: "DB に接続できません", detail: undefined },
};

/* 長い文言でも閉じるボタンが 1 行目に揃い、字下げが保たれる */
export const 折り返し: Story = {
  args: {
    tone: "alarm",
    title: "クエリを実行できません",
    detail:
      "Neo.ClientError.Statement.SyntaxError: Invalid input 'RETRUN': expected an expression, 'FOREACH', 'ORDER BY', 'CALL', 'CREATE' (line 3, column 1 (offset: 84))",
  },
};
