import { AsyncLocalStorage } from "node:async_hooks";

/* docs/03_api.md#reqid-を持ち回さない */
const storage = new AsyncLocalStorage<string>();

/* why: 起動時と後始末はリクエストの外で走る。そこも書き出せる形にしておく */
const OUTSIDE = "-";

/** fn の中と、その await より後も、同じ reqId を引ける */
export const withReqId = <T>(reqId: string, fn: () => T): T => storage.run(reqId, fn);

export const currentReqId = (): string => storage.getStore() ?? OUTSIDE;
