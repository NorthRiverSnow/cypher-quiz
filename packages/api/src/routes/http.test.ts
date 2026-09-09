import { ERROR_KINDS } from "@cypher-quiz/shared";
import { describe, expect, it } from "vite-plus/test";

import { statusOf } from "./http";

describe("statusOf", () => {
  it.each([
    ["not-connected", 401],
    ["read-only-violation", 403],
    ["syntax-error", 422],
    ["invalid-request", 422],
    ["timeout", 504],
    ["connect-failed", 502],
    ["unexpected", 500],
  ] as const)("%s → %d", (kind, status) => {
    expect(statusOf({ kind, message: "x" })).toBe(status);
  });

  /* why: 表に無い kind があると 500 に落ちる。型で塞いであることを件数でも確かめる */
  it("全ての kind に対応がある", () => {
    expect(ERROR_KINDS.map((kind) => statusOf({ kind, message: "x" }))).toHaveLength(
      ERROR_KINDS.length,
    );
  });
});
