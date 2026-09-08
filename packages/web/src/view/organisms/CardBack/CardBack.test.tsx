import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "storybook/test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { WITH } from "../../../fixtures/cards";
import { CardBack, type CardBackProps } from "./CardBack";

afterEach(cleanup);

const BASE: CardBackProps = {
  section: "skeleton",
  kind: "prose",
  chosen: WITH.role,
  correct: WITH.role,
  onNext: () => undefined,
};

describe("CardBack", () => {
  it("実行して返ってきた行は表で出す", () => {
    render(<CardBack {...BASE} result={{ columns: ["n"], rows: [["29"]] }} />);

    expect(screen.getByRole("table")).toBeDefined();
    expect(screen.getByText("実行結果")).toBeDefined();
  });

  it("実行していなければ表を出さない", () => {
    render(<CardBack {...BASE} expected="Killua Zoldyck    0" />);

    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText("期待される実行結果")).toBeDefined();
  });

  it("次の問題へ進める", async () => {
    const onNext = vi.fn();
    render(<CardBack {...BASE} onNext={onNext} />);

    await userEvent.click(screen.getByRole("button", { name: "次の問題" }));

    expect(onNext).toHaveBeenCalledOnce();
  });

  it("最後の 1 枚では進む先を結果と書く", () => {
    render(<CardBack {...BASE} isLast />);

    expect(screen.getByRole("button", { name: "結果を見る" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "次の問題" })).toBeNull();
  });

  it("選んだ肢が正しければ正解にする", () => {
    render(<CardBack {...BASE} />);

    expect(screen.getByRole("img", { name: "正解" })).toBeDefined();
    expect(screen.queryByRole("img", { name: "不正解" })).toBeNull();
  });

  it("選んだ肢が違えば不正解にして、選んだ肢も並べる", () => {
    const chosen = WITH.choices[0] ?? "";
    render(<CardBack {...BASE} chosen={chosen} />);

    expect(screen.getByRole("img", { name: "不正解" })).toBeDefined();
    expect(screen.getByText("選んだ肢")).toBeDefined();
    expect(screen.getByText(chosen)).toBeDefined();
  });

  it("正解のときは選んだ肢を出さない", () => {
    render(<CardBack {...BASE} />);

    expect(screen.queryByText("選んだ肢")).toBeNull();
  });

  it("罠が無ければ注意を出さない", () => {
    render(<CardBack {...BASE} warn={WITH.warn} />);
    expect(screen.getByRole("img", { name: "罠" })).toBeDefined();

    cleanup();
    render(<CardBack {...BASE} />);
    expect(screen.queryByRole("img", { name: "罠" })).toBeNull();
  });

  /* why: 出さない側だけを見ると、描画そのものを消しても素通りする */
  it("クエリと結果は渡したときだけ出す", () => {
    const shown = render(<CardBack {...BASE} code={WITH.code} expected={WITH.expected} />);
    expect(shown.container.querySelector("pre")).not.toBeNull();
    expect(screen.getByText(WITH.expected ?? "")).toBeDefined();

    cleanup();
    const hidden = render(<CardBack {...BASE} />);
    expect(hidden.container.querySelector("pre")).toBeNull();
  });

  /* why: 道具の押せる押せないは QueryEditor が持つ。ここで見るのは
     「実行できるカードか」の判断だけ */
  it("editor を渡さなければ道具を出さない", () => {
    const { container } = render(<CardBack {...BASE} code={WITH.code} />);

    expect(container.querySelector("pre")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "実行" })).toBeNull();
    expect(screen.queryByRole("button", { name: "リセット" })).toBeNull();
  });

  it("editor を渡せば実行できる", () => {
    render(
      <CardBack
        {...BASE}
        code={WITH.code}
        editor={{ onChange: vi.fn(), onRun: vi.fn(), onReset: vi.fn() }}
      />,
    );

    expect(screen.getByRole("button", { name: "実行" })).toHaveProperty("disabled", false);
  });

  it("クエリが無ければ道具も出さない", () => {
    render(<CardBack {...BASE} editor={{ onChange: vi.fn(), onRun: vi.fn(), onReset: vi.fn() }} />);

    expect(screen.queryByRole("button", { name: "実行" })).toBeNull();
  });
});
