/** 0 = まだ / 1 = 1 回正解 / 2 = 完了（docs/01_spec.md#6-復習間隔反復） */
export type Box = 0 | 1 | 2;

export const DONE: Box = 2;

/** 不正解なら 0 に戻す。正解は 1 つ進め、DONE で止まる */
export const nextBox = (box: Box, correct: boolean): Box => {
  if (!correct) return 0;

  return box === DONE ? DONE : ((box + 1) as Box);
};

export const isDone = (box: Box): boolean => box === DONE;

/** 全ての カード×方向 が完了したか */
export const allDone = (boxes: readonly Box[]): boolean => boxes.every(isDone);

/** 完了していない数 */
export const remaining = (boxes: readonly Box[]): number =>
  boxes.filter((box) => !isDone(box)).length;

/** box ごとの枚数。ProgressBar が受け取る形 */
export const distribution = (boxes: readonly Box[]): [number, number, number] => [
  boxes.filter((box) => box === 0).length,
  boxes.filter((box) => box === 1).length,
  boxes.filter((box) => box === 2).length,
];
