import type { ChangeEvent, CSSProperties } from "react";

import { CodeBlock, type CodeSegment } from "../../atoms/CodeBlock/CodeBlock";
import { IconButton } from "../../atoms/IconButton/IconButton";
import { Toolbar } from "../../atoms/Toolbar/Toolbar";
import { TEXT } from "../../atoms/Text/Text";
import { Note, type NoteTone } from "../Note/Note";

/* 実行できない理由。同時に 1 つしか起きない */
export type QueryStatus = "idle" | "running" | "offline" | "rejected" | "error";

export type QueryEditorProps = {
  code: readonly CodeSegment[];
  /* 編集後の本文。undefined なら未編集で、色付きのまま出す */
  value?: string;
  onChange: (value: string) => void;
  onRun: () => void;
  onReset: () => void;
  status?: QueryStatus;
  /* status が "error" のときの DB からの文言 */
  errorMessage?: string;
};

/* why: 編集すると色が消える。色分けは出題データが持っていて、編集後の文字列を
   解析する手段が無い（docs/01_spec.md#4-クエリの実行と編集）。
   字は段階表から引くので、textarea でも本文と同じ組みになる */
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
  /* why: 編集で書き込みに変えられるので、実行ボタンを出さないだけでは足りない。
     文言は「セキュリティ」ではなく歯止めとして書く。教材の安全装置なので
     （docs/01_spec.md#実行は読み取り専用） */
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

export const QueryEditor = ({
  code,
  value,
  onChange,
  onRun,
  onReset,
  status = "idle",
  errorMessage,
}: QueryEditorProps) => {
  const edited = value !== undefined;
  const note = status === "idle" || status === "running" ? undefined : MESSAGE[status];

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.currentTarget.value);
  };

  return (
    <div style={{ display: "grid", gap: "var(--space-xs)" }}>
      <div style={FRAME}>
        <Toolbar>
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
      {note !== undefined && (
        <Note tone={note.tone} icon="warning" iconLabel={note.label}>
          {status === "error" ? errorMessage : note.text}
        </Note>
      )}
    </div>
  );
};
