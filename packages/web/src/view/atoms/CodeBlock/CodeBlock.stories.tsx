import type { Meta, StoryObj } from "@storybook/react-vite";

import type { CodeSegment } from "../../../types";
import { CodeBlock } from "./CodeBlock";

const OWNS_QUERY: CodeSegment[] = [
  { text: "// Grid Operations が持っているサービス", kind: "cm" },
  { text: "\n" },
  { text: "MATCH", kind: "kw" },
  { text: " (t:Team {name: " },
  { text: "'Grid Operations'", kind: "hl" },
  { text: "})-[:" },
  { text: "OWNS", kind: "rel" },
  { text: "]->(s:Service)\n" },
  { text: "RETURN", kind: "kw" },
  { text: " s.name, s.language" },
];

const REUSE_VARIABLE: CodeSegment[] = [
  { text: "MATCH", kind: "kw" },
  { text: " (" },
  { text: "e", kind: "hl" },
  { text: ":Engineer)-[:" },
  { text: "MEMBER_OF", kind: "rel" },
  { text: "]->(t:Team), (" },
  { text: "e", kind: "hl" },
  { text: ")-[:" },
  { text: "RESPONDED_TO", kind: "rel" },
  { text: "]->(i:Incident)\n" },
  { text: "        2つ目の (e) はラベルを書かない = 束縛済み変数の再利用", kind: "cm" },
];

const OPTIONAL_MATCH: CodeSegment[] = [
  { text: "// 全エンジニアと、対応した件数", kind: "cm" },
  { text: "\n" },
  { text: "MATCH", kind: "kw" },
  { text: " (e:Engineer)\n" },
  { text: "OPTIONAL MATCH", kind: "kw" },
  { text: " (e)-[:" },
  { text: "RESPONDED_TO", kind: "rel" },
  { text: "]->(i:Incident)\n" },
  { text: "RETURN", kind: "kw" },
  { text: " e.name, count(i) " },
  { text: "AS", kind: "kw" },
  { text: " n\n" },
  { text: "ORDER BY", kind: "kw" },
  { text: " n " },
  { text: "ASC LIMIT", kind: "kw" },
  { text: " 1" },
];

const WRONG_AGGREGATE: CodeSegment[] = [
  { text: "RETURN", kind: "kw" },
  { text: " t.name, " },
  { text: "count(t)", kind: "bad" },
  { text: " " },
  { text: "AS", kind: "kw" },
  { text: " n" },
];

const LONG_LINE: CodeSegment[] = [
  { text: "MATCH", kind: "kw" },
  { text: " p = (e:Engineer)-[:" },
  { text: "MEMBER_OF", kind: "rel" },
  { text: "]->(t:Team)-[:" },
  { text: "OWNS", kind: "rel" },
  { text: "]->(s:Service)-[:" },
  { text: "DEPENDS_ON", kind: "rel" },
  { text: "*1..3]->(d:Service) " },
  { text: "WHERE", kind: "kw" },
  { text: " d.name = " },
  { text: "'Auth Gateway'", kind: "hl" },
];

/* why: 空白もハイフンも括弧も無い連なりは、折り返す位置が無い。正規表現の選択肢を
   縦棒で繋ぐと実際にこうなる。溢れを pre の内側に閉じ込められているかを見るための data */
const UNBREAKABLE: CodeSegment[] = [
  { text: "MATCH", kind: "kw" },
  { text: " (i:Incident)\n" },
  { text: "WHERE", kind: "kw" },
  { text: " i.title =~ " },
  {
    text: "'(?i).*(disconnect|throttling|saturation|misconfiguration|escalation|degradation|oom_kill).*'",
    kind: "hl",
  },
  { text: "\n" },
  { text: "RETURN", kind: "kw" },
  { text: " i.id, i.title" },
];

const meta = {
  title: "atoms/CodeBlock",
  component: CodeBlock,
  parameters: { layout: "padded" },
  args: { code: OPTIONAL_MATCH },
  decorators: [
    (Story) => (
      <div style={{ display: "grid", gap: "0.9rem", maxWidth: "36rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CodeBlock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 既定: Story = {};

export const リテラルと型: Story = { args: { code: OWNS_QUERY } };

export const 変数の強調: Story = { args: { code: REUSE_VARIABLE } };

export const 誤りの提示: Story = { args: { code: WRONG_AGGREGATE } };

export const 横に溢れる行: Story = { args: { code: LONG_LINE } };

export const 折り返せない行: Story = { args: { code: UNBREAKABLE } };
