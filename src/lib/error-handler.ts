import { NextResponse } from 'next/server';

export interface ApiError extends Error {
  code?: string;
  statusCode?: number;
  details?: any;
}

export class CustomApiError extends Error implements ApiError {
  public code: string;
  public statusCode: number;
  public details?: any;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'CustomApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class ValidationError extends CustomApiError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends CustomApiError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends CustomApiError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends CustomApiError {
  constructor(message: string = 'Resource not found') {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends CustomApiError {
  constructor(message: string = 'Resource conflict') {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends CustomApiError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
    this.name = 'RateLimitError';
  }
}

export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

export function createErrorResponse(error: unknown): NextResponse {
  // Handle custom API errors
  if (error instanceof CustomApiError) {
    const response = {
      error: error.message,
      code: error.code,
      ...(process.env.NODE_ENV === 'development' && error.details && { details: error.details })
    };
    
    return NextResponse.json(response, { status: error.statusCode });
  }

  // Handle known error types
  if (error instanceof Error) {
    // Check for common database errors
    if (error.message.includes('duplicate key')) {
      return NextResponse.json(
        { error: 'Resource already exists', code: 'DUPLICATE_RESOURCE' },
        { status: 409 }
      );
    }
    
    if (error.message.includes('foreign key')) {
      return NextResponse.json(
        { error: 'Invalid reference', code: 'INVALID_REFERENCE' },
        { status: 400 }
      );
    }

    if (error.message.includes('permission denied')) {
      return NextResponse.json(
        { error: 'Permission denied', code: 'PERMISSION_DENIED' },
        { status: 403 }
      );
    }
  }

  // Default server error
  const response = {
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { message: formatErrorMessage(error) })
  };

  console.error('Unhandled API error:', error);
  return NextResponse.json(response, { status: 500 });
}

export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>
): (...args: T) => Promise<R | NextResponse> {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return createErrorResponse(error);
    }
  };
}

export function logError(error: unknown, context?: string): void {
  const timestamp = new Date().toISOString();
  const errorMessage = formatErrorMessage(error);
  
  if (context) {
    console.error(`[${timestamp}] ${context}:`, errorMessage);
  } else {
    console.error(`[${timestamp}] Error:`, errorMessage);
  }
  
  // In production, you might want to send this to an error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to error tracking service
    // errorTrackingService.captureException(error, { context });
  }
}