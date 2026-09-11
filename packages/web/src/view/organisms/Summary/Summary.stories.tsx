import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import type { MissedCard, SectionScore } from "../../../types";
import { Summary } from "./Summary";

/* 30 枚 × 2 方向 = 60 問（docs/01_spec.md#2-出題形式） */
const BY_SECTION: readonly SectionScore[] = [
  { section: "skeleton", asked: 12, correct: 12 },
  { section: "patterns", asked: 10, correct: 8 },
  { section: "shaping", asked: 12, correct: 9 },
  { section: "lists", asked: 12, correct: 10 },
  { section: "writing", asked: 10, correct: 8 },
  { section: "subqueries", asked: 4, correct: 1 },
];

const MISSED: readonly MissedCard[] = [
  { id: "varlen", section: "patterns", name: "varlen", direction: "reverse" },
  { id: "order-by", section: "shaping", name: "ORDER BY", direction: "forward" },
  { id: "distinct", section: "lists", name: "count(DISTINCT x)", direction: "reverse" },
  { id: "call-subquery", section: "subqueries", name: "CALL { }", direction: "forward" },
];

const meta = {
  title: "organisms/Summary",
  component: Summary,
  parameters: { layout: "padded" },
  args: {
    asked: 60,
    correct: 48,
    bySection: BY_SECTION,
    missed: MISSED,
    onOpenCard: fn(),
    onRestart: fn(),
    onRetryMissed: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "var(--col)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Summary>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 既定: Story = {};

export const 全問正解: Story = {
  args: {
    correct: 60,
    bySection: BY_SECTION.map((score) => ({ ...score, correct: score.asked })),
    missed: [],
  },
};

export const 不正解が多い: Story = {
  args: {
    correct: 31,
    bySection: BY_SECTION.map((score) => ({ ...score, correct: Math.floor(score.asked / 2) })),
    missed: [
      ...MISSED,
      { id: "optional-match", section: "skeleton", name: "OPTIONAL MATCH", direction: "forward" },
      { id: "with", section: "skeleton", name: "WITH", direction: "reverse" },
      { id: "edge", section: "patterns", name: "-[:REL]->", direction: "forward" },
      { id: "merge", section: "writing", name: "MERGE", direction: "reverse" },
      { id: "foreach", section: "writing", name: "FOREACH", direction: "forward" },
    ],
  },
};
