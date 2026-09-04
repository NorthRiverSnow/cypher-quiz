import { cleanup, render, screen, within } from "@testing-library/react";
import { userEvent } from "storybook/test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { ChoiceList } from "./ChoiceList";

const CHOICES = ["MATCH", "OPTIONAL MATCH", "WHERE", "WITH"];

/* why: vitest の globals を切っているので RTL の自動 cleanup が走らない */
afterEach(cleanup);

const checkedFlags = () =>
  screen.getAllByRole("radio").map((radio) => radio.getAttribute("aria-checked"));

describe("ChoiceList", () => {
  it("押した肢の番号を onSelect に渡す", async () => {
    const onSelect = vi.fn();
    render(<ChoiceList choices={CHOICES} kind="syntax" onSelect={onSelect} />);

    await userEvent.click(screen.getAllByRole("radio")[1]!);

    expect(onSelect).toHaveBeenCalledExactlyOnceWith(1);
  });

  it("selected の肢だけ aria-checked が true になる", () => {
    render(<ChoiceList choices={CHOICES} kind="syntax" selected={2} onSelect={vi.fn()} />);

    expect(checkedFlags()).toEqual(["false", "false", "true", "false"]);
  });

  it("selected を渡さなければどれも選ばれていない", () => {
    render(<ChoiceList choices={CHOICES} kind="syntax" onSelect={vi.fn()} />);

    expect(checkedFlags()).toEqual(["false", "false", "false", "false"]);
  });

  it("番号は 1 から振る", () => {
    render(<ChoiceList choices={CHOICES} kind="syntax" onSelect={vi.fn()} />);

    expect(screen.getAllByRole("radio").map((radio) => radio.textContent)).toEqual([
      "1MATCH",
      "2OPTIONAL MATCH",
      "3WHERE",
      "4WITH",
    ]);
  });

  /* why: radiogroup で囲まないと「4 個中 2 個目」が読み上げられず、
     ただのボタン 4 個になる */
  it("肢をすべて 1 つの radiogroup に入れる", () => {
    render(<ChoiceList choices={CHOICES} kind="syntax" onSelect={vi.fn()} />);

    const group = screen.getByRole("radiogroup", { name: "選択肢" });

    expect(within(group).getAllByRole("radio")).toHaveLength(CHOICES.length);
  });
});
