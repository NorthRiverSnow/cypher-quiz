import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { SECTION_LABELS, type SectionId } from "../../../types";
import { Card } from "../../atoms/Card/Card";
import { SectionPicker, type SectionChoice } from "./SectionPicker";

/* 章と問題数は docs/05_reference.md の 30 枚（枚数 × 2 方向） */
const STATUS: Record<SectionId, string> = {
  skeleton: "0 / 10",
  patterns: "8 / 12",
  shaping: "0 / 8",
  lists: "進行中",
  writing: "0 / 10",
  subqueries: "8 / 8",
};

const RESETTABLE: readonly SectionId[] = ["patterns", "lists", "subqueries"];

/** 8 / 8 の章。行の右端が緑の太字になる */
const ALL_CORRECT: readonly SectionId[] = ["subqueries"];

const choices = (checked: (id: SectionId) => boolean): SectionChoice[] =>
  (Object.keys(SECTION_LABELS) as SectionId[]).map((id) => ({
    id,
    label: SECTION_LABELS[id],
    status: STATUS[id],
    checked: checked(id),
    allCorrect: ALL_CORRECT.includes(id),
    ...(RESETTABLE.includes(id) ? { onReset: fn() } : {}),
  }));

const meta = {
  title: "organisms/SectionPicker",
  component: SectionPicker,
  parameters: { layout: "padded" },
  args: {
    sections: choices(() => false),
    allStatus: "60 問・最初から",
    onToggle: fn(),
    onToggleAll: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "var(--col)" }}>
        <Card>
          <Story />
        </Card>
      </div>
    ),
  ],
} satisfies Meta<typeof SectionPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 初めて開いたとき。何も選ばれていない */
export const 未選択: Story = {};

export const 一部を選んだ: Story = {
  args: { sections: choices((id) => id === "skeleton" || id === "lists") },
};

/** 6 章すべてが入ると「全て」も入る */
export const 全て: Story = { args: { sections: choices(() => true) } };

/** 1 つ外すと「全て」が外れる */
export const 全てから一つ外した: Story = {
  args: { sections: choices((id) => id !== "writing") },
};
