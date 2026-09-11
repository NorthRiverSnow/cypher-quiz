import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { ProgressBar } from "./ProgressBar";

afterEach(cleanup);

const grows = () =>
  [...screen.getByRole("progressbar", { name: "進捗" }).children].map(
    (span) => (span as HTMLElement).style.flexGrow,
  );

describe("ProgressBar", () => {
  /* why: 数字は画面に出さない。バーだけで進み具合を見せる */
  it("数字を出さない", () => {
    render(<ProgressBar counts={[38, 14, 8]} />);

    expect(screen.queryByText(/[0-9]/)).toBeNull();
  });

  it("答えた枚数を進捗の値にする", () => {
    render(<ProgressBar counts={[38, 14, 8]} />);
    const bar = screen.getByRole("progressbar", { name: "進捗" });

    expect(bar.getAttribute("aria-valuenow")).toBe("52");
    expect(bar.getAttribute("aria-valuemax")).toBe("60");
  });

  /* why: 数字を出さないぶん、読み上げには内訳を渡す */
  it("内訳を読み上げに渡す", () => {
    render(<ProgressBar counts={[38, 14, 8]} />);

    expect(screen.getByRole("progressbar", { name: "進捗" }).getAttribute("aria-valuetext")).toBe(
      "60 問中 38 問 正解、14 問 不正解",
    );
  });

  it("正解・不正解・まだ の順に並べ、枚数の比を区画の幅にする", () => {
    render(<ProgressBar counts={[38, 14, 8]} />);

    expect(grows()).toEqual(["38", "14", "8"]);
  });

  it("0 枚の区画は幅を持たない", () => {
    render(<ProgressBar counts={[0, 0, 60]} />);

    expect(grows()).toEqual(["0", "0", "60"]);
  });
});
