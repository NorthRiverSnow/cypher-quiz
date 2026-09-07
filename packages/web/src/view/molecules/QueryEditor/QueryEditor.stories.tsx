import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { WITH } from "../../../fixtures/cards";
import { QueryEditor } from "./QueryEditor";

const EDITED = `MATCH (e:Engineer)-[:MEMBER_OF]->(t:Team), (e)-[:RESPONDED_TO]->(i:Incident)
WITH i, count(t) AS teams_involved
WHERE teams_involved > 1
RETURN count(i) AS cross_team_incidents`;

const meta = {
  title: "molecules/QueryEditor",
  component: QueryEditor,
  parameters: { layout: "padded" },
  args: { code: WITH.code ?? [], onChange: fn(), onRun: fn(), onReset: fn() },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "var(--col)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof QueryEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 既定: Story = {};

/* 編集すると色が消える。色分けは出題データが持っていて、編集後の文字列は解析しない。
   ここでは DISTINCT を外した版——答えが 13 から 20 に飛ぶ罠 */
export const 編集済み: Story = { args: { value: EDITED } };

export const 実行中: Story = { args: { value: EDITED, status: "running" } };

export const 未接続: Story = { args: { status: "offline" } };

export const 書き込みで拒否: Story = { args: { value: "CREATE (x:Tmp)", status: "rejected" } };

export const 実行エラー: Story = {
  args: {
    value: EDITED,
    status: "error",
    errorMessage: "Variable `teams_involved` not defined (line 3, column 7)",
  },
};

/* 1 行目が長いとき。道具の下に字が潜らないかを見る */
export const 長い一行目: Story = {
  args: {
    code: [
      { text: "MATCH", kind: "kw" },
      { text: " (e:Engineer)-[:" },
      { text: "MEMBER_OF", kind: "rel" },
      { text: "]->(t:Team), (e)-[:" },
      { text: "RESPONDED_TO", kind: "rel" },
      { text: "]->(i:Incident) " },
      { text: "WHERE", kind: "kw" },
      { text: " i.severity = " },
      { text: "'SEV1'", kind: "hl" },
      { text: "\n" },
      { text: "RETURN", kind: "kw" },
      { text: " count(i)" },
    ],
  },
};
