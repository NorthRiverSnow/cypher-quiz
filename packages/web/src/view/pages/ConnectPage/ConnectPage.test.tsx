import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { ConnectPage, type ConnectPageProps } from "./ConnectPage";

afterEach(cleanup);

const BASE: ConnectPageProps = {
  values: { uri: "", user: "", password: "", database: "" },
  onChange: () => undefined,
  onConnect: () => undefined,
  onStart: () => undefined,
  onDisconnect: () => undefined,
};

describe("ConnectPage", () => {
  it("接続の入力だけを出し、進捗は出さない", () => {
    render(<ConnectPage {...BASE} />);

    expect(screen.getByLabelText("URI")).toBeDefined();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});
