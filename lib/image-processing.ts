import sharp from "sharp";
import { validateUploadMeta } from "./security.ts";
export async function prepareImage(buffer: Buffer, size: number, type: string) {
  validateUploadMeta(size, type);
  if (buffer.length !== size)
    throw new Error("Image size does not match its contents.");
  const image = sharp(buffer, { limitInputPixels: 25000000 });
  const metadata = await image.metadata();
  const formats: Record<string, string> = {
    "image/jpeg": "jpeg",
    "image/png": "png",
    "image/webp": "webp",
  };
  if (metadata.format !== formats[type])
    throw new Error("Image contents do not match the declared file type.");
  return image
    .rotate()
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer();
}
