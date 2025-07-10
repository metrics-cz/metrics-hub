/**
 * Comprehensive audit logging system for security monitoring
 * Tracks all critical operations and data access patterns
 */

import { createSupabaseServerClient } from '@/lib/supabaseServer';

export interface AuditLogEntry {
  table_name: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'UPLOAD' | 'LOGIN' | 'LOGOUT' | 'AUTH_FAILURE';
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
}

export interface SecurityEvent {
  event_type: 'SUSPICIOUS_ACTIVITY' | 'FAILED_AUTH' | 'RATE_LIMIT' | 'UNAUTHORIZED_ACCESS' | 'DATA_EXPORT' | 'FILE_UPLOAD';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
}

/**
 * Main audit logger class
 */
export class AuditLogger {
  private static instance: AuditLogger;
  
  private constructor() {}
  
  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Log a standard audit event
   */
  async logAuditEvent(entry: AuditLogEntry): Promise<void> {
    try {
      const supabase = await createSupabaseServerClient();
      
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          table_name: entry.table_name,
          operation: entry.operation,
          old_data: entry.old_data,
          new_data: entry.new_data,
          user_id: entry.user_id,
          ip_address: entry.ip_address,
          user_agent: entry.user_agent,
          timestamp: new Date().toISOString(),
        });

      if (error) {
        console.error('Failed to log audit event:', error);
        // Don't throw - audit logging should not break main functionality
      }
    } catch (error) {
      console.error('Audit logging error:', error);
    }
  }

  /**
   * Log security events that require immediate attention
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Log to audit table with special security event marker
      await this.logAuditEvent({
        table_name: 'security_events',
        operation: 'INSERT',
        new_data: {
          event_type: event.event_type,
          severity: event.severity,
          description: event.description,
          metadata: event.metadata,
        },
        user_id: event.user_id,
        ip_address: event.ip_address,
        user_agent: event.user_agent,
      });

      // For critical events, also log to console for immediate visibility
      if (event.severity === 'CRITICAL' || event.severity === 'HIGH') {
        console.warn('SECURITY EVENT:', {
          type: event.event_type,
          severity: event.severity,
          description: event.description,
          user_id: event.user_id,
          ip_address: event.ip_address,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Security event logging error:', error);
    }
  }

  /**
   * Log authentication events
   */
  async logAuthEvent(
    event: 'LOGIN' | 'LOGOUT' | 'AUTH_FAILURE',
    userId?: string,
    email?: string,
    ipAddress?: string,
    userAgent?: string,
    reason?: string
  ): Promise<void> {
    await this.logAuditEvent({
      table_name: 'auth_events',
      operation: event,
      new_data: {
        email,
        reason,
        timestamp: new Date().toISOString(),
      },
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    // Log failed auth attempts as security events
    if (event === 'AUTH_FAILURE') {
      await this.logSecurityEvent({
        event_type: 'FAILED_AUTH',
        severity: 'MEDIUM',
        description: `Authentication failure for ${email || 'unknown user'}: ${reason || 'unknown reason'}`,
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: { email, reason },
      });
    }
  }

  /**
   * Log file upload events
   */
  async logFileUpload(
    userId: string,
    filename: string,
    fileSize: number,
    fileType: string,
    companyId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logAuditEvent({
      table_name: 'file_uploads',
      operation: 'UPLOAD',
      new_data: {
        filename,
        file_size: fileSize,
        file_type: fileType,
        company_id: companyId,
      },
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    await this.logSecurityEvent({
      event_type: 'FILE_UPLOAD',
      severity: 'LOW',
      description: `File uploaded: ${filename} (${fileSize} bytes)`,
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: {
        filename,
        file_size: fileSize,
        file_type: fileType,
        company_id: companyId,
      },
    });
  }

  /**
   * Log data export events
   */
  async logDataExport(
    userId: string,
    tableName: string,
    rowCount: number,
    exportType: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      event_type: 'DATA_EXPORT',
      severity: rowCount > 1000 ? 'HIGH' : 'MEDIUM',
      description: `Data export: ${rowCount} rows from ${tableName}`,
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: {
        table_name: tableName,
        row_count: rowCount,
        export_type: exportType,
      },
    });
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    description: string,
    severity: SecurityEvent['severity'],
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logSecurityEvent({
      event_type: 'SUSPICIOUS_ACTIVITY',
      severity,
      description,
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata,
    });
  }

  /**
   * Log rate limiting events
   */
  async logRateLimitExceeded(
    endpoint: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      event_type: 'RATE_LIMIT',
      severity: 'MEDIUM',
      description: `Rate limit exceeded for ${endpoint}`,
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: { endpoint },
    });
  }

  /**
   * Log unauthorized access attempts
   */
  async logUnauthorizedAccess(
    resource: string,
    attemptedAction: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logSecurityEvent({
      event_type: 'UNAUTHORIZED_ACCESS',
      severity: 'HIGH',
      description: `Unauthorized access attempt: ${attemptedAction} on ${resource}`,
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: {
        resource,
        attempted_action: attemptedAction,
      },
    });
  }
}

/**
 * Utility functions for easy access
 */
export const auditLogger = AuditLogger.getInstance();

/**
 * Helper function to extract client info from request
 */
export function extractClientInfo(request: Request) {
  const ipAddress = 
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';
  
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  return { ipAddress, userAgent };
}

/**
 * Decorator for automatic audit logging of API operations
 */
export function withAuditLog(
  tableName: string,
  operation: AuditLogEntry['operation']
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      let result;
      let error;

      try {
        result = await method.apply(this, args);
        return result;
      } catch (err) {
        error = err;
        throw err;
      } finally {
        const duration = Date.now() - startTime;
        
        // Extract user and client info from context if available
        const context = args.find(arg => arg?.user || arg?.request);
        const userId = context?.user?.id;
        const { ipAddress, userAgent } = context?.request 
          ? extractClientInfo(context.request)
          : { ipAddress: undefined, userAgent: undefined };

        await auditLogger.logAuditEvent({
          table_name: tableName,
          operation,
          user_id: userId,
          ip_address: ipAddress,
          user_agent: userAgent,
          metadata: {
            duration,
            success: !error,
            error_message: error?.message,
          },
        });
      }
    };

    return descriptor;
  };
}

/**
 * Monitor for suspicious patterns
 */
export class SecurityMonitor {
  private static patterns = new Map<string, { count: number; lastSeen: number }>();

  /**
   * Check for suspicious patterns in user behavior
   */
  static async checkSuspiciousPatterns(
    userId: string,
    action: string,
    ipAddress?: string
  ): Promise<void> {
    const key = `${userId}:${action}`;
    const now = Date.now();
    const pattern = this.patterns.get(key);

    if (!pattern) {
      this.patterns.set(key, { count: 1, lastSeen: now });
      return;
    }

    // Reset if more than 1 hour has passed
    if (now - pattern.lastSeen > 60 * 60 * 1000) {
      this.patterns.set(key, { count: 1, lastSeen: now });
      return;
    }

    pattern.count++;
    pattern.lastSeen = now;

    // Check for suspicious patterns
    if (pattern.count > 50) { // More than 50 actions per hour
      await auditLogger.logSuspiciousActivity(
        `High frequency activity detected: ${pattern.count} ${action} actions in past hour`,
        'HIGH',
        userId,
        ipAddress,
        undefined,
        { action, count: pattern.count }
      );
    }
  }

  /**
   * Clean up old patterns to prevent memory leaks
   */
  static cleanupOldPatterns(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    for (const [key, pattern] of this.patterns.entries()) {
      if (now - pattern.lastSeen > oneHour) {
        this.patterns.delete(key);
      }
    }
  }
}

// Clean up old patterns every hour
setInterval(() => {
  SecurityMonitor.cleanupOldPatterns();
}, 60 * 60 * 1000);