/* 想定内の失敗を値で返す。バグは Result に包まず throw する
   （docs/02_architecture.md#2-失敗の扱い） */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export const isOk = <T, E>(result: Result<T, E>): result is { ok: true; value: T } => result.ok;

export const map = <T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> =>
  result.ok ? ok(fn(result.value)) : result;

export const mapErr = <T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> =>
  result.ok ? result : err(fn(result.error));

/**
 * 失敗なら fn を呼ばず、最初の理由をそのまま返す。
 *
 */
export const flatMap = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> => (result.ok ? fn(result.value) : result);

export const unwrapOr = <T, E>(result: Result<T, E>, fallback: T): T =>
  result.ok ? result.value : fallback;

/**
 * throw する処理を Result に変える。
 *
 * why: try を書く場所をここだけにする。失敗を自分のエラー型に変えることを強制するので、
 * unknown のまま持ち回れない
 *
 * @param onError 捕まえた値を、扱えるエラーに変える
 */
export const attempt = <T, E>(fn: () => T, onError: (cause: unknown) => E): Result<T, E> => {
  try {
    return ok(fn());
  } catch (cause) {
    return err(onError(cause));
  }
};

/**
 * 必ず実行し、throw したら代わりの値で続ける。
 *
 * why: 知らせる必要のない失敗に使う。握り潰しと違い、名前で「回復」だと分かる
 */
export const recover = <T>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};
