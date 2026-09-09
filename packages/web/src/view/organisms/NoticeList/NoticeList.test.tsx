import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "storybook/test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import type { NoticeItem } from "../../../types";
import { NoticeList } from "./NoticeList";

afterEach(cleanup);

const ITEMS: readonly NoticeItem[] = [
  { kind: "connect", tone: "alarm", title: "DB に接続できません" },
  { kind: "progress-save", tone: "warn", title: "進捗を保存できません" },
];

describe("NoticeList", () => {
  it("受け取った通知をすべて出す", () => {
    render(<NoticeList items={ITEMS} onDismiss={fnNoop} />);

    expect(screen.getByText("DB に接続できません")).toBeDefined();
    expect(screen.getByText("進捗を保存できません")).toBeDefined();
  });

  it("閉じた通知の種類を onDismiss に渡す", async () => {
    const onDismiss = vi.fn();
    render(<NoticeList items={ITEMS} onDismiss={onDismiss} />);

    await userEvent.click(screen.getAllByRole("button", { name: "閉じる" })[1]!);

    expect(onDismiss).toHaveBeenCalledExactlyOnceWith("progress-save");
  });

  it("空なら何も描かない", () => {
    const { container } = render(<NoticeList items={[]} onDismiss={fnNoop} />);

    expect(container.firstChild).toBeNull();
  });
});

const fnNoop = () => undefined;
