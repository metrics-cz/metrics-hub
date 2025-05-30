import { z } from "zod";

export const companySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  billing_email: z.string().email().nullable().optional(),
  plan: z.string().nullable().optional(),
  owner_uid: z.string().uuid().nullable().optional(),
  created_at: z.string(),
  active: z.boolean().nullable().optional(),
  logo_url: z.string().nullable().optional(),
});

export type Company = z.infer<typeof companySchema>;
