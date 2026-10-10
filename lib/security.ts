export type Role = "student" | "vendor" | "admin";
export function allowedRole(role: Role, required?: Role) {
  return (
    !required ||
    role === required ||
    (required === "vendor" && role === "admin")
  );
}
export function safeReturnPath(value: string | null | undefined) {
  return value?.startsWith("/") &&
    !value.startsWith("//") &&
    !/[\u0000-\u0020\\]/.test(value)
    ? value
    : "/account";
}
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export function validateUploadMeta(size: number, type: string) {
  if (size <= 0 || size > MAX_IMAGE_SIZE)
    throw new Error("Each image must be between 1 byte and 5 MB.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(type))
    throw new Error("Only JPEG, PNG and WebP images are supported.");
}
export function ownsImage(path: string, userId: string, productId: string) {
  return new RegExp(`^${userId}/${productId}/[a-f0-9-]+\\.webp$`).test(path);
}
