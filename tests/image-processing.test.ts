import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { prepareImage } from "../lib/image-processing.ts";
test("valid image is decoded and stored as a resized WebP", async () => {
  const png = await sharp({
    create: { width: 1800, height: 900, channels: 3, background: "#336633" },
  })
    .png()
    .toBuffer();
  const out = await prepareImage(png, png.length, "image/png");
  const meta = await sharp(out).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 1600);
  assert.equal(meta.height, 800);
});
test("forged image MIME and invalid image bytes are rejected", async () => {
  const png = await sharp({
    create: { width: 4, height: 4, channels: 3, background: "#336633" },
  })
    .png()
    .toBuffer();
  await assert.rejects(
    () => prepareImage(png, png.length, "image/jpeg"),
    /declared file type/,
  );
  const bad = Buffer.from("not an image");
  await assert.rejects(() => prepareImage(bad, bad.length, "image/png"));
});
