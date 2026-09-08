import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { CodeBlock, type CodeSegment } from "./CodeBlock";

afterEach(cleanup);

/* 行は pre > code の直下に並ぶ。字は Text が code 要素に当てる */
const lines = (container: HTMLElement) => [
  ...(container.querySelector("pre code")?.children ?? []),
];

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

  /* why: 守れるのは指定が消えていないことだけ。**閉じているかは測れない。**
     happy-dom はレイアウトを計算しないので、400 字の折り返せない行を入れても
     scrollWidth も clientWidth も 0 になる（実測）。
     実際に閉じているかは Skill の storybook-shot で撮って確かめる。

     why: それでも書くのは、この 1 行が消えると溢れが親を突き抜けて
     ページ全体が横スクロールするのに、コードを読んでも画面を見ても気づきにくいため */
  it("溢れを内側に閉じる指定が残っている", () => {
    const { container } = render(<CodeBlock code={[{ text: "MATCH (t:Team)" }]} />);

    expect(container.querySelector("pre")?.style.overflowX).toBe("auto");
  });
});
