import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { type MissedCard, type SectionScore, Summary } from "./Summary";

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
  { section: "patterns", name: "varlen", direction: "reverse" },
  { section: "shaping", name: "ORDER BY", direction: "forward" },
  { section: "lists", name: "count(DISTINCT x)", direction: "reverse" },
  { section: "subqueries", name: "CALL { }", direction: "forward" },
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
      { section: "skeleton", name: "OPTIONAL MATCH", direction: "forward" },
      { section: "skeleton", name: "WITH", direction: "reverse" },
      { section: "patterns", name: "-[:REL]->", direction: "forward" },
      { section: "writing", name: "MERGE", direction: "reverse" },
      { section: "writing", name: "FOREACH", direction: "forward" },
    ],
  },
};
