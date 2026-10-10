import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL || "http://localhost:3001";
const landing = await fetch(base).then((r) => r.text());
assert.ok(landing.includes("Your marketplace."), "landing introduction is served");
const stylesheets = [...landing.matchAll(/<link[^>]+href="([^"]+\.css[^\"]*)"/g)].map((m) => m[1].replaceAll("&amp;", "&"));
const styles = (await Promise.all(stylesheets.map((path) => fetch(new URL(path, base)).then((r) => r.text())))).join("\n");
assert.ok(styles.includes(".landing-hero"), "landing stylesheet is loaded");
assert.ok(landing.includes('href="/register"'), "signup is available from landing");
console.log("PASS landing introduction, signup and stylesheet");
const compare = await fetch(base + "/compare").then(r => r.text());
assert.ok(compare.includes("YOUR CAMPUS SHORTLIST"), "comparison page is public");
const commentId = "40000000-0000-4000-8000-000000000001";
const comments = await fetch(base + `/api/review-comments/${commentId}`).then(r => r.json());
assert.deepEqual(comments.comments, [], "nonexistent/private reviews expose no comments");
const anonymousComment = await fetch(base + `/api/review-comments/${commentId}`, { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({body:"Anonymous comment"}) });
assert.equal(anonymousComment.status, 401, "anonymous users cannot post buyer comments");
console.log("PASS public comparison and buyer comment access controls");
for (const route of [
  "/admin",
  "/admin/applications",
  "/admin/users",
  "/admin/trust",
  "/account/orders",
  "/vendor/products/new",
  "/account",
]) {
  const r = await fetch(base + route, {
    redirect: "manual",
    signal: AbortSignal.timeout(12000),
  });
  assert.ok([303, 307].includes(r.status), `${route} must redirect`);
  assert.ok(
    r.headers.get("location")?.includes("/login"),
    `${route} must redirect to login`,
  );
  console.log("PASS anonymous route restriction", route);
}
for (const route of [
  "/api/admin/users",
  "/api/admin/reviews",
  "/api/admin/trust",
  "/api/orders",
  "/api/evidence?business=20000000-0000-4000-8000-000000000001",
]) {
  const r = await fetch(base + route, { signal: AbortSignal.timeout(12000) });
  assert.equal(r.status, 401, route);
  console.log("PASS anonymous API restriction", route);
}
const denied = await fetch(base + "/api/auth/register", {
  method: "POST",
  headers: {
    Origin: "https://untrusted.example",
    "Content-Type": "application/json",
  },
  body: "{}",
});
assert.equal(denied.status, 403);
console.log("PASS cross-origin mutation rejected");
const publicMarket = await fetch(base + "/api/market", {
  signal: AbortSignal.timeout(12000),
});
assert.equal(publicMarket.status, 200);
const data = await publicMarket.json();
assert.equal(data.user, null);
assert.ok(data.state.vendors.every((v) => v.status === "approved"));
assert.equal(data.state.history.length, 0);
console.log("PASS public database API excludes private records");
