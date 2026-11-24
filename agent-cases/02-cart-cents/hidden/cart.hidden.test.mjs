import { test } from "node:test";
import assert from "node:assert/strict";
import { total } from "../src/cart.js";
import { toCents } from "../src/money.js";

test("0.57 x 3", () => assert.equal(total([{ price: 0.57, qty: 3 }]), 171));
test("4.35", () => assert.equal(toCents(4.35), 435));
test("empty cart", () => assert.equal(total([]), 0));
test("mixed", () => assert.equal(total([{ price: 1.15, qty: 2 }, { price: 0.1, qty: 1 }]), 240));
