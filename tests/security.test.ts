import test from "node:test";
import assert from "node:assert/strict";
import {
  allowedRole,
  safeReturnPath,
  validateUploadMeta,
  ownsImage,
} from "../lib/security.ts";
import { reviewInput, productInput } from "../lib/validation.ts";
test("admin roles are required explicitly", () => {
  assert.equal(allowedRole("student", "admin"), false);
  assert.equal(allowedRole("vendor", "admin"), false);
  assert.equal(allowedRole("admin", "admin"), true);
});
test("return paths prevent open redirects", () => {
  for (const path of [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\t/evil.example",
  ])
    assert.equal(safeReturnPath(path), "/account");
  assert.equal(safeReturnPath("/vendor/products"), "/vendor/products");
});
test("image size and MIME validation rejects unsafe input", () => {
  assert.doesNotThrow(() => validateUploadMeta(200, "image/webp"));
  assert.throws(() => validateUploadMeta(6 * 1024 * 1024, "image/jpeg"));
  assert.throws(() => validateUploadMeta(200, "image/svg+xml"));
  assert.throws(() => validateUploadMeta(0, "image/png"));
});
test("image paths must belong to the same owner and product", () => {
  assert.equal(
    ownsImage("owner/product/ab12-34.webp", "owner", "product"),
    true,
  );
  assert.equal(ownsImage("other/product/ab12.webp", "owner", "product"), false);
  assert.equal(ownsImage("owner/other/ab12.webp", "owner", "product"), false);
});
test("review input rejects identity spoofing and invalid ratings", () => {
  const body = {
    business_id: "20000000-0000-4000-8000-000000000001",
    rating: 5,
    body: "Helpful service and clear communication",
  };
  assert.equal(reviewInput.safeParse(body).success, true);
  assert.equal(
    reviewInput.safeParse({ ...body, user_id: "spoofed" }).success,
    false,
  );
  assert.equal(reviewInput.safeParse({ ...body, rating: 6 }).success, false);
  assert.equal(reviewInput.safeParse({ ...body, body: "bad" }).success, false);
});
test("product input rejects spoofed ownership and negative prices", () => {
  const product = {
    name: "Flyer design",
    description: "Custom flyer design for campus events",
    category: "Design & tech",
    price: 3000,
    available: true,
  };
  assert.equal(productInput.safeParse(product).success, true);
  assert.equal(
    productInput.safeParse({ ...product, business_id: "other" }).success,
    false,
  );
  assert.equal(
    productInput.safeParse({ ...product, price: -1 }).success,
    false,
  );
});
