import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import type { ConnectInput } from "../../organisms/ConnectForm/ConnectForm";
import { ConnectPage } from "./ConnectPage";

const LOCAL: ConnectInput = {
  uri: "bolt://localhost:7687",
  user: "neo4j",
  password: "workshop",
  database: "",
};

const meta = {
  title: "pages/ConnectPage",
  component: ConnectPage,
  parameters: { layout: "fullscreen" },
  args: {
    values: LOCAL,
    onChange: fn(),
    onConnect: fn(),
    onStart: fn(),
    onDisconnect: fn(),
  },
} satisfies Meta<typeof ConnectPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 既定: Story = {};

export const dev自動接続中: Story = { args: { status: "dev-auto" } };
