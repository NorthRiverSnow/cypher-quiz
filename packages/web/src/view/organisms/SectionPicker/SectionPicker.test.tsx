import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "storybook/test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import type { SectionId } from "../../../types";
import { SectionPicker, type SectionChoice } from "./SectionPicker";

afterEach(cleanup);

const choice = (id: SectionId, label: string, checked: boolean): SectionChoice => ({
  id,
  label,
  status: "0 / 10",
  checked,
});

const SECTIONS = (checked: boolean): SectionChoice[] => [
  choice("skeleton", "読み取りの骨格", checked),
  choice("lists", "リストと集約", checked),
];

const setup = (sections: readonly SectionChoice[], handlers: Partial<Handlers> = {}) => {
  const onToggle = handlers.onToggle ?? vi.fn();
  const onToggleAll = handlers.onToggleAll ?? vi.fn();

  render(
    <SectionPicker
      sections={sections}
      allStatus="60 問・最初から"
      onToggle={onToggle}
      onToggleAll={onToggleAll}
    />,
  );

  return { onToggle, onToggleAll };
};

type Handlers = { onToggle: (id: SectionId) => void; onToggleAll: () => void };

const box = (name: string) => screen.getByRole("checkbox", { name: new RegExp(name) });

describe("SectionPicker", () => {
  it("「全て」を先頭に、章をその後ろに並べる", () => {
    setup(SECTIONS(false));

    const names = screen.getAllByRole("checkbox").map((el) => el.textContent);

    expect(names?.[0]).toContain("全て");
    expect(names?.[1]).toContain("読み取りの骨格");
    expect(names).toHaveLength(3);
  });

  it("章を押すとその id を渡す", async () => {
    const { onToggle } = setup(SECTIONS(false));

    await userEvent.click(box("リストと集約"));

    expect(onToggle).toHaveBeenCalledWith("lists");
  });

  it("「全て」を押すと onToggleAll を呼ぶ", async () => {
    const { onToggleAll, onToggle } = setup(SECTIONS(false));

    await userEvent.click(box("全て"));

    expect(onToggleAll).toHaveBeenCalledOnce();
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("全章が入ると「全て」も入る", () => {
    setup(SECTIONS(true));

    expect(box("全て").getAttribute("aria-checked")).toBe("true");
  });

  it("1 つでも外れていれば「全て」は外れる", () => {
    setup([choice("skeleton", "読み取りの骨格", true), choice("lists", "リストと集約", false)]);

    expect(box("全て").getAttribute("aria-checked")).toBe("false");
  });

  /* why: [].every は true。章が 0 本のときに「全て」が入って見える */
  it("章が 1 つも無ければ「全て」は入らない", () => {
    setup([]);

    expect(box("全て").getAttribute("aria-checked")).toBe("false");
  });
});
