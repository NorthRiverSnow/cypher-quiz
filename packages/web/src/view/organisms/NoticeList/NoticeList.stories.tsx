import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import { NoticeList } from "./NoticeList";

const meta = {
  title: "organisms/NoticeList",
  component: NoticeList,
  parameters: { layout: "padded" },
  args: {
    items: [
      {
        kind: "progress-save",
        tone: "warn",
        title: "進捗を保存できません",
        detail: "この端末では保存が使えません。解き進められますが、次回は最初からになります",
      },
    ],
    onDismiss: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "var(--col)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NoticeList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 既定: Story = {};

export const 複数: Story = {
  args: {
    items: [
      { kind: "connect", tone: "alarm", title: "DB に接続できません" },
      {
        kind: "run",
        tone: "alarm",
        title: "クエリを実行できません",
        detail: "Variable `e.nam` not defined (line 2, column 8)",
      },
      { kind: "progress-save", tone: "warn", title: "進捗を保存できません" },
    ],
  },
};

export const 空: Story = { args: { items: [] } };
