import type { CSSProperties } from "react";

import { Button } from "../../atoms/Button/Button";
import { Card } from "../../atoms/Card/Card";
import { Icon } from "../../atoms/Icon/Icon";
import { Text } from "../../atoms/Text/Text";
import { Note } from "../../molecules/Note/Note";

export type ErrorScreenProps = {
  /** 例外の文言。中身は開発者向けなので、そのまま出す */
  message: string;
  onReload: () => void;
};

const STACK: CSSProperties = { display: "grid", gap: "var(--space-md)" };

const HEADING: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: "var(--space-xs)",
};

/* 揃え方と実測値は docs/07_design.md#注記のアイコンの位置 */
const ICON_SHIFT: CSSProperties = { flex: "none", transform: "translateY(0.21rem)" };

const ACTIONS: CSSProperties = { display: "flex", justifyContent: "flex-end" };

export const ErrorScreen = ({ message, onReload }: ErrorScreenProps) => (
  <Card>
    <div style={STACK}>
      <div style={HEADING}>
        <span style={ICON_SHIFT}>
          <Icon name="cancel" color="var(--alarm)" />
        </span>
        <Text as="h2" variant="titleProse">
          画面表示に失敗しました
        </Text>
      </div>
      <Text variant="annotation" tone="soft">
        解いていた内容は端末に残っています。読み込み直すと、続きから始められます。
      </Text>
      <Note tone="alarm" icon="warning" iconLabel="エラー">
        {message}
      </Note>
      <div style={ACTIONS}>
        <Button onClick={onReload}>読み込み直す</Button>
      </div>
    </div>
  </Card>
);
