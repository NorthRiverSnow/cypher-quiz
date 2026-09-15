/** 0 以上 1 未満を返す。同じシードなら同じ列になる */
export type Rng = () => number;

/**
 * mulberry32。32bit の状態を 1 つ持つだけで、周期は 2^32。
 *
 * why: 出題順の再現に足りる強度で、実装が 4 行で済む。暗号用途には使わない
 */
export const createRng = (seed: number): Rng => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
};

/** Fisher-Yates。元の配列は変えない */
export const shuffle = <T>(items: readonly T[], rng: Rng): T[] => {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j] as T, shuffled[i] as T];
  }

  return shuffled;
};
