import { z } from "zod";

export const phoneSchema = z.string().trim().regex(/^\d{10}$/, "Enter a 10-digit mobile number.");

export const otpSendSchema = z.object({ phone: phoneSchema });

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code."),
});

export const cartLineSchema = z.object({
  skuId: z.string().min(1).max(40),
  qtyCases: z.number().int().min(1, "Quantity must be at least 1.").max(9999),
  originalText: z.string().max(200).nullish(),
});

export const previewSchema = z.object({ lines: z.array(cartLineSchema).min(1).max(100) });

export const placeSchema = previewSchema.extend({
  captureId: z.string().max(40).nullish(),
  note: z.string().trim().max(300).nullish(),
});

export const captureSchema = z.object({
  text: z.string().trim().min(2, "Type or paste your order first.").max(1000, "Please keep the message under 1000 characters."),
});

export const orderActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm") }),
  z.object({ action: z.literal("reject"), reason: z.string().trim().min(3, "Give a short reason.").max(300) }),
]);

export const lineEditSchema = z
  .object({
    skuId: z.string().min(1).max(40).optional(),
    qtyCases: z.number().int().min(1).max(9999).optional(),
  })
  .refine((v) => v.skuId !== undefined || v.qtyCases !== undefined, "Nothing to change.");
