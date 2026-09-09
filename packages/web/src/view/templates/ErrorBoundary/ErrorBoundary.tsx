import { Component, type ErrorInfo, type ReactNode } from "react";

export type ErrorBoundaryProps = {
  /** 捕まえた例外を出す画面 */
  fallback: (error: Error) => ReactNode;
  children: ReactNode;
};

type ErrorBoundaryState = { error?: Error };

/* why: React に hook 版の境界が無い。クラスを使わない方針の唯一の例外
   （docs/02_architecture.md#クラスを使う唯一の場所） */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {};

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  /* why: 画面に出すのは文言だけ。スタックはここでコンソールに残す */
  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  override render() {
    const { error } = this.state;

    return error === undefined ? this.props.children : this.props.fallback(error);
  }
}
