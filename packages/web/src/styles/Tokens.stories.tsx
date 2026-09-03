import type { Meta, StoryObj } from "@storybook/react-vite";

/* トークンを目で確認するための story。コンポーネントではないので src/view には置かない。
 * 16 進数の羅列を読んでも判断できないので、guides を隣に開いて見比べるためのもの。
 * ツールバーの Theme で light / dark を切り替えられる。 */

type Token = { name: string; role: string };

const SURFACES: Token[] = [
  { name: "--ground", role: "背景" },
  { name: "--panel", role: "カード面" },
  { name: "--panel-2", role: "コードブロック背景" },
  { name: "--rule", role: "罫線" },
  { name: "--rule-soft", role: "弱い罫線" },
];

const INKS: Token[] = [
  { name: "--ink", role: "本文" },
  { name: "--ink-soft", role: "弱い本文" },
  { name: "--muted", role: "ラベル・コメント" },
];

const SEMANTIC: Token[] = [
  { name: "--accent", role: "構造・キーワード → 選択中の肢、進捗バー" },
  { name: "--keep", role: "正解 → 正答の罫線、正しい肢、コード中のリレーション型" },
  { name: "--alarm", role: "誤り → 誤答の罫線、誤った肢" },
  { name: "--warn", role: "注意 → 罠、引っかけの注記" },
];

/* 淡い面。自色を載せると light では AA に届かない（tokens.css 参照）ので、
 * 対になる意味色を実際に載せて見えるようにしてある */
const TINTS: Token[] = [
  { name: "--accent-bg", role: "選択中の肢の面" },
  { name: "--keep-bg", role: "正解の面" },
  { name: "--alarm-bg", role: "誤答の面" },
  { name: "--warn-bg", role: "注意の面" },
];

const ENTITIES: Token[] = [
  { name: "--team", role: "Team" },
  { name: "--engineer", role: "Engineer" },
  { name: "--service", role: "Service" },
  { name: "--incident", role: "Incident" },
];

/* Material Symbols Rounded の warning。ligature（"warning"）で書くと
 * フォントが届く前に文字列がそのまま見えるのでコードポイントで指定する。
 * Symbols は旧 Material Icons と番号が違う（e002 ではなく f083）。 */
const ICON_WARNING = "\uf083";

/* 注記の行の高さ。アイコン側と共有する。
 * アイコンを「テキストの行box と同じ高さの箱」に入れて中央寄せすると、
 * 1 行目と光学的に揃い、折り返しても字下げが保たれる。
 * marginTop で押し下げる方法は font-size を変えると崩れるので採らない。 */
const NOTE_LINE_HEIGHT = 1.75;

const WarnMark = () => (
  <span
    style={{
      flex: "none",
      display: "grid",
      placeItems: "center",
      height: `${NOTE_LINE_HEIGHT}em`,
    }}
  >
    <span
      role="img"
      aria-label="注意"
      style={{
        fontFamily: "var(--font-icon)",
        fontVariationSettings: '"FILL" 0, "wght" 500, "opsz" 20',
        fontSize: "1.25rem",
        lineHeight: 1,
        color: "var(--warn)",
      }}
    >
      {ICON_WARNING}
    </span>
  </span>
);

const Swatch = ({ name, role }: Token) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "3.5rem 11rem 1fr",
      alignItems: "center",
      gap: "0.9rem",
      padding: "0.3rem 0",
    }}
  >
    <div
      style={{
        height: "2.2rem",
        borderRadius: 3,
        background: `var(${name})`,
        border: "1px solid var(--rule)",
      }}
    />
    <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>{name}</code>
    <span style={{ color: "var(--muted)", fontSize: "0.86rem" }}>{role}</span>
  </div>
);

const TintSwatch = ({ name, role }: Token) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "3.5rem 11rem 1fr",
      alignItems: "center",
      gap: "0.9rem",
      padding: "0.3rem 0",
    }}
  >
    <div
      style={{
        height: "2.2rem",
        borderRadius: 3,
        background: `var(${name})`,
        border: "1px solid var(--rule)",
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
    <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>{name}</code>
    <span style={{ color: "var(--muted)", fontSize: "0.86rem" }}>{role}</span>
  </div>
);

const Group = ({
  title,
  tokens,
  tint = false,
}: {
  title: string;
  tokens: Token[];
  tint?: boolean;
}) => (
  <section style={{ marginBottom: "2.25rem" }}>
    <p
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "0.72rem",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: "var(--accent)",
        margin: "0 0 0.6rem",
      }}
    >
      {title}
    </p>
    {tokens.map((t) =>
      tint ? <TintSwatch key={t.name} {...t} /> : <Swatch key={t.name} {...t} />,
    )}
  </section>
);

const Tokens = () => (
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
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.72rem",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--accent)",
          margin: "0 0 1rem",
        }}
      >
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
      <p
        style={{
          maxWidth: "var(--col)",
          color: "var(--ink-soft)",
          margin: "0 0 2.5rem",
        }}
      >
        値は guides から逐語で移植したもの。ツールバーの Theme で light / dark を 切り替えて、guides
        を隣に開いて見比べる。
      </p>

      <Group title="§ Surfaces" tokens={SURFACES} />
      <Group title="§ Ink" tokens={INKS} />
      <Group title="§ Semantic — クイズの状態に対応" tokens={SEMANTIC} />
      <Group title="§ Semantic 淡い面 — 対になる意味色を載せてある" tokens={TINTS} tint />
      <Group title="§ Entities — 結果表のチップ" tokens={ENTITIES} />

      <section>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.72rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--accent)",
            margin: "0 0 0.9rem",
          }}
        >
          § Typography
        </p>
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
        <pre
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.795rem",
            lineHeight: 1.75,
            background: "var(--panel-2)",
            border: "1px solid var(--rule-soft)",
            borderRadius: 3,
            padding: "0.75rem 0.85rem",
            margin: 0,
            overflowX: "auto",
          }}
        >
          <span style={{ color: "var(--muted)" }}>{"// 全エンジニアと、対応した件数\n"}</span>
          <span style={{ color: "var(--accent)", fontWeight: 600 }}>MATCH</span>
          {" (e:Engineer)\n"}
          <span style={{ color: "var(--accent)", fontWeight: 600 }}>OPTIONAL MATCH</span>
          {" (e)-[:"}
          <span style={{ color: "var(--keep)", fontWeight: 600 }}>RESPONDED_TO</span>
          {"]->(i:Incident)\n"}
          <span style={{ color: "var(--accent)", fontWeight: 600 }}>RETURN</span>
          {" e.name, count(i) "}
          <span style={{ color: "var(--accent)", fontWeight: 600 }}>AS</span>
          {" n"}
        </pre>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.775rem",
            lineHeight: 1.8,
            color: "var(--ink-soft)",
            borderLeft: "2px solid var(--keep)",
            padding: "0.1rem 0 0.1rem 0.7rem",
            marginTop: "0.9rem",
          }}
        >
          Killua Zoldyck{"  "}
          <b style={{ color: "var(--keep)" }}>0</b>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.35rem",
            fontSize: "0.86rem",
            lineHeight: NOTE_LINE_HEIGHT,
            color: "var(--ink-soft)",
            background: "var(--warn-bg)",
            borderLeft: "2px solid var(--warn)",
            padding: "0.5rem 0.7rem",
            marginTop: "0.9rem",
          }}
        >
          <WarnMark />
          <span>
            DISTINCT を落として{" "}
            <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>count(t)</code>{" "}
            にすると、13 が 20 になる。
          </span>
        </div>
      </section>
    </div>
  </div>
);

const meta = {
  title: "意匠/トークン",
  component: Tokens,
} satisfies Meta<typeof Tokens>;

export default meta;

export const すべて: StoryObj<typeof meta> = {};
