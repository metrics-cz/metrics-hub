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
  rectangular_logo_url: z.string().nullable().optional(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  contact_details: z.record(z.any()).optional(),
  updated_at: z.string().optional(),
});

export type Company = z.infer<typeof companySchema>;

// Type for company data as seen by a specific user (includes their role in the company)
export type UserCompany = Company & {
  userRole: string;
};

