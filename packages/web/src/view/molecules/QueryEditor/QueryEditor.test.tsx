import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "storybook/test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { WITH } from "../../../fixtures/cards";
import { QueryEditor, type QueryEditorProps } from "./QueryEditor";

afterEach(cleanup);

const BASE: QueryEditorProps = {
  code: WITH.code ?? [],
  onChange: () => undefined,
  onRun: () => undefined,
  onReset: () => undefined,
};

const button = (name: string) => screen.getByRole("button", { name });

describe("QueryEditor", () => {
  it("未編集なら色付きのまま出し、リセットは押せない", () => {
    const { container } = render(<QueryEditor {...BASE} />);

    expect(container.querySelector("pre")).not.toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(button("リセット")).toHaveProperty("disabled", true);
  });

  it("編集済みなら入力欄に本文を出す", () => {
    render(<QueryEditor {...BASE} value="MATCH (n) RETURN n" />);

    expect(screen.getByRole("textbox", { name: "クエリ" })).toHaveProperty(
      "value",
      "MATCH (n) RETURN n",
    );
    expect(button("リセット")).toHaveProperty("disabled", false);
  });

  it("打つと onChange に本文を渡す", async () => {
    const onChange = vi.fn();
    render(<QueryEditor {...BASE} value="MATCH" onChange={onChange} />);

    await userEvent.type(screen.getByRole("textbox", { name: "クエリ" }), "X");

    expect(onChange).toHaveBeenCalledExactlyOnceWith("MATCHX");
  });

  it("実行中はどちらも押せない", () => {
    render(<QueryEditor {...BASE} value="MATCH" status="running" />);

    expect(button("実行")).toHaveProperty("disabled", true);
    expect(button("リセット")).toHaveProperty("disabled", true);
  });

  /* why: 未接続で押せないのは実行だけ。編集を戻す操作は接続に関係ない */
  it("未接続では実行だけ押せない", () => {
    render(<QueryEditor {...BASE} value="MATCH" status="offline" />);

    expect(button("実行")).toHaveProperty("disabled", true);
    expect(button("リセット")).toHaveProperty("disabled", false);
  });

  it("拒否の理由を出す", () => {
    render(<QueryEditor {...BASE} value="CREATE (x)" status="rejected" />);

    expect(screen.getByText(/書き込みのクエリは実行できません/)).toBeDefined();
  });

  it("エラーは渡された文言を出す", () => {
    render(<QueryEditor {...BASE} status="error" errorMessage="Variable not defined" />);

    expect(screen.getByText("Variable not defined")).toBeDefined();
  });

  it("通常は何も知らせない", () => {
    render(<QueryEditor {...BASE} />);

    expect(screen.queryByRole("img", { name: "注意" })).toBeNull();
  });
});
