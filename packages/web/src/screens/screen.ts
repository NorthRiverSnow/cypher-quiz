import type { ReactNode } from "react";

import type { Notices } from "../controller/useNotices";

/**
 * 画面が受け取るもの。
 *
 * why: 通知は 2 つの顔を持つ。`notices` は積む口で、`band` は描くもの。
 * 帯を組むのは routes.tsx の 1 箇所——画面ごとに組むと同じ JSX が 4 つ並ぶ
 */
export type ScreenProps = Readonly<{ notices: Notices; band: ReactNode }>;
