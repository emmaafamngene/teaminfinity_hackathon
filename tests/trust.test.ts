import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeVendorLookup,
  trustScore,
  orderSteps,
  type Trust,
} from "../lib/trust.ts";
test("trust scores cannot claim verification from business approval alone", () => {
  const base = {
    idVerifiedAt: null,
    phoneVerifiedAt: null,
    ordersCompleted: 0,
  } as Trust;
  assert.equal(trustScore(base), 0);
  assert.equal(trustScore({ ...base, ordersCompleted: 1 }), 20);
  assert.equal(
    trustScore({
      ...base,
      idVerifiedAt: "2026-10-10",
      phoneVerifiedAt: "2026-10-10",
      ordersCompleted: 1,
    }),
    100,
  );
});
test("vendor checker accepts campus links and normalizes Nigerian phone numbers", () => {
  assert.deepEqual(normalizeVendorLookup("08012345678"), {
    phone: "2348012345678",
  });
  assert.deepEqual(normalizeVendorLookup("+234 801 234 5678"), {
    phone: "2348012345678",
  });
  assert.deepEqual(
    normalizeVendorLookup("https://campus.example/v/chef-ts", "campus.example"),
    { slug: "chef-ts" },
  );
  assert.deepEqual(normalizeVendorLookup("/businesses/chef-ts"), {
    slug: "chef-ts",
  });
  assert.throws(() =>
    normalizeVendorLookup("https://fake.example/v/chef-ts", "campus.example"),
  );
  assert.throws(() => normalizeVendorLookup("/admin"));
});
test("delivery precedes buyer confirmation", () => {
  assert.deepEqual(orderSteps, [
    "placed",
    "preparing",
    "delivered",
    "confirmed",
  ]);
});
