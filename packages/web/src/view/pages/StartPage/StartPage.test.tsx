import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "storybook/test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { StartPage, type StartPageProps } from "./StartPage";

afterEach(cleanup);

const PICKER: StartPageProps["picker"] = {
  sections: [{ id: "skeleton", label: "骨組み", status: "0 / 10", checked: true }],
  allStatus: "60 問・最初から",
  onToggle: () => undefined,
  onToggleAll: () => undefined,
};

const show = (props: Partial<StartPageProps> = {}) =>
  render(<StartPage picker={PICKER} canStart onStart={() => undefined} {...props} />);

describe("StartPage", () => {
  it("開始を押すと onStart を呼ぶ", async () => {
    const onStart = vi.fn();
    show({ onStart });

    await userEvent.click(screen.getByRole("button", { name: "開始" }));

    expect(onStart).toHaveBeenCalledOnce();
  });

  it("章を選んでいなければ開始を押せない", async () => {
    const onStart = vi.fn();
    show({ canStart: false, onStart });

    await userEvent.click(screen.getByRole("button", { name: "開始" }));

    expect(onStart).not.toHaveBeenCalled();
  });

  it("章の一覧を出す", () => {
    show();

    expect(screen.getByRole("checkbox", { name: "骨組み 0 / 10" })).toBeDefined();
  });

  it("始める前は進捗を出さない", () => {
    show();

    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});
