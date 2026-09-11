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
  args: { code: WITH.code ?? [], onChange: fn(), onEdit: fn(), onRun: fn(), onReset: fn() },
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

/* DISTINCT を外した版——答えが 13 から 20 に飛ぶ罠 */
export const 編集済み: Story = { args: { value: EDITED } };

export const 実行中: Story = { args: { value: EDITED, status: "running" } };

export const 未接続: Story = { args: { status: "offline" } };

/* 実行できるカードのクエリを書き込みに書き換えた場合（docs/04_roadmap.md の検証 14） */
export const 書き込みで拒否: Story = { args: { value: "CREATE (x:Tmp)", status: "rejected" } };

export const 実行エラー: Story = {
  args: {
    value: EDITED,
    status: "error",
    errorMessage: "Variable `teams_involved` not defined (line 3, column 7)",
  },
};

/* 空白で切れるので折り返す。器は横に伸びない */
export const 折り返す長い行: Story = {
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

/* 空白もハイフンも無い連なりは折り返せない。枠の中で横スクロールに閉じるかを見る */
export const 横に溢れる: Story = {
  args: {
    code: [
      { text: "MATCH", kind: "kw" },
      { text: " (i:Incident)\n" },
      { text: "WHERE", kind: "kw" },
      { text: " i.title =~ " },
      {
        text: "'(?i).*(disconnect|throttling|saturation|misconfiguration|escalation|degradation|oom_kill|timeout).*'",
        kind: "hl",
      },
      { text: "\n" },
      { text: "RETURN", kind: "kw" },
      { text: " i.id" },
    ],
  },
};

/* 空白で切れるので textarea も折り返す */
export const 編集済みで折り返す: Story = {
  args: {
    value:
      "MATCH (i:Incident) WHERE i.severity = 'SEV1' AND i.date >= date('2026-01-01') RETURN i.id, i.title",
  },
};

/* 編集中に横スクロールが起きないことを見る */
export const 編集済みで割れる: Story = {
  args: {
    value:
      "MATCH (i:Incident)\nWHERE i.title =~ '(?i).*(disconnect|throttling|saturation|misconfiguration|escalation|degradation|oom_kill|timeout).*'\nRETURN i.id",
  },
};

/* 1 本のクエリになっていない例。押す前に書き換えを促す */
export const 構文の一覧: Story = {
  args: { listing: true },
};
