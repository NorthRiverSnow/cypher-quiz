import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { SECTION_LABELS, type SectionId } from "../../../types";
import type { SectionChoice } from "../../organisms/SectionPicker/SectionPicker";
import { StartPage } from "./StartPage";

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

const choices = (checked: (id: SectionId) => boolean): SectionChoice[] =>
  (Object.keys(SECTION_LABELS) as SectionId[]).map((id) => ({
    id,
    label: SECTION_LABELS[id],
    status: STATUS[id],
    checked: checked(id),
    ...(RESETTABLE.includes(id) ? { onReset: fn() } : {}),
  }));

const picker = (checked: (id: SectionId) => boolean) => ({
  sections: choices(checked),
  allStatus: "60 問・最初から",
  onToggle: fn(),
  onToggleAll: fn(),
});

const meta = {
  title: "pages/StartPage",
  component: StartPage,
  parameters: { layout: "fullscreen" },
  args: { picker: picker(() => false), canStart: false, onStart: fn() },
} satisfies Meta<typeof StartPage>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 初めて開いたとき。章が未選択なので開始を押せない */
export const 既定: Story = {};

export const 章を選んだ: Story = {
  args: { picker: picker((id) => id === "skeleton" || id === "lists"), canStart: true },
};
