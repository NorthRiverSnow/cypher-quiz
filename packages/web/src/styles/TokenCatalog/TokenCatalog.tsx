import type { CSSProperties } from "react";

import { CodeBlock, type CodeSegment } from "../../view/atoms/CodeBlock/CodeBlock";
import { ResultBlock } from "../../view/atoms/ResultBlock/ResultBlock";
import { Text } from "../../view/atoms/Text/Text";
import { Note } from "../../view/molecules/Note/Note";
import { ENTITIES, INKS, SEMANTIC, SURFACES, TINTS, type Token } from "./tokenList";

/* このファイルの style は見本を並べるためのものだけ。字の型は Text が持つ
   （docs/07_design.md#5-文字の段階） */

const PAGE: CSSProperties = {
  background: "var(--ground)",
  color: "var(--ink)",
  minHeight: "100vh",
  padding: "var(--space-xl) var(--space-lg)",
};

const COLUMN: CSSProperties = { maxWidth: "var(--wide)", margin: "0 auto" };

const ROW: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "3.5rem 11rem 1fr",
  alignItems: "center",
  gap: "var(--space-sm)",
  padding: "var(--space-xs) 0",
};

const CHIP: CSSProperties = {
  height: "2.2rem",
  borderRadius: "var(--radius)",
  border: "var(--border-width) solid var(--rule)",
};

const HEAD: CSSProperties = { marginBottom: "var(--space-sm)" };

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
    <Text as="code" variant="code">
      {name}
    </Text>
    <Text variant="annotation" tone="muted">
      {role}
    </Text>
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
        color: `var(${name.replace("-bg", "")})`,
      }}
    >
      {/* why: micro ではなく code。micro は uppercase を持つので Aa が AA になり、
          小文字の字面を見られなくなる */}
      <Text variant="code">Aa</Text>
    </div>
    <Text as="code" variant="code">
      {name}
    </Text>
    <Text variant="annotation" tone="muted">
      {role}
    </Text>
  </div>
);

type GroupProps = { title: string; tokens: Token[]; tint?: boolean };

const Group = ({ title, tokens, tint = false }: GroupProps) => (
  <section style={{ marginBottom: "var(--space-xl)" }}>
    <div style={HEAD}>
      <Text variant="micro" tone="accent">
        {title}
      </Text>
    </div>
    {tokens.map((t) =>
      tint ? <TintSwatch key={t.name} {...t} /> : <Swatch key={t.name} {...t} />,
    )}
  </section>
);

export const TokenCatalog = () => (
  <div style={PAGE}>
    <div style={COLUMN}>
      <div style={{ marginBottom: "var(--space-md)" }}>
        <Text variant="micro" tone="accent">
          NordWind · Cypher Quiz · Design Tokens
        </Text>
      </div>
      <div style={{ marginBottom: "var(--space-md)" }}>
        <Text as="h1" variant="display">
          意匠の実値
        </Text>
      </div>
      <div style={{ maxWidth: "var(--col)", marginBottom: "var(--space-xl)" }}>
        <Text variant="prose" tone="soft">
          ツールバーの Theme で light / dark を切り替えて、guides を隣に開いて見比べる。
        </Text>
      </div>

      <Group title="§ Surfaces" tokens={SURFACES} />
      <Group title="§ Ink" tokens={INKS} />
      <Group title="§ Semantic — クイズの状態に対応" tokens={SEMANTIC} />
      <Group title="§ Semantic 淡い面 — 対になる意味色を載せてある" tokens={TINTS} tint />
      <Group title="§ Entities — 結果表のチップ" tokens={ENTITIES} />

      <section>
        <div style={{ marginBottom: "var(--space-sm)" }}>
          <Text variant="micro" tone="accent">
            § Typography
          </Text>
        </div>
        <div style={{ marginBottom: "var(--space-xs)" }}>
          <Text variant="display">見出しは Zen Old Mincho</Text>
        </div>
        <div style={{ marginBottom: "var(--space-xs)" }}>
          <Text variant="prose">
            本文は Zen Kaku Gothic New。OPTIONAL MATCH を使うのはどういうときか。
          </Text>
        </div>
        <CodeBlock code={SAMPLE_QUERY} />
        <div style={{ marginBottom: "var(--space-sm)" }}>
          <ResultBlock>
            {"Killua Zoldyck   "}
            <b style={{ color: "var(--keep)" }}>0</b>
          </ResultBlock>
        </div>
        <Note tone="warn" icon="warning" iconLabel="注意">
          DISTINCT を外して{" "}
          <Text as="code" variant="code">
            count(t)
          </Text>{" "}
          にすると、13 が 20 になる。
        </Note>
      </section>
    </div>
  </div>
);
