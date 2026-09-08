import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { ResultTable, type ResultCell } from "./ResultTable";

/* why: vitest の globals を切っているので RTL の自動 cleanup が実行されない */
afterEach(cleanup);

const COLUMNS = ["e", "name", "n"];
const ROWS: readonly (readonly ResultCell[])[] = [
  [{ kind: "engineer", text: "Killua Zoldyck" }, "Killua Zoldyck", "0"],
  [{ kind: "service", text: "telemetry-ingest" }, "telemetry-ingest", "3"],
];

const cellTexts = () =>
  screen.getAllByRole("row").map((row) => [...row.children].map((cell) => cell.textContent));

describe("ResultTable", () => {
  it("見出しを列見出しとして出す", () => {
    render(<ResultTable columns={COLUMNS} rows={ROWS} />);

    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual(
      COLUMNS,
    );
  });

  it("見出しの行と中身の行を並べる", () => {
    render(<ResultTable columns={COLUMNS} rows={ROWS} />);

    expect(cellTexts()).toEqual([
      COLUMNS,
      ["Killua Zoldyck", "Killua Zoldyck", "0"],
      ["telemetry-ingest", "telemetry-ingest", "3"],
    ]);
  });

  /* why: ノードのセルは object で来る。文字として扱うと [object Object] が出る */
  it("ノードのセルは中の文字を出す", () => {
    render(<ResultTable columns={["t"]} rows={[[{ kind: "team", text: "Grid Operations" }]]} />);

    expect(screen.getByText("Grid Operations")).toBeDefined();
    expect(screen.queryByText(/object/)).toBeNull();
  });

  it("行が無くても見出しは出す", () => {
    render(<ResultTable columns={COLUMNS} rows={[]} />);

    expect(screen.getAllByRole("columnheader")).toHaveLength(COLUMNS.length);
    expect(screen.getAllByRole("row")).toHaveLength(1);
  });
});
