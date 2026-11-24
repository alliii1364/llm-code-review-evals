import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify } from "../src/slug.js";

test("no trailing hyphen", () => assert.equal(slugify("Hello, World!"), "hello-world"));
test("no leading hyphen", () => assert.equal(slugify("  --Hi there"), "hi-there"));
test("more accents", () => assert.equal(slugify("Crème brûlée"), "creme-brulee"));
test("empty", () => assert.equal(slugify(""), ""));
