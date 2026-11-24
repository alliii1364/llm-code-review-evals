import { test } from "node:test";
import assert from "node:assert/strict";
import { range } from "../src/range.js";

test("includes the end value", () => {
  assert.deepEqual(range(1, 3), [1, 2, 3]);
});
