import { Icon } from "../../atoms/Icon/Icon";
import { Text } from "../../atoms/Text/Text";
import styles from "./SectionRow.module.css";

export type SectionRowProps = {
  label: string;
  /** 行の右端に出す状態。`0 / 10` や `進行中`（docs/01_spec.md#7-画面と導線） */
  status: string;
  checked: boolean;
  /** その章の問題を全て正解している。**強調して出す**（docs/07_design.md#章の行） */
  allCorrect?: boolean;
  onToggle: () => void;
  /** 成績をリセットする。**渡さなければボタンを出さない** */
  onReset?: () => void;
};

const Reset = () => (
  <>
    <Text variant="micro" tone="alarm">
      成績をリセット
    </Text>
    <Icon name="restart_alt" size="0.9rem" color="var(--alarm)" />
  </>
);

export const SectionRow = ({
  label,
  status,
  checked,
  allCorrect = false,
  onToggle,
  onReset,
}: SectionRowProps) => (
  <div className={styles.row}>
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      className={styles.toggle}
      onClick={onToggle}
    >
      <Icon
        name={checked ? "check_box" : "check_box_outline_blank"}
        color={checked ? "var(--accent)" : "var(--muted)"}
      />
      <Text variant="annotation">{label}</Text>
      <Text
        variant="code"
        tone={allCorrect ? "keep" : "soft"}
        {...(allCorrect ? { weight: "semibold" as const } : {})}
      >
        {status}
      </Text>
    </button>
    {/* why: 読み上げの名前に章名を足す。一覧に 7 行並ぶので、見えている文言だけでは行を指せない */}
    {onReset === undefined ? (
      /* why: 場所だけ空けておく。無い行では状態が右端まで寄り、一覧で桁が揃わない */
      <span className={`${styles.reset} ${styles.blank}`} aria-hidden>
        <Reset />
      </span>
    ) : (
      <button
        type="button"
        className={styles.reset}
        aria-label={`${label}の成績をリセット`}
        onClick={onReset}
      >
        <Reset />
      </button>
    )}
  </div>
);
