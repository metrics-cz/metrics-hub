// src/lib/validation/userSchema.ts
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  lastLogin: z.string().optional().default(''),
  status: z.enum(['active', 'pending']),
  avatarUrl: z.string().url().optional(),
});

export const UsersArraySchema = z.array(UserSchema);

export type User = z.infer<typeof UserSchema>;
