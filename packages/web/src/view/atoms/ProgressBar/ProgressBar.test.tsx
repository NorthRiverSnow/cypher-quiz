import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { ProgressBar } from "./ProgressBar";

/* why: vitest の globals を切っているので RTL の自動 cleanup が実行されない */
afterEach(cleanup);

describe("ProgressBar", () => {
  it("残りは完了していない枚数", () => {
    render(<ProgressBar counts={[38, 14, 8]} />);

    expect(screen.getByText("残り 52 / 60")).toBeDefined();
  });

  it("全部完了すれば残りは 0", () => {
    render(<ProgressBar counts={[0, 0, 60]} />);

    expect(screen.getByText("残り 0 / 60")).toBeDefined();
  });

  /* why: 完了した枚数を読み上げに渡す。分布は色で見せるので値にできない */
  it("完了した枚数を進捗の値にする", () => {
    render(<ProgressBar counts={[38, 14, 8]} />);
    const bar = screen.getByRole("progressbar", { name: "進捗" });

    expect(bar.getAttribute("aria-valuenow")).toBe("8");
    expect(bar.getAttribute("aria-valuemax")).toBe("60");
  });

  /* why: 左から完了・1 回正解・まだの順。box の順に並べると緑が右端に出る */
  it("完了を左に置き、枚数の比を区画の幅にする", () => {
    render(<ProgressBar counts={[38, 14, 8]} />);
    const bar = screen.getByRole("progressbar", { name: "進捗" });

    expect([...bar.children].map((s) => (s as HTMLElement).style.flexGrow)).toEqual([
      "8",
      "14",
      "38",
    ]);
  });
});
