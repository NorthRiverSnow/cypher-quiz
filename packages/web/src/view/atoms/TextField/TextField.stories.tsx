import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { TextField } from "./TextField";

const meta = {
  title: "atoms/TextField",
  component: TextField,
  parameters: { layout: "padded" },
  args: { label: "URI", value: "", onChange: fn(), placeholder: "bolt://localhost:7687" },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "var(--col)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TextField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 既定: Story = {};

export const 入力済み: Story = { args: { value: "neo4j+s://xxxxxxxx.databases.neo4j.io" } };

export const 伏せ字: Story = {
  args: { label: "パスワード", type: "password", value: "workshop", placeholder: undefined },
};

export const 補足つき: Story = {
  args: {
    label: "データベース名",
    placeholder: "neo4j",
    hint: "任意。空のままにすると既定のデータベースに繋ぎます",
  },
};

export const 入力できない: Story = { args: { value: "bolt://localhost:7687", disabled: true } };

/* 器の幅を超える値。入力欄は折り返さないので、中で横にスクロールする */
export const 長い値: Story = {
  args: {
    value:
      "neo4j+s://instance-01.production.ap-northeast-1.example.com:7687/?database=workshop-deck-2026",
  },
};
