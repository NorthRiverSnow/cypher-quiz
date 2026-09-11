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

  /* why: 失敗しても消さない。エラーだけでは「1 文に割ればよい」が読めない */
  it("実行して失敗しても残す", () => {
    render(<QueryEditor {...BASE} listing status="error" errorMessage="構文が違います" />);

    expect(screen.getByText("構文が違います")).toBeDefined();
    expect(screen.getByText(/1 文に書き換えて/)).toBeDefined();
  });

  /* why: 何が起きたかを先に出す。直し方はその次 */
  it("エラーを先に、書き換えの案内を後に出す", () => {
    render(<QueryEditor {...BASE} listing status="error" errorMessage="構文が違います" />);

    const shown = screen.getAllByRole("img").map((icon) => icon.getAttribute("aria-label"));

    expect(shown.filter((label) => label === "エラー" || label === "注意")).toEqual([
      "エラー",
      "注意",
    ]);
  });

  /* why: 書き換えたのに失敗したなら、まだ 1 文になっていない見込みが高い */
  it("書き換えたあと失敗しても残す", () => {
    render(
      <QueryEditor
        {...BASE}
        listing
        value="CALL db.labels() SHOW INDEXES"
        status="error"
        errorMessage="構文が違います"
      />,
    );

    expect(screen.getByText(/1 文に書き換えて/)).toBeDefined();
  });

  /* why: 書き換えて通ったら用済み。出し続けると直すものが残っているように読める */
  it("書き換えて通ったら消える", () => {
    render(<QueryEditor {...BASE} listing value="MATCH (n) RETURN n" />);

    expect(screen.queryByText(/1 文に書き換えて/)).toBeNull();
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
