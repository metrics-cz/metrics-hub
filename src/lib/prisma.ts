// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

declare global {
  var __prisma: PrismaClient | undefined;
}

// Enhanced Prisma client configuration for serverless optimization
const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Connection pooling configuration
    transactionOptions: {
      isolationLevel: 'ReadCommitted',
      maxWait: parseInt(process.env.DB_POOL_TIMEOUT || '10000'),
      timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'),
    },
  });
};

// Singleton pattern with better connection management
const prisma = global.__prisma ?? createPrismaClient();

// Only cache in development to avoid memory leaks in serverless
if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

// Connection management for serverless
let connectionRetries = 0;
const MAX_RETRIES = 3;

// Connection state tracking
let connectionState = {
  lastReset: 0,
  isHealthy: true,
  activeQueries: 0,
  queryQueue: [] as Array<{ operation: () => Promise<any>, resolve: (value: any) => void, reject: (error: any) => void }>,
  isProcessingQueue: false,
  isResetting: false
};

// Create a separate cleanup client to avoid prepared statement conflicts
let cleanupClient: PrismaClient | null = null;

function getCleanupClient(): PrismaClient {
  if (!cleanupClient) {
    cleanupClient = new PrismaClient({
      log: ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }
  return cleanupClient;
}

// Enhanced query wrapper with automatic retry and connection management
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  context: string = 'database operation'
): Promise<T> {
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      return await operation();
    } catch (error: any) {
      attempts++;
      
      // Enhanced error detection for different types of database issues
      const isConnectionError = 
        error?.code === 'P1001' || // Can't reach database server
        error?.code === 'P1008' || // Operations timed out
        error?.code === 'P1017' || // Server has closed the connection
        error?.message?.includes('Connection') ||
        error?.message?.includes('timeout');

      const isPreparedStatementError = 
        error?.code === 'P2010' || // Raw query failed (prepared statement issues)
        error?.message?.includes('prepared statement') ||
        error?.code === '42P05' || // PostgreSQL duplicate prepared statement error
        error?.code === '26000'; // PostgreSQL invalid prepared statement error

      const isRetryableError = isConnectionError || isPreparedStatementError;

      if (isRetryableError && attempts < maxAttempts) {
        console.warn(`${context} failed (attempt ${attempts}/${maxAttempts}), retrying...`, error.message);
        
        // For any prepared statement error, use nuclear reset
        if (isPreparedStatementError) {
          console.log('Prepared statement error detected, performing nuclear reset');
          await nuclearReset();
        } else if (isConnectionError) {
          // For connection errors, ensure connection is healthy
          await ensureDatabaseConnection();
        }
        
        // Exponential backoff with jitter to avoid thundering herd
        const baseDelay = 1000 * Math.pow(2, attempts - 1);
        const jitter = Math.random() * 200; // Add 0-200ms jitter
        const delay = Math.min(baseDelay + jitter, 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        continue; // Retry the operation
      }

      // If we've exhausted retries or it's not a retryable error, throw
      throw error;
    }
  }
  
  // This should never be reached, but TypeScript requires it
  throw new Error('Unexpected error in executeWithRetry');
}

// Enhanced utility to ensure connection is healthy
export async function ensureDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$connect();
    connectionState.isHealthy = true;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    connectionState.isHealthy = false;
    return false;
  }
}

// Transaction-based concurrent operation isolation
export async function executeWithTransaction<T>(operations: (() => Promise<T>)[]): Promise<T[]> {
  // Wait for any ongoing reset to complete
  while (connectionState.isResetting) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  return executeWithRetry(
    async () => {
      // Use transaction to ensure all operations are isolated
      return await prisma.$transaction(async (tx) => {
        return await Promise.all(operations.map(op => op()));
      });
    },
    'transaction operation'
  );
}

// Simplified query execution without queue for better reliability
export async function executeQueued<T>(operation: () => Promise<T>): Promise<T> {
  // During reset, wait for it to complete
  while (connectionState.isResetting) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  return await operation();
}

// Enhanced connection validation with prepared statement handling
export async function validateConnection(): Promise<void> {
  try {
    // Use the cleanup client for validation to avoid conflicts
    const cleanup = getCleanupClient();
    await cleanup.$connect();
    
    // Simple validation using cleanup client
    await cleanup.$executeRaw`SELECT 1`;
    
    connectionState.isHealthy = true;
  } catch (error: any) {
    console.warn('Connection validation failed:', error?.message || error);
    
    // Handle specific prepared statement errors
    if (error?.message?.includes('prepared statement') || error?.code === '26000' || error?.code === '42P05') {
      console.log('Validation failed due to prepared statement conflict, performing nuclear reset');
      await nuclearReset();
    } else {
      await resetConnection();
    }
  }
}

// Prepared statement lifecycle management using dedicated cleanup client
export async function deallocatePreparedStatements(): Promise<void> {
  // Skip if we're already in a reset process
  if (connectionState.isResetting) {
    return;
  }
  
  try {
    const cleanup = getCleanupClient();
    // Use the cleanup client to avoid conflicts with main client
    await cleanup.$executeRaw`DEALLOCATE ALL`;
    console.log('Deallocated all prepared statements using cleanup client');
  } catch (error) {
    // This is expected to fail if no prepared statements exist
    console.debug('Could not deallocate prepared statements:', error);
  }
}

// Nuclear option: completely recreate Prisma client
export async function nuclearReset(): Promise<void> {
  try {
    console.log('Performing nuclear reset of Prisma client');
    
    connectionState.isResetting = true;
    
    // Clear all state
    connectionState.queryQueue = [];
    connectionState.isProcessingQueue = false;
    
    // Disconnect both clients
    await prisma.$disconnect();
    if (cleanupClient) {
      await cleanupClient.$disconnect();
      cleanupClient = null;
    }
    
    // Clear global reference to force recreation
    global.__prisma = undefined;
    
    // Small delay to ensure cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
    
    connectionState.lastReset = Date.now();
    connectionState.isHealthy = true;
    connectionState.isResetting = false;
    
    console.log('Nuclear reset completed');
  } catch (error) {
    console.error('Error during nuclear reset:', error);
    connectionState.isHealthy = false;
    connectionState.isResetting = false;
  }
}

// Enhanced connection reset with prepared statement lifecycle management
export async function resetConnection(): Promise<void> {
  try {
    const now = Date.now();
    // Avoid frequent resets (minimum 1 second between resets)
    if (now - connectionState.lastReset < 1000 || connectionState.isResetting) {
      console.warn('Connection reset throttled, too recent or already resetting');
      return;
    }
    
    console.log('Resetting database connection to clear prepared statements');
    
    connectionState.isResetting = true;
    
    // Clear query queue to prevent conflicts
    connectionState.queryQueue = [];
    connectionState.isProcessingQueue = false;
    
    // Try to deallocate prepared statements before disconnect
    await deallocatePreparedStatements();
    
    // Disconnect and reconnect to clear prepared statements
    await prisma.$disconnect();
    await prisma.$connect();
    
    connectionState.lastReset = now;
    connectionState.isHealthy = true;
    connectionState.isResetting = false;
  } catch (error) {
    console.error('Error resetting connection:', error);
    connectionState.isHealthy = false;
    connectionState.isResetting = false;
    
    // If regular reset fails, try nuclear option
    await nuclearReset();
  }
}

// Graceful shutdown handler for serverless cleanup
export async function disconnectPrisma(): Promise<void> {
  try {
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error disconnecting Prisma:', error);
  }
}

// Add middleware for query performance monitoring and connection health tracking
prisma.$use(async (params, next) => {
  const start = Date.now();
  
  // Skip middleware for cleanup operations to avoid interference
  const isCleanupOperation = 
    params.action === 'executeRaw' || 
    (params.action === 'queryRaw' && params.args?.query?.includes?.('DEALLOCATE')) ||
    (params.action === 'queryRaw' && params.args?.query?.includes?.('SELECT 1'));
  
  if (isCleanupOperation) {
    return next(params);
  }
  
  connectionState.activeQueries++;
  
  try {
    const result = await next(params);
    const duration = Date.now() - start;
    
    // Log slow queries in development
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.warn(`Slow query detected: ${params.model}.${params.action} took ${duration}ms`);
    }
    
    // Track successful queries for connection health
    connectionState.isHealthy = true;
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`Query failed after ${duration}ms:`, {
      model: params.model,
      action: params.action,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Handle prepared statement errors specifically
    if (error instanceof Error && (error.message.includes('prepared statement') || error.message.includes('42P05') || error.message.includes('26000'))) {
      console.warn('Prepared statement error detected, connection may need reset');
      connectionState.isHealthy = false;
    }
    
    throw error;
  } finally {
    connectionState.activeQueries--;
  }
});

// Connection health monitoring utilities
export function getConnectionHealth() {
  return {
    isHealthy: connectionState.isHealthy,
    activeQueries: connectionState.activeQueries,
    lastReset: connectionState.lastReset,
    timeSinceLastReset: Date.now() - connectionState.lastReset
  };
}

// Proactive connection health check with prepared statement management
export async function checkConnectionHealth(): Promise<boolean> {
  try {
    const health = getConnectionHealth();
    
    // If too many failed operations recently, validate connection
    if (!health.isHealthy) {
      await validateConnection();
    }
    
    return connectionState.isHealthy;
  } catch (error) {
    console.error('Connection health check failed:', error);
    return false;
  }
}

// Transaction-based wrapper for $queryRaw with proper isolation
export async function queryRawSafe<T = unknown>(
  query: TemplateStringsArray,
  ...values: any[]
): Promise<T> {
  // Pre-flight connection health check
  await checkConnectionHealth();
  
  return executeWithRetry(
    async () => {
      // Use transaction to isolate prepared statements
      return await prisma.$transaction(async (tx) => {
        return await tx.$queryRaw<T>(query, ...values);
      });
    },
    'queryRaw operation'
  );
}

// Transaction-based wrapper for $queryRawUnsafe with proper isolation
export async function queryRawUnsafeSafe<T = unknown>(
  query: string,
  ...values: any[]
): Promise<T> {
  // Pre-flight connection health check
  await checkConnectionHealth();
  
  return executeWithRetry(
    async () => {
      // Use transaction to isolate prepared statements
      return await prisma.$transaction(async (tx) => {
        return await tx.$queryRawUnsafe<T>(query, ...values);
      });
    },
    'queryRawUnsafe operation'
  );
}

// Export enhanced prisma client with connection pooling
export default prisma;
