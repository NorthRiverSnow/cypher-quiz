import type { Meta, StoryObj } from "@storybook/react-vite";

import { TokenCatalog } from "./TokenCatalog";

const meta = {
  title: "styles/トークン",
  component: TokenCatalog,
} satisfies Meta<typeof TokenCatalog>;

export default meta;

export const すべて: StoryObj<typeof meta> = {};
