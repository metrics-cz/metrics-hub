import { z } from "zod";

export const companyUserMiniSchema = z.object({
   company_id      : z.string().uuid(),
  role            : z.string(),
  id              : z.string().uuid(),
  email           : z.string().email(),
  last_sign_in_at : z.coerce.date().nullable(),
  full_name       : z.string().nullable(),
  avatar_url      : z.string().url().nullable()  
})


export type CompanyUserMini = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;      
  lastSignIn: Date | null;
  role: string;
};