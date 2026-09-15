import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { Card } from "./Card";

afterEach(cleanup);

describe("Card", () => {
  it("見出しを渡すと、その名前のまとまりになる", () => {
    render(<Card label="章選択">中身</Card>);

    expect(screen.getByRole("group", { name: "章選択" })).toBeDefined();
  });

  it("見出しが無ければまとまりにしない", () => {
    render(<Card>中身</Card>);

    expect(screen.queryByRole("group")).toBeNull();
  });
});
