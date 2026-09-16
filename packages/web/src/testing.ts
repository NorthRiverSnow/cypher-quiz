import { afterEach, beforeEach, vi } from "vite-plus/test";

/**
 * `fetch` を必ず失敗させる。**`AppRoutes` を描くテストが呼ぶ。**
 *
 * why: 描くと `useConnection` が `/api/connect` を叩く。テストに api は居ないので、
 * 繋ぎに行かせると `ECONNREFUSED` が何十行も出て、失敗の原因が埋もれる
 *
 * why: 未接続として扱われるのは繋ぎに行っても同じ。待ち時間だけが消える
 */
export const stubUnreachableApi = () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", () => Promise.reject(new Error("api は居ない")));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
};
