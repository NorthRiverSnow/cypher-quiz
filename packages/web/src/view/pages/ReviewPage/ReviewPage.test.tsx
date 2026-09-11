import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "storybook/test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { OPTIONAL_MATCH } from "../../../fixtures/cards";
import { ReviewPage, type ReviewPageProps } from "./ReviewPage";

afterEach(cleanup);

const BASE: ReviewPageProps = {
  section: OPTIONAL_MATCH.section,
  direction: "forward",
  prompt: OPTIONAL_MATCH.name,
  onBack: () => undefined,
  back: {
    correct: OPTIONAL_MATCH.role,
    chosen: OPTIONAL_MATCH.choices[0] ?? "",
    code: OPTIONAL_MATCH.code,
  },
};

describe("ReviewPage", () => {
  /* why: カードの外に置くとタイトルに見えて、設問と読めない。
     カードの中に入っているかは Storybook で見る */
  it("設問を「問題」の見出しとともに出す", () => {
    render(<ReviewPage {...BASE} />);

    expect(screen.getByText("問題")).toBeDefined();
    expect(screen.getByRole("heading", { name: OPTIONAL_MATCH.name })).toBeDefined();
  });

  /* why: 解き直しではないので、残り枚数は判断に使えない */
  it("進捗バーを出さない", () => {
    render(<ReviewPage {...BASE} />);

    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("選んだ肢と正しい肢を並べる", () => {
    render(<ReviewPage {...BASE} />);

    expect(screen.getByText(OPTIONAL_MATCH.role)).toBeDefined();
    expect(screen.getByText(OPTIONAL_MATCH.choices[0] ?? "")).toBeDefined();
    expect(screen.getByRole("img", { name: "不正解" })).toBeDefined();
  });

  /* why: 正誤は chosen === correct で決まる。当時選んだ文言を渡せば丸バツが再現する */
  it("正解していた問題なら正解として出す", () => {
    render(<ReviewPage {...BASE} back={{ ...BASE.back, chosen: OPTIONAL_MATCH.role }} />);

    expect(screen.getByRole("img", { name: "正解" })).toBeDefined();
  });

  it("戻るボタンで結果へ帰る", async () => {
    const onBack = vi.fn();
    render(<ReviewPage {...BASE} onBack={onBack} />);

    await userEvent.click(screen.getByRole("button", { name: "結果に戻る" }));

    expect(onBack).toHaveBeenCalledOnce();
  });

  it("編集欄を渡せばクエリを実行できる", async () => {
    const onRun = vi.fn();
    render(
      <ReviewPage
        {...BASE}
        back={{
          ...BASE.back,
          editor: { onChange: () => undefined, onRun, onReset: () => undefined },
        }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "実行" }));

    expect(onRun).toHaveBeenCalledOnce();
  });
});
