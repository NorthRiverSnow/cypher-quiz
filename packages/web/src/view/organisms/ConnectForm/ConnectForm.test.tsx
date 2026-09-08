import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "storybook/test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { ConnectForm, type ConnectFormProps, type ConnectInput } from "./ConnectForm";

/* why: vitest の globals を切っているので RTL の自動 cleanup が実行されない */
afterEach(cleanup);

const EMPTY: ConnectInput = { uri: "", user: "", password: "", database: "" };

const LOCAL: ConnectInput = {
  uri: "bolt://localhost:7687",
  user: "neo4j",
  password: "workshop",
  database: "",
};

const BASE: ConnectFormProps = {
  values: EMPTY,
  onChange: () => undefined,
  onConnect: () => undefined,
  onStart: () => undefined,
  onDisconnect: () => undefined,
};

const button = (name: string) => screen.getByRole("button", { name });

describe("ConnectForm", () => {
  it("URI・ユーザー名・パスワードが埋まるまで接続を押せない", () => {
    render(<ConnectForm {...BASE} values={{ ...LOCAL, password: "  " }} />);

    expect(button("接続する")).toHaveProperty("disabled", true);
  });

  /* why: データベース名は任意。埋めなくても接続に進める */
  it("データベース名が空でも接続を押せる", async () => {
    const onConnect = vi.fn();
    render(<ConnectForm {...BASE} values={LOCAL} onConnect={onConnect} />);

    await userEvent.click(button("接続する"));

    expect(onConnect).toHaveBeenCalledOnce();
  });

  it("打った欄の名前と本文を onChange に渡す", async () => {
    const onChange = vi.fn();
    render(<ConnectForm {...BASE} values={LOCAL} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("URI"), "9");
    await userEvent.type(screen.getByLabelText("パスワード"), "!");

    expect(onChange.mock.calls).toEqual([
      ["uri", "bolt://localhost:76879"],
      ["password", "workshop!"],
    ]);
  });

  it("接続していなくても始められる", async () => {
    const onStart = vi.fn();
    render(<ConnectForm {...BASE} onStart={onStart} />);

    await userEvent.click(button("接続せずに始める"));

    expect(onStart).toHaveBeenCalledOnce();
  });

  it("接続中は入力も操作も止める", () => {
    render(<ConnectForm {...BASE} values={LOCAL} status="connecting" />);

    expect(screen.getByLabelText("URI")).toHaveProperty("disabled", true);
    expect(button("接続中…")).toHaveProperty("disabled", true);
    expect(button("接続せずに始める")).toHaveProperty("disabled", true);
  });

  it("接続失敗はサーバの文言を出す", () => {
    render(
      <ConnectForm {...BASE} values={LOCAL} status="failed" errorMessage="認証に失敗しました。" />,
    );

    expect(screen.getByText("認証に失敗しました。")).toBeDefined();
    expect(button("接続する")).toHaveProperty("disabled", false);
  });

  /* why: 自動接続の間は入力欄を出さない。出すと、その値で繋がっているように読める */
  it("dev 自動接続では入力欄を出さず、切断で手入力に戻せる", async () => {
    const onDisconnect = vi.fn();
    render(<ConnectForm {...BASE} status="dev-auto" onDisconnect={onDisconnect} />);

    expect(screen.queryByLabelText("パスワード")).toBeNull();

    await userEvent.click(button("切断して手で入力する"));

    expect(onDisconnect).toHaveBeenCalledOnce();
  });
});
