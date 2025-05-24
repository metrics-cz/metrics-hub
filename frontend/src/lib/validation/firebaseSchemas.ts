// src/lib/validation/firebaseSchemas.ts
import { z } from 'zod';

export const companySchema = z.object({
  id: z.string(), // Added manually from Firestore doc.id
  active: z.boolean(),
  billingEmail: z.string().email(),
  createdAt: z.union([
    z.instanceof(Date),
    z.any(), // fallback for Firestore Timestamp, we can refine it if needed
  ]),
  name: z.string(),
  ownerUid: z.string(),
  plan: z.enum(['free', 'pro', 'enterprise']).default('free'), // adjust to match your plans
});

export const userSchema = z.object({
  id: z.string(), // from doc.id
  email: z.string().email(),
  displayName: z.string().nullable().optional(),
  photoURL: z.string().nullable().optional(),
  createdAt: z.string().datetime().optional(), // ISO string
  companies: z.array(z.string()).optional(),
  pendingInvites: z.array(z.string()).optional(),
  preferences: z.any().optional(), // fill in if you know the structure
});
