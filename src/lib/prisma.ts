// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

declare global {
  var __prisma: PrismaClient | undefined;
  var __prismaInstanceCount: number;
}

// Initialize instance counter for development
if (typeof global.__prismaInstanceCount === 'undefined') {
  global.__prismaInstanceCount = 0;
}

// Enhanced Prisma client configuration with connection management
const createPrismaClient = () => {
  // Increment instance counter in development
  if (process.env.NODE_ENV === 'development') {
    global.__prismaInstanceCount = (global.__prismaInstanceCount || 0) + 1;
    console.log(`[Prisma] Creating client instance #${global.__prismaInstanceCount}`);
  }

  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Connection configuration
    transactionOptions: {
      maxWait: 5000, // 5 seconds
      timeout: 10000, // 10 seconds
    },
  });

  // Add middleware for development to handle prepared statement conflicts
  if (process.env.NODE_ENV === 'development') {
    client.$use(async (params, next) => {
      try {
        return await next(params);
      } catch (error: any) {
        // Handle prepared statement conflicts
        if (error?.code === '42P05' || error?.message?.includes('prepared statement')) {
          console.warn('[Prisma] Prepared statement conflict detected, attempting recovery...');
          
          // Try to disconnect and reconnect to clear prepared statements
          try {
            await client.$disconnect();
            await client.$connect();
            // Retry the operation once
            return await next(params);
          } catch (retryError) {
            console.error('[Prisma] Failed to recover from prepared statement error:', retryError);
            throw error; // Throw original error if recovery fails
          }
        }
        throw error;
      }
    });
  }

  return client;
};

// Enhanced singleton pattern with cleanup
const prisma = global.__prisma ?? createPrismaClient();

// Only cache in development
if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

// Add process cleanup handlers
const cleanup = async () => {
  try {
    console.log('[Prisma] Cleaning up database connections...');
    await prisma.$disconnect();
  } catch (error) {
    console.error('[Prisma] Error during cleanup:', error);
  }
};

// Register cleanup handlers
process.on('beforeExit', cleanup);
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Export enhanced client
export default prisma;

// Utility function for safe query execution with automatic retry
export async function safeQuery<T>(
  queryFn: () => Promise<T>,
  retries: number = 1
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await queryFn();
    } catch (error: any) {
      lastError = error;
      
      // Only retry on prepared statement errors
      if (
        (error?.code === '42P05' || error?.message?.includes('prepared statement')) &&
        attempt < retries
      ) {
        console.warn(`[Prisma] Prepared statement error on attempt ${attempt + 1}, retrying...`);
        
        // Small delay before retry
        await new Promise(resolve => setTimeout(resolve, 100 + attempt * 50));
        continue;
      }
      
      // Don't retry for other types of errors
      break;
    }
  }
  
  throw lastError;
}