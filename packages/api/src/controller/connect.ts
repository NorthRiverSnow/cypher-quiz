import {
  type ApiError,
  type ConnectRequest,
  type ConnectionStatus,
  type Result,
  isOk,
  ok,
} from "@cypher-quiz/shared";

import type { DriverStore, Session } from "../neo4j/driverStore";

/** ルートはこの `id` をクッキーに載せる。本文には出さない */
export type Opened = Readonly<{ id: string; status: ConnectionStatus }>;

export type ConnectController = Readonly<{
  status: (id: string | undefined) => Promise<ConnectionStatus>;
  open: (id: string | undefined, request: ConnectRequest) => Promise<Result<Opened, ApiError>>;
  close: (id: string | undefined) => Promise<ConnectionStatus>;
}>;

const DISCONNECTED: ConnectionStatus = { connected: false };

/* why: password も database も返さない。フロントが要るのは「繋がっているか」と
   表示用の接続先だけ（docs/03_api.md#セッション識別子はフロントに渡さない） */
const connectedTo = ({ uri, mode }: Session): ConnectionStatus => ({ connected: true, uri, mode });

/**
 * 接続の開始・確認・終了。**HTTP もクッキーも知らない。**
 *
 * why: ルートに書くと、同じ手順を別のルートから呼べなくなる。何より、繋ぐ順番の
 * ような判断が HTTP の組み立てに埋もれる
 */
export const createConnectController = ({
  store,
}: Readonly<{ store: DriverStore }>): ConnectController => ({
  status: async (id) => {
    const session = await store.get(id);

    return session === undefined ? DISCONNECTED : connectedTo(session);
  },

  open: async (id, request) => {
    const opened = await store.open({ ...request, mode: "manual" });

    if (!isOk(opened)) {
      return opened;
    }

    /* why: 繋がったあとに前の接続を閉じる。先に閉じると、資格情報を間違えたときに
       今まで使えていた接続まで失う */
    await store.close(id);

    return ok({
      id: opened.value,
      status: { connected: true, uri: request.uri, mode: "manual" },
    });
  },

  close: async (id) => {
    await store.close(id);

    return DISCONNECTED;
  },
});
