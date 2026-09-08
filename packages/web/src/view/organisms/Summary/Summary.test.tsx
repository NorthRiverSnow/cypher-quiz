import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "storybook/test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { type MissedCard, type SectionScore, Summary, type SummaryProps } from "./Summary";

/* why: vitest の globals を切っているので RTL の自動 cleanup が実行されない */
afterEach(cleanup);

const BY_SECTION: readonly SectionScore[] = [
  { section: "skeleton", asked: 12, correct: 12 },
  { section: "patterns", asked: 10, correct: 8 },
];

const MISSED: readonly MissedCard[] = [
  { section: "patterns", name: "varlen", direction: "reverse" },
  { section: "shaping", name: "ORDER BY", direction: "forward" },
];

const BASE: SummaryProps = {
  asked: 60,
  correct: 48,
  bySection: BY_SECTION,
  missed: MISSED,
  onOpenCard: () => undefined,
  onRestart: () => undefined,
  onRetryMissed: () => undefined,
};

const button = (name: string) => screen.getByRole("button", { name });

/* why: 桁は列で揃えるので数字がセルごとに分かれる。行の文字列で確かめる */
const row = (label: string) => screen.getByText(label).closest("div")?.textContent;

describe("Summary", () => {
  /* why: 49 / 60 は 81.67%。切り捨てと切り上げのどちらでもない値で確かめる */
  it("正解率を四捨五入して出す", () => {
    render(<Summary {...BASE} correct={49} />);

    expect(screen.getByText("82%")).toBeDefined();
    expect(screen.getByText("60 問中 49 問 正解")).toBeDefined();
  });

  it("章別は正解と出題の枚数を並べる", () => {
    render(<Summary {...BASE} />);

    expect(row("読み取りの骨格")).toBe("読み取りの骨格12/12");
    expect(row("パターンの書き方")).toBe("パターンの書き方8/10");
  });

  it("不正解のカードを方向つきで並べる", () => {
    render(<Summary {...BASE} />);

    expect(screen.getByText("varlen")).toBeDefined();
    expect(screen.getByText("目的 → 構文")).toBeDefined();
    expect(screen.getByText("ORDER BY")).toBeDefined();
    expect(screen.getByText("構文 → 目的")).toBeDefined();
  });

  it("不正解が無ければ不正解だけもう一度を出さない", () => {
    render(<Summary {...BASE} correct={60} missed={[]} />);

    expect(screen.queryByRole("button", { name: "不正解だけもう一度" })).toBeNull();
    expect(screen.queryByText("varlen")).toBeNull();
    expect(screen.getByText(/全問正解です/)).toBeDefined();
    expect(screen.queryByText(/不正解のカード/)).toBeNull();
  });

  it("不正解の行を押すとそのカードを渡す", async () => {
    const onOpenCard = vi.fn();
    render(<Summary {...BASE} onOpenCard={onOpenCard} />);

    await userEvent.click(screen.getByRole("button", { name: /ORDER BY/ }));

    expect(onOpenCard).toHaveBeenCalledExactlyOnceWith(MISSED[1]);
  });

  it("2 つのやり直しをそれぞれ呼ぶ", async () => {
    const onRestart = vi.fn();
    const onRetryMissed = vi.fn();
    render(<Summary {...BASE} onRestart={onRestart} onRetryMissed={onRetryMissed} />);

    await userEvent.click(button("もう一度"));
    await userEvent.click(button("不正解だけもう一度"));

    expect(onRestart).toHaveBeenCalledOnce();
    expect(onRetryMissed).toHaveBeenCalledOnce();
  });
});
