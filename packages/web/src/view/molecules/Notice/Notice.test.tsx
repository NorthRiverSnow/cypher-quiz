import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "storybook/test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { Notice } from "./Notice";

afterEach(cleanup);

describe("Notice", () => {
  it("見出しと詳細を続けて出す", () => {
    render(
      <Notice
        tone="warn"
        title="進捗を保存できません"
        detail="次回は最初から"
        onDismiss={fnNoop}
      />,
    );

    expect(screen.getByText("進捗を保存できません。次回は最初から")).toBeDefined();
  });

  it("詳細が無ければ見出しだけを出す", () => {
    render(<Notice tone="alarm" title="DB に接続できません" onDismiss={fnNoop} />);

    expect(screen.getByText("DB に接続できません")).toBeDefined();
  });

  it("閉じると onDismiss を呼ぶ", async () => {
    const onDismiss = vi.fn();
    render(<Notice tone="alarm" title="失敗" onDismiss={onDismiss} />);

    await userEvent.click(screen.getByRole("button", { name: "閉じる" }));

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  /* why: 読み上げに「エラー」と「注意」を出し分ける。色だけでは重さが伝わらない */
  it("重さを読み上げの名前に出す", () => {
    render(<Notice tone="alarm" title="失敗" onDismiss={fnNoop} />);
    expect(screen.getByRole("img", { name: "エラー" })).toBeDefined();

    cleanup();

    render(<Notice tone="warn" title="不都合" onDismiss={fnNoop} />);
    expect(screen.getByRole("img", { name: "注意" })).toBeDefined();
  });
});

const fnNoop = () => undefined;
