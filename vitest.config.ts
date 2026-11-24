import { defineConfig } from "vitest/config";

// The agent-cases fixtures contain node:test files that are meant to fail. Keep Vitest out of them.
export default defineConfig({ test: { include: ["test/**/*.test.ts"] } });
