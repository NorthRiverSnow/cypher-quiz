/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** api が居るか。`"false"` を渡すのは配布版のビルドだけ（docs/04_roadmap.md#フェーズ-f--配る） */
  readonly VITE_HAS_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
