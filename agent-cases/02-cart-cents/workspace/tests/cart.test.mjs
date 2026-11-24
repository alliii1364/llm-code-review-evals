import { test } from "node:test";
import assert from "node:assert/strict";
import { total } from "../src/cart.js";

test("single item", () => {
  assert.equal(total([{ price: 19.99, qty: 1 }]), 1999);
});
