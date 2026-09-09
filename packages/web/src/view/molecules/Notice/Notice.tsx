import type { NoticeTone } from "../../../types";
import { IconButton } from "../../atoms/IconButton/IconButton";
import { Note } from "../Note/Note";

export type NoticeProps = {
  tone: NoticeTone;
  title: string;
  /** サーバやブラウザからの文言 */
  detail?: string;
  onDismiss: () => void;
};

const ICON_LABEL: Record<NoticeTone, string> = { alarm: "エラー", warn: "注意" };

export const Notice = ({ tone, title, detail, onDismiss }: NoticeProps) => (
  <Note
    tone={tone}
    icon="warning"
    iconLabel={ICON_LABEL[tone]}
    action={<IconButton icon="close" label="閉じる" onClick={onDismiss} />}
  >
    {detail === undefined ? title : `${title}。${detail}`}
  </Note>
);
