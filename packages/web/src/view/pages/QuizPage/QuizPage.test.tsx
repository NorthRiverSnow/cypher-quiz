import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { OPTIONAL_MATCH } from "../../../fixtures/cards";
import { QuizPage, type QuizFace } from "./QuizPage";

/* why: vitest の globals を切っているので RTL の自動 cleanup が実行されない */
afterEach(cleanup);

const QUESTION: QuizFace = {
  side: "question",
  question: {
    section: OPTIONAL_MATCH.section,
    direction: "forward",
    prompt: OPTIONAL_MATCH.name,
    choices: OPTIONAL_MATCH.choices,
    onSelect: () => undefined,
    onAnswer: () => undefined,
  },
};

const BACK: QuizFace = {
  side: "back",
  back: {
    section: OPTIONAL_MATCH.section,
    kind: "prose",
    chosen: OPTIONAL_MATCH.role,
    correct: OPTIONAL_MATCH.role,
  },
};

describe("QuizPage", () => {
  it("表と裏のどちらでも進捗を出す", () => {
    for (const face of [QUESTION, BACK]) {
      render(<QuizPage counts={[38, 14, 8]} face={face} />);

      expect(screen.getByRole("progressbar", { name: "進捗" })).toBeDefined();
      cleanup();
    }
  });

  it("表では裏面を出さない", () => {
    render(<QuizPage counts={[38, 14, 8]} face={QUESTION} />);

    expect(screen.getByRole("button", { name: "決定" })).toBeDefined();
    expect(screen.queryByRole("img", { name: "正解" })).toBeNull();
  });

  it("裏では肢を出さない", () => {
    render(<QuizPage counts={[38, 14, 8]} face={BACK} />);

    expect(screen.getByRole("img", { name: "正解" })).toBeDefined();
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });
});
