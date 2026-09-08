import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { OPTIONAL_MATCH, SET_REMOVE } from "../../../fixtures/cards";
import { QuizPage } from "./QuizPage";

const EDITOR = { onChange: fn(), onRun: fn(), onReset: fn() };

const QUESTION = {
  section: OPTIONAL_MATCH.section,
  direction: "forward" as const,
  prompt: OPTIONAL_MATCH.name,
  choices: OPTIONAL_MATCH.choices,
  onSelect: fn(),
  onAnswer: fn(),
};

const BACK = {
  section: OPTIONAL_MATCH.section,
  kind: "prose" as const,
  correct: OPTIONAL_MATCH.role,
  code: OPTIONAL_MATCH.code,
  expected: OPTIONAL_MATCH.expected,
  note: OPTIONAL_MATCH.note,
};

const meta = {
  title: "pages/QuizPage",
  component: QuizPage,
  parameters: { layout: "fullscreen" },
  args: {
    counts: [38, 14, 8],
    face: { side: "question", question: { ...QUESTION, selected: 1 } },
  },
} satisfies Meta<typeof QuizPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 出題中: Story = {};

export const 正解直後: Story = {
  args: {
    face: { side: "back", back: { ...BACK, chosen: OPTIONAL_MATCH.role, editor: EDITOR } },
  },
};

export const 不正解直後: Story = {
  args: {
    face: {
      side: "back",
      back: { ...BACK, chosen: OPTIONAL_MATCH.choices[2] ?? "", editor: EDITOR },
    },
  },
};

export const 実行中: Story = {
  args: {
    face: {
      side: "back",
      back: {
        ...BACK,
        chosen: OPTIONAL_MATCH.role,
        editor: { ...EDITOR, value: "MATCH (e:Engineer)\nRETURN e.name", status: "running" },
      },
    },
  },
};

export const 実行エラー: Story = {
  args: {
    face: {
      side: "back",
      back: {
        ...BACK,
        chosen: OPTIONAL_MATCH.role,
        editor: {
          ...EDITOR,
          value: "MATCH (e:Enginer)\nRETURN e.nam",
          status: "error",
          errorMessage: "Variable `e.nam` not defined (line 2, column 8)",
        },
      },
    },
  },
};

export const 未接続: Story = {
  args: {
    face: {
      side: "back",
      back: { ...BACK, chosen: OPTIONAL_MATCH.role, editor: { ...EDITOR, status: "offline" } },
    },
  },
};

/* 書き込み系は実行させない。裏面はコードと実行前後の状態だけになる */
export const 実行しないカード: Story = {
  args: {
    face: {
      side: "back",
      back: {
        section: SET_REMOVE.section,
        kind: "prose",
        chosen: SET_REMOVE.role,
        correct: SET_REMOVE.role,
        code: SET_REMOVE.code,
        note: SET_REMOVE.note,
      },
    },
  },
};
