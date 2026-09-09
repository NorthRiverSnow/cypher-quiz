import { AsyncLocalStorage } from "node:async_hooks";

/* why: 引数で持ち回らずに「今どのリクエストか」を引けるようにする。await を越えても
   追随するので、ルートも DB も reqId を意識しなくてよい */
const storage = new AsyncLocalStorage<string>();

/* why: 起動時と後始末はリクエストの外で走る。そこも出せる形にしておく */
const OUTSIDE = "-";

/** fn の中と、その await より後も、同じ reqId を引ける */
export const withReqId = <T>(reqId: string, fn: () => T): T => storage.run(reqId, fn);

export const currentReqId = (): string => storage.getStore() ?? OUTSIDE;
