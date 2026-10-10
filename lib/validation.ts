import { z } from "zod";
export const category = z.enum([
  "Food & drinks",
  "Design & tech",
  "Fashion & beauty",
  "Learning",
  "Everyday services",
  "Digital platforms",
]);
export const businessInput = z
  .object({
    name: z.string().trim().min(2).max(60),
    category,
    description: z.string().trim().min(10).max(1000),
    phone: z.string().regex(/^\d{10,15}$/),
    location: z.string().trim().min(2).max(120),
    hours: z.string().trim().max(80).default("Contact seller for hours"),
  })
  .strict();
export const productInput = z
  .object({
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().min(10).max(2000),
    category,
    price: z.number().finite().min(0).max(10000000),
    available: z.boolean(),
    active: z.boolean().optional(),
    image_paths: z.array(z.string().max(250)).max(6).optional(),
  })
  .strict();
export const reviewInput = z
  .object({
    product_id: z.uuid().nullable().optional(),
    business_id: z.uuid(),
    rating: z.number().int().min(1).max(5),
    body: z.string().trim().min(10).max(1500),
  })
  .strict();
