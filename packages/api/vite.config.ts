import { defineConfig } from "vite-plus";

/* why: DOM を使わない。既定の node のままにする。
   テストは Neo4j に繋ぐので、走らせる口は vp run test:api だけ
   （docs/02_architecture.md#テスト用の-db-はコンテナを分ける） */
export default defineConfig({ test: {} });
