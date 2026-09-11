import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import type { MissedCard, SectionScore } from "../../../types";
import { ResultPage } from "./ResultPage";

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
  { id: "distinct", section: "lists", name: "count(DISTINCT x)", direction: "reverse" },
];

const meta = {
  title: "pages/ResultPage",
  component: ResultPage,
  parameters: { layout: "fullscreen" },
  args: {
    counts: [48, 12, 0],
    summary: {
      asked: 60,
      correct: 48,
      bySection: BY_SECTION,
      missed: MISSED,
      onOpenCard: fn(),
      onRestart: fn(),
      onRetryMissed: fn(),
    },
  },
} satisfies Meta<typeof ResultPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 既定: Story = {};

export const 全問正解: Story = {
  args: {
    summary: {
      asked: 60,
      correct: 60,
      bySection: BY_SECTION.map((score) => ({ ...score, correct: score.asked })),
      missed: [],
      onOpenCard: fn(),
      onRestart: fn(),
      onRetryMissed: fn(),
    },
  },
};
