export type AccountPermissions = { role: string; account_kind?: string };
export function isStudent(p: AccountPermissions | null | undefined) {
  return (
    !!p && p.role === "student" && (p.account_kind || "student") === "student"
  );
}
export function isVendorAccount(p: AccountPermissions | null | undefined) {
  return !!p && (p.role === "vendor" || p.account_kind === "vendor");
}
