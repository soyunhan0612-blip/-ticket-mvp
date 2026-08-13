import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    // 42개 파일 전부가 jsdom을 세우므로 부하가 걸린 전체 실행에서만 기본 5초를
    // 넘긴다. vitest.setup.ts의 asyncUtilTimeout 상향과 같은 이유다.
    testTimeout: 15_000,
  },
});
