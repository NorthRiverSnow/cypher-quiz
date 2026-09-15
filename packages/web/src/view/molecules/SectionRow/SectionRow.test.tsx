import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "storybook/test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { SectionRow } from "./SectionRow";

afterEach(cleanup);

const noop = () => undefined;

const row = (name: string) => screen.getByRole("checkbox", { name: new RegExp(name) });

describe("SectionRow", () => {
  it("押すと onToggle を呼ぶ", async () => {
    const onToggle = vi.fn();
    render(<SectionRow label="書き込み" status="0 / 10" checked={false} onToggle={onToggle} />);

    await userEvent.click(row("書き込み"));

    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("選択を aria-checked に出す", () => {
    render(<SectionRow label="書き込み" status="0 / 10" checked onToggle={noop} />);

    expect(row("書き込み").getAttribute("aria-checked")).toBe("true");
  });

  it("状態を読み上げの名前に含める", () => {
    render(<SectionRow label="書き込み" status="8 / 10" checked={false} onToggle={noop} />);

    expect(screen.getByRole("checkbox", { name: "書き込み 8 / 10" })).toBeDefined();
  });

  it("onReset が無ければリセットのボタンを出さない", () => {
    render(<SectionRow label="書き込み" status="0 / 10" checked={false} onToggle={noop} />);

    expect(screen.queryByRole("button", { name: /成績をリセット/ })).toBeNull();
  });

  it("リセットを押すと onReset を呼ぶ", async () => {
    const onReset = vi.fn();
    render(
      <SectionRow
        label="書き込み"
        status="8 / 10"
        checked={false}
        onToggle={noop}
        onReset={onReset}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "書き込みの成績をリセット" }));

    expect(onReset).toHaveBeenCalledOnce();
  });

  /* why: 一覧に 7 行並ぶ。見えている文言は全て同じなので、読み上げの名前で行を分ける */
  it("リセットの読み上げの名前に章名を入れる", () => {
    render(
      <>
        <SectionRow label="書き込み" status="8 / 10" checked onToggle={noop} onReset={noop} />
        <SectionRow label="リストと集約" status="2 / 12" checked onToggle={noop} onReset={noop} />
      </>,
    );

    expect(screen.getByRole("button", { name: "書き込みの成績をリセット" })).toBeDefined();
    expect(screen.getByRole("button", { name: "リストと集約の成績をリセット" })).toBeDefined();
  });
});
