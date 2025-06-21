// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

declare global {
  var __prisma: PrismaClient | undefined;
}

// Simple singleton pattern that works better with HMR
const prisma = global.__prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export default prisma;
