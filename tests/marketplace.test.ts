import test from "node:test";
import assert from "node:assert/strict";
import {
  initialMarket,
  publicProducts,
  publicVendors,
  submitVendor,
  reviewVendor,
  saveProduct,
  matches,
  validMarket,
  DEMO_OWNER,
  type Vendor,
  type Product,
} from "../lib/marketplace.ts";
function applicant(): Vendor {
  return {
    ...initialMarket().vendors[0],
    id: "student-business",
    slug: "student-business",
    ownerId: DEMO_OWNER,
    name: "Student Studio",
    phone: "2348012345678",
    sample: false,
    status: "pending",
  };
}
function product(): Product {
  return {
    id: "new-product",
    businessId: "student-business",
    name: "Flyer design",
    description: "Graphic design for student events",
    price: 3000,
    available: true,
    active: true,
    emoji: "✦",
    color: "#dce6b9",
    reviewCount: 0,
    createdAt: "2026-10-10T10:00:00Z",
  };
}
test("application stays private and cannot publish before approval", () => {
  const state = submitVendor(initialMarket(), applicant());
  assert.equal(
    publicVendors(state).some((v) => v.id === "student-business"),
    false,
  );
  assert.throws(
    () => saveProduct(state, product(), DEMO_OWNER),
    /approved business/,
  );
});
test("approval unlocks publication and suspension hides all vendor products", () => {
  let state = submitVendor(initialMarket(), applicant());
  state = reviewVendor(
    state,
    "student-business",
    "approved",
    "Looks good",
    "2026-10-10T10:00:00Z",
    "r1",
  );
  state = saveProduct(state, product(), DEMO_OWNER);
  assert.equal(
    publicProducts(state).some((p) => p.id === "new-product"),
    true,
  );
  state = reviewVendor(
    state,
    "student-business",
    "suspended",
    "Policy issue",
    "2026-10-10T11:00:00Z",
    "r2",
  );
  assert.equal(
    publicProducts(state).some((p) => p.id === "new-product"),
    false,
  );
  assert.equal(
    matches(state, "Student Studio flyer").some((p) => p.id === "new-product"),
    false,
  );
  assert.throws(() => saveProduct(state, product(), DEMO_OWNER));
});
test("rejection requires a reason and resubmission preserves review history", () => {
  let state = submitVendor(initialMarket(), applicant());
  assert.throws(
    () => reviewVendor(state, "student-business", "rejected", "", "now", "r1"),
    /reason/,
  );
  state = reviewVendor(
    state,
    "student-business",
    "rejected",
    "Need proof",
    "2026-10-10T10:00:00Z",
    "r1",
  );
  state = submitVendor(state, { ...applicant(), name: "Updated Studio" });
  assert.equal(state.history.length, 1);
  assert.equal(
    state.vendors.find((v) => v.id === "student-business")?.status,
    "pending",
  );
  assert.equal(state.vendors.filter((v) => v.ownerId === DEMO_OWNER).length, 1);
});
test("demo ownership prevents editing another business product", () => {
  const state = initialMarket();
  assert.throws(
    () => saveProduct(state, state.products[0], DEMO_OWNER),
    /approved business/,
  );
});
test("archive removes a product from public discovery", () => {
  let state = submitVendor(initialMarket(), applicant());
  state = reviewVendor(state, "student-business", "approved", "", "now", "r1");
  state = saveProduct(state, { ...product(), active: false }, DEMO_OWNER);
  assert.equal(
    publicProducts(state).some((p) => p.id === "new-product"),
    false,
  );
});
test("seed data and browser roundtrip are valid; unsafe contact data is rejected", () => {
  const state = initialMarket();
  assert.equal(validMarket(JSON.parse(JSON.stringify(state))), true);
  state.vendors[0].phone = "javascript:alert(1)";
  assert.equal(validMarket(state), false);
});
