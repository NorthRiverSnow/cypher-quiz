import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "storybook/test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { SECTION_LABELS } from "../../../types";
import { FlashCard, type FlashCardProps } from "./FlashCard";

/* why: vitest の globals を切っているので RTL の自動 cleanup が実行されない */
afterEach(cleanup);

const BASE: FlashCardProps = {
  section: "skeleton",
  direction: "forward",
  prompt: "OPTIONAL MATCH",
  choices: ["MATCH", "OPTIONAL MATCH", "WHERE", "WITH"],
  onSelect: () => undefined,
  onAnswer: () => undefined,
};

const answerButton = () => screen.getByRole("button", { name: "決定" });

describe("FlashCard", () => {
  it("押した肢の番号を onSelect に渡す", async () => {
    const onSelect = vi.fn();
    render(<FlashCard {...BASE} onSelect={onSelect} />);

    await userEvent.click(screen.getAllByRole("radio")[2]!);

    expect(onSelect).toHaveBeenCalledExactlyOnceWith(2);
  });

  it("肢を選ぶまで回答できない", async () => {
    const onAnswer = vi.fn();
    render(<FlashCard {...BASE} onAnswer={onAnswer} />);

    expect(answerButton()).toHaveProperty("disabled", true);

    await userEvent.click(answerButton());

    expect(onAnswer).not.toHaveBeenCalled();
  });

  it("肢を選んでいれば回答できる", async () => {
    const onAnswer = vi.fn();
    render(<FlashCard {...BASE} selected={1} onAnswer={onAnswer} />);

    expect(answerButton()).toHaveProperty("disabled", false);

    await userEvent.click(answerButton());

    expect(onAnswer).toHaveBeenCalledOnce();
  });

  it("章ラベルは SECTION_LABELS から引く", () => {
    render(<FlashCard {...BASE} section="subqueries" />);

    expect(screen.getByText(/^§ /).textContent).toBe(`§ ${SECTION_LABELS.subqueries}`);
  });

  /* why: 設問の大きさはインライン style なので、見出しでなくても見た目は変わらない。
     見出しの階層は画面に出ない */
  it("設問を見出しにする", () => {
    render(<FlashCard {...BASE} />);

    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("OPTIONAL MATCH");
  });
});
