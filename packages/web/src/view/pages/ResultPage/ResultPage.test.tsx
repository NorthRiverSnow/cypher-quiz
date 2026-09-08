import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { ResultPage, type ResultPageProps } from "./ResultPage";

/* why: vitest の globals を切っているので RTL の自動 cleanup が実行されない */
afterEach(cleanup);

const BASE: ResultPageProps = {
  counts: [0, 0, 60],
  summary: {
    asked: 60,
    correct: 60,
    bySection: [{ section: "skeleton", asked: 12, correct: 12 }],
    missed: [],
    onOpenCard: () => undefined,
    onRestart: () => undefined,
    onRetryMissed: () => undefined,
  },
};

describe("ResultPage", () => {
  it("結果と進捗を並べる", () => {
    render(<ResultPage {...BASE} />);

    expect(screen.getByText("100%")).toBeDefined();
    expect(screen.getByRole("progressbar", { name: "進捗" })).toBeDefined();
  });
});
