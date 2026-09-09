import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "storybook/test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { StartPage } from "./StartPage";

afterEach(cleanup);

describe("StartPage", () => {
  it("未着手ならスタートを出す", async () => {
    const onStart = vi.fn();
    render(<StartPage onStart={onStart} />);

    await userEvent.click(screen.getByRole("button", { name: "クイズスタート！" }));

    expect(onStart).toHaveBeenCalledOnce();
  });

  it("続きがあれば残り問題数を出す", () => {
    render(<StartPage onStart={() => undefined} remaining={32} />);

    expect(screen.getByRole("button", { name: "続きから（残り 32 問）" })).toBeDefined();
  });

  it("始める前は進捗を出さない", () => {
    render(<StartPage onStart={() => undefined} />);

    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});
