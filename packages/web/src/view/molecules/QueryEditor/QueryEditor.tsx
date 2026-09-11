import type { ChangeEvent, CSSProperties } from "react";

import type { CodeSegment, QueryStatus } from "../../../types";
import { CodeBlock } from "../../atoms/CodeBlock/CodeBlock";
import { IconButton } from "../../atoms/IconButton/IconButton";
import { Toolbar } from "../../atoms/Toolbar/Toolbar";
import { TEXT } from "../../atoms/Text/Text";
import { Note, type NoteTone } from "../Note/Note";

export type QueryEditorProps = {
  code: readonly CodeSegment[];
  /** 編集後の本文。undefined なら未編集で、色付きのまま出す */
  value?: string;
  onChange: (value: string) => void;
  /** 編集を始める。**色付きの表示から textarea に切り替わる唯一の入口** */
  onEdit: () => void;
  onRun: () => void;
  onReset: () => void;
  status?: QueryStatus;
  /** status が "error" のときの DB からの文言 */
  errorMessage?: string;
  /** 例が構文の一覧で、1 本のクエリになっていない */
  listing?: boolean;
};

/* why: 道具と本文を 1 つの枠に収める。離すと道具がどの本文のものか読めない */
const FRAME: CSSProperties = {
  border: "var(--border-width) solid var(--rule-soft)",
  borderRadius: "var(--radius)",
  background: "var(--panel-sunken)",
  /* why: 溢れをここで閉じる。中の pre だけに任せると枠が中身の幅まで広がり、
     カードを突き抜けてページ全体が横スクロールする */
  overflow: "hidden",
};

const AREA: CSSProperties = {
  ...TEXT.code,
  display: "block",
  width: "100%",
  /* why: 6 行ぶんの高さを最低限として与える。行送りは段階表から引く */
  minHeight: `calc(${TEXT.code.lineHeight}em * 6)`,
  padding: "var(--space-sm)",
  /* why: 溝を常に確保する。スクロールバーが出た瞬間に字が横へ動くのを防ぐ。
     縦だけで足りるのは、textarea が折り返せない連なりも強制的に割るため */
  scrollbarGutter: "stable",
  /* why: 枠は親が持つ */
  border: "none",
  background: "none",
  /* why: 枠が溢れを閉じている（overflow: hidden）ので、外側に出るリングは切られる。
     内側へ振って枠の中に描く */
  outlineOffset: "calc(-1 * var(--border-width-bold))",
  color: "var(--ink)",
  resize: "vertical",
};

type Message = { tone: NoteTone; label: string; text: string };

const MESSAGE: Record<"offline" | "rejected" | "error", Message> = {
  rejected: {
    tone: "warn",
    label: "注意",
    text: "書き込みのクエリは実行できません。共有の DB を壊さないための歯止めです。",
  },
  offline: {
    tone: "warn",
    label: "注意",
    text: "DB に接続していません。接続すると実行できます。",
  },
  error: { tone: "alarm", label: "エラー", text: "" },
};

/* why: 押す前に出す。一覧をそのまま送ると Neo4j の構文エラーが返るだけで、
   何を直せばよいかが読めない */
const LISTING: Message = {
  tone: "warn",
  label: "注意",
  text: "この例は構文の一覧です。1 文に書き換えて試してください。",
};

export const QueryEditor = ({
  code,
  value,
  onChange,
  onEdit,
  onRun,
  onReset,
  status = "idle",
  errorMessage,
  listing = false,
}: QueryEditorProps) => {
  const edited = value !== undefined;
  const ran = status !== "idle" && status !== "running";
  /* why: 失敗しても一覧の注意は消さない。「何が起きたか」と「どう直すか」は別の話で、
     エラーだけ出しても 1 文に割ればよいことが読めない */
  const notes = [
    ran
      ? {
          ...MESSAGE[status],
          text: status === "error" ? (errorMessage ?? "") : MESSAGE[status].text,
        }
      : undefined,
    listing && (!edited || status === "error") ? LISTING : undefined,
  ].filter((note) => note !== undefined);

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.currentTarget.value);
  };

  return (
    <div style={{ display: "grid", gap: "var(--space-xs)" }}>
      <div style={FRAME}>
        <Toolbar>
          <IconButton
            icon="edit"
            label="編集"
            onClick={onEdit}
            disabled={edited || status === "running"}
          />
          <IconButton
            icon="restart_alt"
            label="リセット"
            onClick={onReset}
            disabled={!edited || status === "running"}
          />
          <IconButton
            icon="play_arrow"
            label="実行"
            onClick={onRun}
            disabled={status === "running" || status === "offline"}
          />
        </Toolbar>
        {edited ? (
          <textarea style={AREA} aria-label="クエリ" value={value} onChange={handleChange} />
        ) : (
          <CodeBlock code={code} bare />
        )}
      </div>
      {notes.map((note) => (
        <Note key={note.label + note.text} tone={note.tone} icon="warning" iconLabel={note.label}>
          {note.text}
        </Note>
      ))}
    </div>
  );
};
