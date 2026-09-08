import { defineConfig } from "vite-plus";

/* why: web と違って DOM を使わない。既定の node のままにする */
export default defineConfig({ test: {} });
