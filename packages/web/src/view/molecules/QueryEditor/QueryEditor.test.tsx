import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "storybook/test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { WITH } from "../../../fixtures/cards";
import { QueryEditor, type QueryEditorProps } from "./QueryEditor";

afterEach(cleanup);

const BASE: QueryEditorProps = {
  code: WITH.code ?? [],
  onChange: () => undefined,
  onEdit: () => undefined,
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

/* why: 一覧をそのまま送ると Neo4j の構文エラーが返るだけで、何を直せばよいか読めない */
describe("構文の一覧", () => {
  it("押す前に書き換えを促す", () => {
    render(<QueryEditor {...BASE} listing />);

    expect(screen.getByText(/1 文に書き換えて/)).toBeDefined();
  });

  it("一覧でなければ出さない", () => {
    render(<QueryEditor {...BASE} />);

    expect(screen.queryByText(/1 文に書き換えて/)).toBeNull();
  });

  it("編集を始めたら引っ込む", () => {
    render(<QueryEditor {...BASE} listing value="MATCH (n) RETURN n" />);

    expect(screen.queryByText(/1 文に書き換えて/)).toBeNull();
  });

  /* why: 実行の結果を優先する。直すべきものが 2 つ並ばない。
     本文は status で決まるので、注意と間違えていないかは見出しで見る */
  it("実行して失敗したらそちらを出す", () => {
    render(<QueryEditor {...BASE} listing status="error" errorMessage="構文が違います" />);

    expect(screen.getByText("構文が違います")).toBeDefined();
    expect(screen.getByRole("img", { name: "エラー" })).toBeDefined();
    expect(screen.queryByRole("img", { name: "注意" })).toBeNull();
  });

  it("押す前は注意として出す", () => {
    render(<QueryEditor {...BASE} listing />);

    expect(screen.getByRole("img", { name: "注意" })).toBeDefined();
  });
});

describe("編集に入る", () => {
  /* why: value が undefined のあいだ textarea が出ない。ここが唯一の入口 */
  it("編集ボタンで onEdit を呼ぶ", async () => {
    const onEdit = vi.fn();
    render(<QueryEditor {...BASE} onEdit={onEdit} />);

    await userEvent.click(screen.getByRole("button", { name: "編集" }));

    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("未編集のうちは textarea を出さない", () => {
    render(<QueryEditor {...BASE} />);

    expect(screen.queryByRole("textbox", { name: "クエリ" })).toBeNull();
  });

  it("value が入ると textarea になる", () => {
    render(<QueryEditor {...BASE} value="MATCH (n) RETURN n" />);

    expect(screen.getByRole("textbox", { name: "クエリ" })).toBeDefined();
  });

  it("編集中は編集ボタンを押せない", () => {
    render(<QueryEditor {...BASE} value="MATCH (n)" />);

    expect(screen.getByRole("button", { name: "編集" }).hasAttribute("disabled")).toBe(true);
  });
});
