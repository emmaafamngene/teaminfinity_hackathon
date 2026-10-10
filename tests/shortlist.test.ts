import test from "node:test";
import assert from "node:assert/strict";
import { shortlistIds, toggleShortlist } from "../lib/shortlist.ts";
test("comparison ignores malformed storage and unsafe product identifiers", () => {
  assert.deepEqual(shortlistIds("broken"), []);
  assert.deepEqual(shortlistIds('["javascript:alert(1)",null]'), []);
});
test("comparison caps three choices and removes an existing choice", () => {
  const ids = ["a", "b", "c"];
  assert.deepEqual(toggleShortlist(ids, "d"), ids);
  assert.deepEqual(toggleShortlist(ids, "b"), ["a", "c"]);
});
