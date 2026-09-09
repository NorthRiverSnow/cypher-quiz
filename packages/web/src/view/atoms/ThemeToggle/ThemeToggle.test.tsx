import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "storybook/test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { ThemeToggle } from "./ThemeToggle";

afterEach(cleanup);

describe("ThemeToggle", () => {
  it("light では dark へ切り替える口を出す", async () => {
    const onToggle = vi.fn();
    render(<ThemeToggle theme="light" onToggle={onToggle} />);

    await userEvent.click(screen.getByRole("button", { name: "dark に切り替える" }));

    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("dark では light へ切り替える口を出す", () => {
    render(<ThemeToggle theme="dark" onToggle={() => undefined} />);

    expect(screen.getByRole("button", { name: "light に切り替える" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "dark に切り替える" })).toBeNull();
  });
});
