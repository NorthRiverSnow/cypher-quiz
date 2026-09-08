import type { CSSProperties } from "react";

import { Text } from "../../atoms/Text/Text";

export type EntityKind = "team" | "engineer" | "service" | "incident";

export type ResultCell = string | { kind: EntityKind; text: string };

export type ResultTableProps = {
  columns: readonly string[];
  rows: readonly (readonly ResultCell[])[];
};

const WRAP: CSSProperties = {
  /* why: 列が増えると器を超える。scroll container にすることで min-width: auto が
     0 に解決され、親を突き抜けてページ全体が横スクロールしない */
  overflowX: "auto",
};

const TABLE: CSSProperties = { borderCollapse: "collapse", width: "100%" };

const CELL: CSSProperties = {
  textAlign: "left",
  padding: "var(--space-xs) var(--space-sm)",
  borderBottom: "var(--border-width) solid var(--rule-soft)",
  /* why: 列の幅は中身で決まる。折り返すと数字の桁が縦に揃わなくなる */
  whiteSpace: "nowrap",
};

export const ResultTable = ({ columns, rows }: ResultTableProps) => (
  <div style={WRAP}>
    <table style={TABLE}>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c} style={CELL} scope="col">
              <Text variant="code" tone="muted">
                {c}
              </Text>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} style={CELL}>
                <Text variant="code" tone={typeof cell === "string" ? "soft" : cell.kind}>
                  {typeof cell === "string" ? cell : cell.text}
                </Text>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
