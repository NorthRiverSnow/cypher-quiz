import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "storybook/test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { WITH } from "../../../fixtures/cards";
import { CardBack, type CardBackProps } from "./CardBack";

/* why: vitest の globals を切っているので RTL の自動 cleanup が実行されない */
afterEach(cleanup);

const BASE: CardBackProps = {
  section: "skeleton",
  kind: "prose",
  chosen: WITH.role,
  correct: WITH.role,
};

describe("CardBack", () => {
  it("選んだ肢が正しければ正答にする", () => {
    render(<CardBack {...BASE} />);

    expect(screen.getByRole("img", { name: "正答" })).toBeDefined();
    expect(screen.queryByRole("img", { name: "誤答" })).toBeNull();
  });

  it("選んだ肢が違えば誤答にして、選んだ肢も並べる", () => {
    const chosen = WITH.choices[0] ?? "";
    render(<CardBack {...BASE} chosen={chosen} />);

    expect(screen.getByRole("img", { name: "誤答" })).toBeDefined();
    expect(screen.getByText("選んだ肢")).toBeDefined();
    expect(screen.getByText(chosen)).toBeDefined();
  });

  it("正答のときは選んだ肢を出さない", () => {
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

  it("onRun を渡さなければ実行ボタンを出さない", () => {
    render(<CardBack {...BASE} code={WITH.code} />);

    expect(screen.queryByRole("button", { name: "実行" })).toBeNull();
  });

  it("実行ボタンを押すと onRun を呼ぶ", async () => {
    const onRun = vi.fn();
    render(<CardBack {...BASE} code={WITH.code} onRun={onRun} />);

    await userEvent.click(screen.getByRole("button", { name: "実行" }));

    expect(onRun).toHaveBeenCalledOnce();
  });

  it("runDisabled なら押せない", async () => {
    const onRun = vi.fn();
    render(<CardBack {...BASE} code={WITH.code} onRun={onRun} runDisabled />);

    await userEvent.click(screen.getByRole("button", { name: "実行" }));

    expect(onRun).not.toHaveBeenCalled();
  });

  it("リセットを押すと onReset を呼ぶ", async () => {
    const onReset = vi.fn();
    render(<CardBack {...BASE} code={WITH.code} onReset={onReset} />);

    await userEvent.click(screen.getByRole("button", { name: "リセット" }));

    expect(onReset).toHaveBeenCalledOnce();
  });

  it("resetDisabled なら押せない", async () => {
    const onReset = vi.fn();
    render(<CardBack {...BASE} code={WITH.code} onReset={onReset} resetDisabled />);

    await userEvent.click(screen.getByRole("button", { name: "リセット" }));

    expect(onReset).not.toHaveBeenCalled();
  });

  /* why: クエリが無いカードでは、実行するものが無い */
  it("クエリが無ければ道具を出さない", () => {
    render(<CardBack {...BASE} onRun={vi.fn()} onReset={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "実行" })).toBeNull();
    expect(screen.queryByRole("button", { name: "リセット" })).toBeNull();
  });
});
