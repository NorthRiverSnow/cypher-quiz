import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { ResultTable, type ResultCell } from "./ResultTable";

/* why: vitest の globals を切っているので RTL の自動 cleanup が実行されない */
afterEach(cleanup);

const COLUMNS = ["種別", "name", "n"];
const ROWS: readonly (readonly ResultCell[])[] = [
  [{ chip: "engineer", text: "Engineer" }, "Killua Zoldyck", "0"],
  [{ chip: "service", text: "Service" }, "telemetry-ingest", "3"],
];

const cellTexts = () =>
  screen.getAllByRole("row").map((row) => [...row.children].map((cell) => cell.textContent));

describe("ResultTable", () => {
  it("見出しを列見出しとして出す", () => {
    render(<ResultTable columns={COLUMNS} rows={ROWS} />);

    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(COLUMNS);
  });

  it("見出しの行と中身の行を並べる", () => {
    render(<ResultTable columns={COLUMNS} rows={ROWS} />);

    expect(cellTexts()).toEqual([
      COLUMNS,
      ["Engineer", "Killua Zoldyck", "0"],
      ["Service", "telemetry-ingest", "3"],
    ]);
  });

  /* why: チップの指定は object で来る。文字として扱うと [object Object] が出る */
  it("チップのセルは中の文字を出す", () => {
    render(<ResultTable columns={["種別"]} rows={[[{ chip: "team", text: "Team" }]]} />);

    expect(screen.getByText("Team")).toBeDefined();
    expect(screen.queryByText(/object/)).toBeNull();
  });

  it("行が無くても見出しは出す", () => {
    render(<ResultTable columns={COLUMNS} rows={[]} />);

    expect(screen.getAllByRole("columnheader")).toHaveLength(COLUMNS.length);
    expect(screen.getAllByRole("row")).toHaveLength(1);
  });
});
