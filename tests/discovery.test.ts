import test from "node:test";
import assert from "node:assert/strict";
import {
  sampleBusinesses,
  recommendBusinesses,
  searchBusinesses,
  isBusiness,
} from "../lib/businesses.ts";
test("flyer requests rank the graphic designer first", () => {
  assert.equal(
    recommendBusinesses(
      sampleBusinesses,
      "I need someone to design a flyer for my event tomorrow",
    )[0].business.id,
    "pixel",
  );
});
test("food requests rank a delivery business first", () => {
  assert.equal(
    recommendBusinesses(sampleBusinesses, "Lunch delivered to campus")[0]
      .business.id,
    "bowl",
  );
});
test("unrelated requests produce no fabricated matches", () => {
  assert.deepEqual(
    recommendBusinesses(sampleBusinesses, "interplanetary rocket"),
    [],
  );
});
test("search intersects category filters", () => {
  assert.equal(
    searchBusinesses(sampleBusinesses, "website", "Design & tech")[0].id,
    "code",
  );
  assert.equal(
    searchBusinesses(sampleBusinesses, "website", "Food & drinks").length,
    0,
  );
});
test("invalid persisted listings cannot enter the UI", () => {
  assert.equal(
    isBusiness({ ...sampleBusinesses[0], isSample: false, price: -1 }),
    false,
  );
  assert.equal(
    isBusiness({
      ...sampleBusinesses[0],
      isSample: false,
      phone: "javascript:alert(1)",
    }),
    false,
  );
  assert.equal(
    isBusiness({
      ...sampleBusinesses[0],
      isSample: false,
      phone: "2348012345678",
    }),
    true,
  );
});
