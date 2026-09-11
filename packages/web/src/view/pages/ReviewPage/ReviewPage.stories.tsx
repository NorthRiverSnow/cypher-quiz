import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { OPTIONAL_MATCH, SET_REMOVE } from "../../../fixtures/cards";
import { ReviewPage } from "./ReviewPage";

const EDITOR = { onChange: fn(), onEdit: fn(), onRun: fn(), onReset: fn() };

const meta = {
  title: "pages/ReviewPage",
  component: ReviewPage,
  parameters: { layout: "fullscreen" },
  args: {
    section: OPTIONAL_MATCH.section,
    direction: "forward",
    prompt: OPTIONAL_MATCH.name,
    onBack: fn(),
    back: {
      correct: OPTIONAL_MATCH.role,
      chosen: OPTIONAL_MATCH.choices[0] ?? "",
      code: OPTIONAL_MATCH.code,
      expected: OPTIONAL_MATCH.expected,
      note: OPTIONAL_MATCH.note,
      editor: EDITOR,
    },
  },
} satisfies Meta<typeof ReviewPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 既定: Story = {};

export const 未接続: Story = {
  args: { back: { ...meta.args.back, editor: { ...EDITOR, status: "offline" } } },
};

export const 実行した後: Story = {
  args: {
    back: {
      ...meta.args.back,
      result: {
        columns: ["e.name", "n"],
        rows: [["Killua Zoldyck", "0"]],
      },
    },
  },
};

export const 逆順: Story = {
  args: {
    direction: "reverse",
    prompt: OPTIONAL_MATCH.role,
    back: { ...meta.args.back, correct: OPTIONAL_MATCH.name, chosen: "WITH" },
  },
};

/* 書き込みのカードは実行させない。編集欄そのものが出ない */
export const 実行できないカード: Story = {
  args: {
    section: SET_REMOVE.section,
    prompt: SET_REMOVE.name,
    back: {
      correct: SET_REMOVE.role,
      chosen: SET_REMOVE.choices[0] ?? "",
      code: SET_REMOVE.code,
      expected: SET_REMOVE.expected,
      warn: SET_REMOVE.warn,
    },
  },
};
