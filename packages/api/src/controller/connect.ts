import {
  type ApiError,
  type ConnectRequest,
  type ConnectionStatus,
  type Result,
  isOk,
  ok,
} from "@cypher-quiz/shared";

import type { DevAuto } from "../devAuto";
import type { Logger } from "../log";
import type { DriverStore, Session } from "../neo4j/driverStore";

/** ルートはこの `id` をクッキーに載せる。本文には出さない */
export type Opened = Readonly<{ id: string; status: ConnectionStatus }>;

/** `id` があるのは新しく繋いだときだけ。ルートはそのときにクッキーを張る */
export type Reported = Readonly<{ id?: string; status: ConnectionStatus }>;

export type ConnectController = Readonly<{
  /** 繋がっていなくて自動接続が有効なら、その場で繋ぐ（docs/03_api.md#専用ルートは作らない） */
  status: (id: string | undefined) => Promise<Reported>;
  open: (id: string | undefined, request: ConnectRequest) => Promise<Result<Opened, ApiError>>;
  close: (id: string | undefined) => Promise<ConnectionStatus>;
}>;

const DISCONNECTED: ConnectionStatus = { connected: false };

/* 返す項目は docs/03_api.md#セッション識別子はフロントに渡さない */
const connectedTo = ({ uri, mode }: Session): ConnectionStatus => ({ connected: true, uri, mode });

export const createConnectController = ({
  store,
  log,
  devAuto,
}: Readonly<{ store: DriverStore; log: Logger; devAuto?: DevAuto }>): ConnectController => ({
  status: async (id) => {
    const session = await store.get(id);

    if (session !== undefined) {
      return { status: connectedTo(session) };
    }

    if (devAuto === undefined) {
      return { status: DISCONNECTED };
    }

    const opened = await store.open({ ...devAuto, mode: "dev-auto" });

    /* why: 繋がらなくても未接続を返し、手入力の接続画面へ進ませる。
       ただし黙って返さない——資格情報の間違いは store の分類では error にならず、
       ここで残さないと理由がどこにも出ない */
    if (!isOk(opened)) {
      log({ event: "error", name: "DevAutoConnectFailed", message: opened.error.message }, "warn");

      return { status: DISCONNECTED };
    }

    return { id: opened.value.id, status: connectedTo(opened.value.session) };
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
