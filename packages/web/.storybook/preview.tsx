import { withThemeByDataAttribute } from "@storybook/addon-themes";
import type { Preview, ReactRenderer } from "@storybook/react-vite";

import "../src/styles";

/* ツールバーは [data-theme] の手動上書き側を切り替える（docs/07_design.md#1-テーマは-3-ブロック） */
const preview: Preview = {
  decorators: [
    withThemeByDataAttribute<ReactRenderer>({
      themes: { light: "light", dark: "dark" },
      defaultTheme: "light",
      attributeName: "data-theme",
    }),
  ],
  parameters: {
    layout: "fullscreen",
    /* why: Controls の「Update story」は story ファイルを書き換える。
       args をいじって試すのは自由でよいが、ソースに書き戻されると
       身に覚えのない差分になるので UI を出さない */
    controls: { expanded: true, disableSaveFromUI: true },
    options: {
      /* why: 既定の辞書順だと pages が templates より前に来てアトミックの順序が崩れる。
         styles を先頭に置くのは、部品より先にトークンを見て判断するため */
      storySort: {
        order: ["styles", "atoms", "molecules", "organisms", "templates", "pages"],
      },
    },
  },
};

export default preview;
