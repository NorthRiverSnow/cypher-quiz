import type { CSSProperties } from "react";

import { Button } from "../../atoms/Button/Button";
import { Card } from "../../atoms/Card/Card";
import { Text } from "../../atoms/Text/Text";
import { TextField } from "../../atoms/TextField/TextField";
import { Note } from "../../molecules/Note/Note";

export type ConnectInput = {
  uri: string;
  user: string;
  password: string;
  database: string;
};

export type ConnectField = keyof ConnectInput;

export type ConnectStatus = "idle" | "connecting" | "failed" | "dev-auto";

export type ConnectFormProps = {
  values: ConnectInput;
  onChange: (field: ConnectField, value: string) => void;
  onConnect: () => void;
  /* 接続せずに、または自動接続のまま出題へ進む */
  onStart: () => void;
  /* 自動接続を切って手入力に戻す */
  onDisconnect: () => void;
  status?: ConnectStatus;
  /* status が "failed" のときのサーバからの文言 */
  errorMessage?: string;
};

const STACK: CSSProperties = { display: "grid", gap: "var(--space-md)" };

const FIELDS: CSSProperties = { display: "grid", gap: "var(--space-sm)" };

const ACTIONS: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "var(--space-sm)",
};

const REQUIRED: readonly ConnectField[] = ["uri", "user", "password"];

export const ConnectForm = ({
  values,
  onChange,
  onConnect,
  onStart,
  onDisconnect,
  status = "idle",
  errorMessage,
}: ConnectFormProps) => {
  const connecting = status === "connecting";
  const filled = REQUIRED.every((field) => values[field].trim() !== "");

  return (
    <Card>
      <div style={STACK}>
        <Text as="h2" variant="titleProse">
          {status === "dev-auto" ? "DB に接続済み" : "DB に接続する"}
        </Text>

        {status === "dev-auto" ? (
          <>
            <Note tone="accent" icon="info" iconLabel="お知らせ">
              開発用の自動接続で繋がっています。パスワードはブラウザに渡っていません。
            </Note>
            <div style={ACTIONS}>
              <Button variant="quiet" onClick={onDisconnect}>
                切断して手で入力する
              </Button>
              <Button onClick={onStart}>始める</Button>
            </div>
          </>
        ) : (
          <>
            <Text variant="annotation" tone="soft">
              接続しなくても 60 問すべて解けます。繋ぐと、裏面のクエリを編集して実行できます。
            </Text>
            <div style={FIELDS}>
              <TextField
                label="URI"
                value={values.uri}
                onChange={(value) => onChange("uri", value)}
                placeholder="bolt://localhost:7687"
                disabled={connecting}
              />
              <TextField
                label="ユーザー名"
                value={values.user}
                onChange={(value) => onChange("user", value)}
                placeholder="neo4j"
                disabled={connecting}
              />
              <TextField
                label="パスワード"
                type="password"
                value={values.password}
                onChange={(value) => onChange("password", value)}
                disabled={connecting}
              />
              <TextField
                label="データベース名"
                value={values.database}
                onChange={(value) => onChange("database", value)}
                placeholder="neo4j"
                disabled={connecting}
                hint="任意。空のままにすると接続先の既定のデータベースに繋ぎます"
              />
            </div>
            {status === "failed" && (
              <Note tone="alarm" icon="warning" iconLabel="エラー">
                {errorMessage}
              </Note>
            )}
            <Text variant="annotation" tone="muted">
              入力した内容は保存しません。タブを閉じると接続は切れ、次回また入力します。
            </Text>
            <div style={ACTIONS}>
              <Button variant="quiet" onClick={onStart} disabled={connecting}>
                接続せずに始める
              </Button>
              <Button onClick={onConnect} disabled={!filled || connecting}>
                {connecting ? "接続中…" : "接続する"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
};
