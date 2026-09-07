import type { CSSProperties } from "react";

import { TEXT, Text } from "../Text/Text";

/* why: guide の色付けは字句ではなく編集判断で付いている。変数 `e` に .hl を当てて
   「束縛済み変数の再利用」を見せる、`ASC LIMIT` を 1 つの span にまとめる、といった
   例があり、解析器では再現できない。だから色分けは入力データとして受け取る。 */
export type CodeKind = "kw" | "rel" | "hl" | "bad" | "cm";

export type CodeSegment = { text: string; kind?: CodeKind };

export type CodeBlockProps = { code: readonly CodeSegment[] };

const SEGMENT: Record<CodeKind, CSSProperties> = {
  kw: { color: "var(--accent)", fontWeight: 600 },
  rel: { color: "var(--keep)", fontWeight: 600 },
  hl: { color: "var(--warn)", fontWeight: 600 },
  bad: { color: "var(--alarm)", fontWeight: 600 },
  cm: { color: "var(--muted)" },
};

const SURFACE: CSSProperties = {
  background: "var(--panel-sunken)",
  border: "1px solid var(--rule-soft)",
  borderRadius: 3,
  padding: "0.75rem 0.85rem",
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

const toLines = (code: readonly CodeSegment[]): CodeSegment[][] => {
  const lines: CodeSegment[][] = [[]];
  for (const segment of code) {
    segment.text.split("\n").forEach((text, i) => {
      if (i > 0) lines.push([]);
      lines[lines.length - 1]?.push({ ...segment, text });
    });
  }
  return lines;
};

export const CodeBlock = ({ code }: CodeBlockProps) => (
  <pre style={SURFACE}>
    {/* why: pre > code は HTML の定型。字は Text の段階表から引く */}
    <Text as="code" variant="code">
      {toLines(code).map((line, i) => (
        <span key={i} style={LINE}>
          {line.map((segment, j) =>
            segment.kind === undefined ? (
              segment.text
            ) : (
              <span key={j} style={SEGMENT[segment.kind]}>
                {segment.text}
              </span>
            ),
          )}
        </span>
      ))}
    </Text>
  </pre>
);
