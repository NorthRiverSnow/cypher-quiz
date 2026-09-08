import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { ErrorScreen } from "./ErrorScreen";

const meta = {
  title: "organisms/ErrorScreen",
  component: ErrorScreen,
  parameters: { layout: "padded" },
  args: { message: "Cannot read properties of undefined (reading 'role')", onReload: fn() },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "var(--col)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ErrorScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 既定: Story = {};

/* ドライバや fetch の失敗はこの形で来る */
export const 長い文言: Story = {
  args: {
    message:
      "Neo4jError: Could not perform discovery. No routing servers available. Known routing table: RoutingTable[database=default database, expirationTime=0, currentTime=1767225600000, routers=[], readers=[], writers=[]]",
  },
};
