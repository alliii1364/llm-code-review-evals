import { test } from "node:test";
import assert from "node:assert/strict";
import { range } from "../src/range.js";

test("single value", () => assert.deepEqual(range(5, 5), [5]));
test("negative start", () => assert.deepEqual(range(-2, 1), [-2, -1, 0, 1]));
test("empty when start is after end", () => assert.deepEqual(range(3, 1), []));
