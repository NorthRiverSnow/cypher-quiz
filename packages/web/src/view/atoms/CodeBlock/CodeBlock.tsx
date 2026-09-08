import type { CSSProperties } from "react";

import type { CodeKind, CodeSegment } from "../../../types";
import { TEXT, Text } from "../Text/Text";

export type CodeBlockProps = {
  code: readonly CodeSegment[];
  /** 親が枠を持つときに使う。面も罫線も角丸も描かない */
  bare?: boolean;
};

const SEGMENT: Record<CodeKind, CSSProperties> = {
  kw: { color: "var(--accent)", fontWeight: "var(--weight-semibold)" },
  rel: { color: "var(--keep)", fontWeight: "var(--weight-semibold)" },
  hl: { color: "var(--warn)", fontWeight: "var(--weight-semibold)" },
  bad: { color: "var(--alarm)", fontWeight: "var(--weight-semibold)" },
  cm: { color: "var(--muted)" },
};

const SURFACE: CSSProperties = {
  background: "var(--panel-sunken)",
  border: "var(--border-width) solid var(--rule-soft)",
  borderRadius: "var(--radius)",
  padding: "var(--space-sm)",
  margin: 0,
  /* why: 空白の無いパターン連鎖は折り返せないので、溢れたらここで横スクロールさせる。
     scroll container になることで min-width: auto が 0 に解決され、
     親を突き抜けてページ全体が横スクロールすることもなくなる */
  overflowX: "auto",
};

const LINE: CSSProperties = {
  display: "block",
  /* why: 中身が空の行は高さ 0 になる（内容が無いと行boxが作られない）。
     連続した改行が詰まらないよう 1 行分を与える */
  minHeight: `${TEXT.code.lineHeight}em`,
  whiteSpace: "pre-wrap",
  /* why: 折り返した続きを 2 字下げる。下げないと行頭が揃い、折り返しが次の句に見える */
  paddingLeft: "2ch",
  textIndent: "-2ch",
};

/** 改行を含むセグメントの列を、行ごとのセグメントの列に割る */
const toLines = (code: readonly CodeSegment[]): CodeSegment[][] => {
  const lines: CodeSegment[][] = [[]];
  for (const segment of code) {
    segment.text.split("\n").forEach((text, idx) => {
      if (idx > 0) lines.push([]);
      lines[lines.length - 1]?.push({ ...segment, text });
    });
  }
  return lines;
};

const BARE: CSSProperties = { ...SURFACE, background: "none", border: "none", borderRadius: 0 };

export const CodeBlock = ({ code, bare = false }: CodeBlockProps) => (
  <pre style={bare ? BARE : SURFACE}>
    {/* why: pre > code は HTML の定型。字は Text の段階表から引く */}
    <Text as="code" variant="code">
      {toLines(code).map((line, lineIdx) => (
        <span key={lineIdx} style={LINE}>
          {line.map((segment, segmentIdx) =>
            segment.kind === undefined ? (
              segment.text
            ) : (
              <span key={segmentIdx} style={SEGMENT[segment.kind]}>
                {segment.text}
              </span>
            ),
          )}
        </span>
      ))}
    </Text>
  </pre>
);
