import { z } from "zod";

export const submitSchema = z.object({
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  product_url: z.string().url("Valid product URL is required"),
  contact_email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export type SubmitInput = z.infer<typeof submitSchema>;
