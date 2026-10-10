import { test } from "node:test";
import assert from "node:assert/strict";
import { isStudent, isVendorAccount } from "../lib/permissions.ts";
test("pending vendors cannot use student buyer features", () => {
  const applicant = { role: "student", account_kind: "vendor" };
  assert.equal(isStudent(applicant), false);
  assert.equal(isVendorAccount(applicant), true);
});
test("student, vendor and administrator workspaces are distinct", () => {
  assert.equal(isStudent({ role: "student", account_kind: "student" }), true);
  assert.equal(
    isVendorAccount({ role: "student", account_kind: "student" }),
    false,
  );
  assert.equal(isStudent({ role: "vendor", account_kind: "vendor" }), false);
  assert.equal(isStudent({ role: "admin", account_kind: "student" }), false);
  assert.equal(isVendorAccount(null), false);
});
