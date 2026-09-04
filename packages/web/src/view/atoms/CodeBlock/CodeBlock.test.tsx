import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { CodeBlock, type CodeSegment } from "./CodeBlock";

afterEach(cleanup);

const lines = (container: HTMLElement) => [...(container.querySelector("pre")?.children ?? [])];

describe("CodeBlock", () => {
  it("セグメントの中の改行で行を割る", () => {
    const code: CodeSegment[] = [
      { text: "MATCH", kind: "kw" },
      { text: " (e:Engineer)\nRETURN" },
      { text: " e.name" },
    ];

    const { container } = render(<CodeBlock code={code} />);

    expect(lines(container).map((line) => line.textContent)).toEqual([
      "MATCH (e:Engineer)",
      "RETURN e.name",
    ]);
  });

  /* why: 連続する改行をまとめると行が 1 つ減り、間を空けて区切っていた文が地続きに見える。
     空の行も要素として出す——文字が無いので高さは LINE の min-height が与える */
  it("空行を 1 行として残す", () => {
    const { container } = render(<CodeBlock code={[{ text: "MATCH\n\nRETURN" }]} />);

    expect(lines(container).map((line) => line.textContent)).toEqual(["MATCH", "", "RETURN"]);
  });

  it("行を跨いだセグメントは両方の行で色を保つ", () => {
    const code: CodeSegment[] = [{ text: "// 1 行目\n// 2 行目", kind: "cm" }];

    const { container } = render(<CodeBlock code={code} />);

    expect(
      lines(container).map((line) => line.querySelector("span")?.getAttribute("style")),
    ).toEqual([expect.stringContaining("var(--muted)"), expect.stringContaining("var(--muted)")]);
  });

  it("種類ごとに色を割り当てる", () => {
    const code: CodeSegment[] = [
      { text: "MATCH", kind: "kw" },
      { text: "OWNS", kind: "rel" },
      { text: "'x'", kind: "hl" },
      { text: "count(t)", kind: "bad" },
      { text: "// c", kind: "cm" },
    ];

    const { container } = render(<CodeBlock code={code} />);

    expect(
      [...(lines(container)[0]?.querySelectorAll("span") ?? [])].map(
        (span) => /var\(--[a-z]+\)/.exec(span.getAttribute("style") ?? "")?.[0],
      ),
    ).toEqual(["var(--accent)", "var(--keep)", "var(--warn)", "var(--alarm)", "var(--muted)"]);
  });

  it("色の無いセグメントは span で包まない", () => {
    const { container } = render(<CodeBlock code={[{ text: "plain" }]} />);

    expect(lines(container)[0]?.querySelectorAll("span")).toHaveLength(0);
  });
});
