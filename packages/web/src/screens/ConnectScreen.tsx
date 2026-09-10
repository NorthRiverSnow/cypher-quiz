import { useState } from "react";
import { useNavigate } from "react-router";

import { useConnection } from "../controller/useConnection";
import { ConnectForm, type ConnectInput } from "../view/organisms/ConnectForm/ConnectForm";
import { ConnectPage } from "../view/pages/ConnectPage/ConnectPage";
import type { ScreenProps } from "./screen";

const EMPTY: ConnectInput = { uri: "", user: "", password: "", database: "" };

/* why: 接続の失敗は帯に出す。ConnectForm の failed は使わない
   （docs/01_spec.md#送ったクエリが原因の失敗はカードの中に出す） */
type Status = Parameters<typeof ConnectForm>[0]["status"];

export const ConnectScreen = ({ notices, band }: ScreenProps) => {
  const navigate = useNavigate();
  const { status, loading, connect, disconnect } = useConnection(notices);
  /* why: 入力欄のエコー。送るまで controller に持たせない——1 文字ごとに再取得が走る */
  const [values, setValues] = useState<ConnectInput>(EMPTY);

  const auto = status?.connected === true && status.mode === "dev-auto";
  const shown: Status = loading ? "connecting" : auto ? "dev-auto" : "idle";

  return (
    <ConnectPage
      notices={band}
      values={values}
      status={shown}
      onChange={(field, value) => setValues((prev) => ({ ...prev, [field]: value }))}
      onConnect={() => {
        void connect(values).then((ok) => {
          if (ok) {
            void navigate("/quiz");
          }
        });
      }}
      onStart={() => void navigate("/quiz")}
      onDisconnect={() => {
        setValues(EMPTY);
        void disconnect();
      }}
    />
  );
};
