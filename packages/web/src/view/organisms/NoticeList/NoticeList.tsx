import type { CSSProperties } from "react";

import type { NoticeItem, NoticeKind } from "../../../types";
import { Notice } from "../../molecules/Notice/Notice";

export type NoticeListProps = {
  items: readonly NoticeItem[];
  onDismiss: (kind: NoticeKind) => void;
};

const LIST: CSSProperties = { display: "grid", gap: "var(--space-sm)" };

/* why: 空なら要素ごと消す。空の <div> を残すと親の grid の gap が 1 つ増え、間隔が広がる。
   aria-live を付けないのもこのため——読み上げには通知が増える前から領域が DOM に要る */
export const NoticeList = ({ items, onDismiss }: NoticeListProps) =>
  items.length === 0 ? null : (
    <div style={LIST}>
      {items.map(({ kind, tone, title, detail }) => (
        <Notice
          key={kind}
          tone={tone}
          title={title}
          detail={detail}
          onDismiss={() => onDismiss(kind)}
        />
      ))}
    </div>
  );
