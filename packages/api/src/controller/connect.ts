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

/* 返す項目は docs/03_api.md#セッション識別子はフロントに渡さない */
const connectedTo = ({ uri, mode }: Session): ConnectionStatus => ({ connected: true, uri, mode });

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

    /* 順番の理由は docs/03_api.md#6-エンドポイント一覧 */
    await store.close(id);

    /* why: 返す uri は入力ではなく store が実際に繋いだもの
       （docs/03_api.md#ローカル以外は暗号化スキームに繋ぎ変える） */
    return ok({ id: opened.value.id, status: connectedTo(opened.value.session) });
  },

  close: async (id) => {
    await store.close(id);

    return DISCONNECTED;
  },
});
