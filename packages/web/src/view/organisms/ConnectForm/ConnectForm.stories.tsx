import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { ConnectForm, type ConnectInput } from "./ConnectForm";

const EMPTY: ConnectInput = { uri: "", user: "", password: "", database: "" };

/* 受講者がローカルの Docker に繋ぐときの入力（docs/04_roadmap.md 検証 6） */
const LOCAL: ConnectInput = {
  uri: "bolt://localhost:7687",
  user: "neo4j",
  password: "workshop",
  database: "",
};

const meta = {
  title: "organisms/ConnectForm",
  component: ConnectForm,
  parameters: { layout: "padded" },
  args: {
    values: EMPTY,
    onChange: fn(),
    onConnect: fn(),
    onStart: fn(),
    onDisconnect: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "var(--col)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ConnectForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 未入力: Story = {};

/* パスワードが空なので、まだ接続は押せない */
export const 入力中: Story = {
  args: { values: { ...LOCAL, password: "" } },
};

export const 入力済み: Story = { args: { values: LOCAL } };

export const 接続中: Story = { args: { values: LOCAL, status: "connecting" } };

export const 接続失敗: Story = {
  args: {
    values: LOCAL,
    status: "failed",
    errorMessage: "認証に失敗しました。ユーザー名とパスワードを確認してください。",
  },
};

/* 開発時だけの経路。パスワードはサーバが自分の設定から読むのでブラウザに渡らない */
export const dev自動接続中: Story = { args: { status: "dev-auto" } };
