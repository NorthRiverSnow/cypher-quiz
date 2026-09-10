import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

const NAME = "cq_session";

/* 属性は docs/03_api.md#セッション識別子はフロントに渡さない

   why: maxAge も expires も付けない。付けるとタブを閉じても残る */
const OPTIONS = { httpOnly: true, sameSite: "Strict", path: "/api" } as const;

/** 本番では Secure を付ける。dev は http なので付けると送られない */
export type CookieDeps = Readonly<{ secure: boolean }>;

export const readSessionId = (c: Context): string | undefined => getCookie(c, NAME);

export const setSessionId = (c: Context, id: string, { secure }: CookieDeps): void => {
  setCookie(c, NAME, id, { ...OPTIONS, secure });
};

export const clearSessionId = (c: Context, { secure }: CookieDeps): void => {
  deleteCookie(c, NAME, { ...OPTIONS, secure });
};
