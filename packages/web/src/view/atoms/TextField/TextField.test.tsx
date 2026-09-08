import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "storybook/test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { TextField } from "./TextField";

afterEach(cleanup);

describe("TextField", () => {
  it("打つと onChange に本文を渡す", async () => {
    const onChange = vi.fn();
    render(<TextField label="URI" value="bolt" onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("URI"), "X");

    expect(onChange).toHaveBeenCalledExactlyOnceWith("boltX");
  });

  /* why: 補足を label の中に置くと、欄の名前が「データベース名 任意。…」になり
     ラベルで引けなくなる */
  it("補足は読み上げの名前に混ざらない", () => {
    render(
      <TextField
        label="データベース名"
        value=""
        onChange={() => undefined}
        hint="任意。空でよい"
      />,
    );

    expect(screen.getByLabelText("データベース名")).toBeDefined();
    expect(screen.getByText("任意。空でよい")).toBeDefined();
  });

  it("伏せ字の欄は入力を隠す", () => {
    render(
      <TextField label="パスワード" type="password" value="workshop" onChange={() => undefined} />,
    );

    expect(screen.getByLabelText("パスワード")).toHaveProperty("type", "password");
  });

  it("入力できないときは打てない", async () => {
    const onChange = vi.fn();
    render(<TextField label="URI" value="bolt" onChange={onChange} disabled />);

    await userEvent.type(screen.getByLabelText("URI"), "X");

    expect(onChange).not.toHaveBeenCalled();
  });
});
