import type { CSSProperties } from "react";

import { CodeBlock, type CodeSegment } from "../../view/atoms/CodeBlock/CodeBlock";
import { Note } from "../../view/molecules/Note/Note";
import { ENTITIES, INKS, SEMANTIC, SURFACES, TINTS, type Token } from "./tokenList";

const ROW: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "3.5rem 11rem 1fr",
  alignItems: "center",
  gap: "0.9rem",
  padding: "0.3rem 0",
};

const CHIP: CSSProperties = {
  height: "2.2rem",
  borderRadius: 3,
  border: "1px solid var(--rule)",
};

const LABEL: CSSProperties = { fontFamily: "var(--font-mono)", fontSize: "0.82rem" };
const ROLE: CSSProperties = { color: "var(--muted)", fontSize: "0.86rem" };

const HEADING: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "0.72rem",
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: "var(--accent)",
};

const SAMPLE_QUERY: CodeSegment[] = [
  { text: "// 全エンジニアと、対応した件数", kind: "cm" },
  { text: "\n" },
  { text: "MATCH", kind: "kw" },
  { text: " (e:Engineer)\n" },
  { text: "OPTIONAL MATCH", kind: "kw" },
  { text: " (e)-[:" },
  { text: "RESPONDED_TO", kind: "rel" },
  { text: "]->(i:Incident)\n" },
  { text: "RETURN", kind: "kw" },
  { text: " e.name, count(i) " },
  { text: "AS", kind: "kw" },
  { text: " n" },
];

const Swatch = ({ name, role }: Token) => (
  <div style={ROW}>
    <div style={{ ...CHIP, background: `var(${name})` }} />
    <code style={LABEL}>{name}</code>
    <span style={ROLE}>{role}</span>
  </div>
);

/* why: 淡い面は自色を載せたときの読みにくさが判断材料なので、対の意味色で Aa を出す */
const TintSwatch = ({ name, role }: Token) => (
  <div style={ROW}>
    <div
      style={{
        ...CHIP,
        background: `var(${name})`,
        display: "grid",
        placeItems: "center",
        fontFamily: "var(--font-mono)",
        fontSize: "0.72rem",
        fontWeight: 600,
        color: `var(${name.replace("-bg", "")})`,
      }}
    >
      Aa
    </div>
    <code style={LABEL}>{name}</code>
    <span style={ROLE}>{role}</span>
  </div>
);

type GroupProps = { title: string; tokens: Token[]; tint?: boolean };

const Group = ({ title, tokens, tint = false }: GroupProps) => (
  <section style={{ marginBottom: "2.25rem" }}>
    <p style={{ ...HEADING, margin: "0 0 0.6rem" }}>{title}</p>
    {tokens.map((t) =>
      tint ? <TintSwatch key={t.name} {...t} /> : <Swatch key={t.name} {...t} />,
    )}
  </section>
);

export const TokenCatalog = () => (
  <div
    style={{
      background: "var(--ground)",
      color: "var(--ink)",
      fontFamily: "var(--font-sans)",
      minHeight: "100vh",
      padding: "2.5rem 1.5rem 4rem",
    }}
  >
    <div style={{ maxWidth: "var(--wide)", margin: "0 auto" }}>
      <p style={{ ...HEADING, letterSpacing: "0.22em", margin: "0 0 1rem" }}>
        NordWind · Cypher Quiz · Design Tokens
      </p>
      <h1
        style={{
          fontFamily: "var(--font-serif)",
          fontWeight: 900,
          fontSize: "clamp(1.8rem, 5vw, 2.6rem)",
          lineHeight: 1.32,
          margin: "0 0 1.25rem",
        }}
      >
        意匠の実値
      </h1>
      <p style={{ maxWidth: "var(--col)", color: "var(--ink-soft)", margin: "0 0 2.5rem" }}>
        ツールバーの Theme で light / dark を切り替えて、guides を隣に開いて見比べる。
      </p>

      <Group title="§ Surfaces" tokens={SURFACES} />
      <Group title="§ Ink" tokens={INKS} />
      <Group title="§ Semantic — クイズの状態に対応" tokens={SEMANTIC} />
      <Group title="§ Semantic 淡い面 — 対になる意味色を載せてある" tokens={TINTS} tint />
      <Group title="§ Entities — 結果表のチップ" tokens={ENTITIES} />

      <section>
        <p style={{ ...HEADING, margin: "0 0 0.9rem" }}>§ Typography</p>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 900,
            fontSize: "1.9rem",
            margin: "0 0 0.4rem",
          }}
        >
          見出しは Zen Old Mincho
        </p>
        <p style={{ margin: "0 0 0.4rem" }}>
          本文は Zen Kaku Gothic New。OPTIONAL MATCH を使うのはどういうときか。
        </p>
        <CodeBlock code={SAMPLE_QUERY} />
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.775rem",
            lineHeight: 1.8,
            color: "var(--ink-soft)",
            borderLeft: "2px solid var(--keep)",
            padding: "0.1rem 0 0.1rem 0.7rem",
            marginBottom: "0.9rem",
          }}
        >
          Killua Zoldyck{"  "}
          <b style={{ color: "var(--keep)" }}>0</b>
        </div>
        <Note tone="warn" icon="warning" iconLabel="注意">
          DISTINCT を落として{" "}
          <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>count(t)</code>{" "}
          にすると、13 が 20 になる。
        </Note>
      </section>
    </div>
  </div>
);
