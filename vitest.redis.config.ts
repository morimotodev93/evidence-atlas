import { mergeConfig } from "vitest/config";
import base from "./vitest.config";

export default mergeConfig(base, {
  test: {
    include: ["verification/demo-chat.redis-check.ts"],
    fileParallelism: false,
    testTimeout: 120_000,
  },
});
