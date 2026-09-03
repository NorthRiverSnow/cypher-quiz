import { withThemeByDataAttribute } from "@storybook/addon-themes";
import type { Preview, ReactRenderer } from "@storybook/react-vite";

import "../src/styles";

/* guides は light を既定に、OS 設定で dark に追従し、[data-theme] で手動上書きできる
 * 3 ブロック構成（tokens.css 参照）。ツールバーはその手動上書きの側を切り替える。
 * guides 自身には JS が無く切替 UI を持てないので、ここが初めて両方を並べて見られる場になる。 */
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
    controls: { expanded: true },
  },
};

export default preview;
