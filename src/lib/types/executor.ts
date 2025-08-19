/**
 * TypeScript interfaces for the Executor Server database schema
 * This file defines all types related to the unified integrations & automations system
 */

// ============================================================================
// Base Application Types (Extended)
// ============================================================================

export type AppType = 'app' | 'integration' | 'both';
export type ExecutionType = 'iframe' | 'server' | 'both';
export type AuthType = 'oauth2' | 'api_key' | 'webhook' | 'basic';
export type TriggerType = 'schedule' | 'webhook' | 'manual' | 'event';
export type PricingModel = 'frequency' | 'flat' | 'usage';

export interface Application {
  id: string;
  name: string;
  description: string;
  long_description?: string;
  category: string;
  category_id?: string;
  developer: string;
  version: string;
  icon_url?: string;
  screenshots?: string[];
  documentation_url?: string;
  pricing_model: 'free' | 'subscription' | 'one_time';
  price?: string;
  features?: string[];
  tags?: string[];
  rating: number;
  download_count: number;
  is_premium: boolean;
  is_active: boolean;
  metadata?: Record<string, any>;
  
  // Extended fields for unified system
  app_type: AppType;
  has_frontend: boolean;
  has_backend: boolean;
  execution_type: ExecutionType;
  storage_path?: string;
  manifest_data: Record<string, any>;
  required_secrets: string[];
  cron_schedule?: string;
  timeout_seconds: number;
  memory_limit: string;
  last_run_at?: string;
  last_run_status?: string;
  
  // Integration-specific fields
  integration_provider?: string; // 'google', 'slack', 'webhook', etc.
  auth_type: AuthType;
  auth_config: Record<string, any>;
  supported_features: string[];
  trigger_type: TriggerType;
  supported_frequencies: string[];
  pricing_model_executor: PricingModel;
  pricing_config: Record<string, any>;
  default_config: Record<string, any>;
  health_check_url?: string;
  webhook_url?: string;
  
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Company Applications (Unified Installation Management)
// ============================================================================

export type CompanyApplicationStatus = 'active' | 'inactive' | 'error' | 'pending' | 'installing';
export type SyncStatus = 'pending' | 'syncing' | 'success' | 'error';

export interface CompanyApplication {
  id: string;
  company_id: string;
  application_id: string;
  
  // Installation details
  name?: string; // Custom name override
  status: CompanyApplicationStatus; // Replaces is_active boolean
  is_enabled: boolean; // For automations: whether actively running
  
  // Connection info (for integrations)
  connected_at: string;
  connected_by?: string;
  last_sync_at?: string;
  sync_status: SyncStatus;
  
  // Configuration
  config: Record<string, any>; // Unified configuration (replaces configuration field)
  notification_channels: Record<string, any>; // Email, Slack, etc.
  
  // Scheduling (for automations)
  frequency: string; // '1h', '6h', '24h', etc.
  timezone: string; // User's timezone
  next_run_at?: string; // Next scheduled execution
  
  // Execution tracking
  last_run_at?: string; // Replaces last_used_at
  run_count: number; // Unified counter (replaces usage_count)
  success_count: number;
  error_count: number;
  last_error_message?: string;
  
  // Pricing
  price_per_month: number;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string;
  
  // Relations
  application?: Application;
}

// ============================================================================
// Secrets Management
// ============================================================================

export interface Secret {
  id: string;
  company_id: string;
  key: string; // e.g., "google_ads_token", "slack_webhook"
  value: string; // encrypted credential value
  app_id?: string; // optional: app-specific secret
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
}

// ============================================================================
// Single Executor Server Infrastructure
// ============================================================================

// Note: ExecutorNode interface removed - using single server architecture
// For multi-node scaling in the future, these interfaces can be restored

export interface ExecutorServerInfo {
  server_type: 'single_executor';
  active_executions: number;
  pending_schedules: number;
  total_executions_today: number;
  max_concurrent_executions: number;
  capacity_utilization: number; // Percentage
  last_checked: string;
  job_queue_system: 'bullmq';
}

// ============================================================================
// BullMQ Job Queue (No Database Table)
// ============================================================================

// Note: Job queue is handled entirely by BullMQ (Redis)
// No database table needed - execution history tracked in execution_runs

export type BullMQJobType = 'execute_integration' | 'run_automation' | 'health_check';
export type BullMQJobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';

// BullMQ job data structure (stored in Redis, not database)
export interface BullMQJobData {
  company_application_id: string;
  job_type: BullMQJobType;
  config?: Record<string, any>;
  user_id?: string;
  trigger_source: 'schedule' | 'manual' | 'webhook';
}

// ============================================================================
// Integration Health Monitoring
// ============================================================================

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
export type ApiStatus = 'connected' | 'disconnected' | 'rate_limited' | 'unauthorized' | 'error';

export interface IntegrationHealth {
  id: string;
  company_application_id: string;
  
  // Health check details
  checked_at: string;
  status: HealthStatus;
  response_time_ms?: number;
  
  // API/Connection status
  api_status?: ApiStatus;
  api_response_code?: number;
  api_error_message?: string;
  
  // Credential status
  credentials_valid?: boolean;
  credentials_expire_at?: string;
  
  // Usage metrics
  daily_api_calls: number;
  daily_quota_limit?: number;
  monthly_usage_mb: number;
  
  // Metadata
  checked_by_node?: string;
  created_at: string;
  
  // Relations
  company_application?: CompanyApplication;
}

// ============================================================================
// Enhanced Scheduling
// ============================================================================

export interface AutomationSchedule {
  id: string;
  company_application_id: string;
  
  // Schedule configuration
  cron_expression: string; // Full cron expression
  timezone: string;
  is_active: boolean;
  
  // Execution windows
  start_date?: string;
  end_date?: string;
  execution_window_start?: string; // Time of day
  execution_window_end?: string; // Time of day
  
  // Tracking
  next_run_at: string;
  last_run_at?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by?: string;
  
  // Relations
  company_application?: CompanyApplication;
}

// ============================================================================
// Execution Tracking (Enhanced)
// ============================================================================

export type ExecutionStatus = 'running' | 'success' | 'error' | 'cancelled';
export type ExecutionTrigger = 'manual' | 'cron' | 'webhook' | 'user';

export interface ExecutionRun {
  id: string;
  company_application_id: string;
  
  // Execution details
  status: ExecutionStatus;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  
  // Trigger information
  execution_type: ExecutionType;
  triggered_by: ExecutionTrigger;
  user_id?: string; // User who triggered execution
  
  // BullMQ integration
  bullmq_job_id?: string; // Optional BullMQ job ID for debugging
  
  // Results and logs
  results: Record<string, any>;
  error_message?: string;
  logs: any[]; // Step-by-step execution log
  
  // Metadata
  created_at: string;
  
  // Relations
  company_application?: CompanyApplication;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateCompanyApplicationRequest {
  application_id: string;
  name?: string;
  config?: Record<string, any>;
  notification_channels?: Record<string, any>;
  frequency?: string;
  timezone?: string;
}

export interface UpdateCompanyApplicationRequest {
  name?: string;
  status?: CompanyApplicationStatus;
  is_enabled?: boolean;
  config?: Record<string, any>;
  notification_channels?: Record<string, any>;
  frequency?: string;
  timezone?: string;
}

export interface CreateBullMQJobRequest {
  company_application_id: string;
  job_type: BullMQJobType;
  priority?: number;
  delay_ms?: number; // Delay in milliseconds
  config?: Record<string, any>;
  trigger_source?: 'schedule' | 'manual' | 'webhook';
}

export interface HealthCheckRequest {
  company_application_id: string;
  check_credentials?: boolean;
  check_api_connection?: boolean;
}

export interface HealthCheckResponse {
  status: HealthStatus;
  checks: {
    api_connection?: {
      status: ApiStatus;
      response_time_ms?: number;
      error?: string;
    };
    credentials?: {
      valid: boolean;
      expires_at?: string;
      error?: string;
    };
    quota?: {
      daily_calls: number;
      daily_limit?: number;
      monthly_usage_mb: number;
    };
  };
}

// ============================================================================
// Executor Server Configuration
// ============================================================================

export interface ExecutorConfig {
  hostname: string;
  max_concurrent_executions: number;
  supported_app_types: string[];
  redis_url: string;
  database_url: string;
  docker_enabled: boolean;
  health_check_interval_ms: number;
  execution_timeout_ms: number;
}

export interface QueueConfig {
  name: string;
  concurrency: number;
  retry_attempts: number;
  retry_delay_ms: number;
  job_timeout_ms: number;
}

// ============================================================================
// Migration and Data Transfer Types
// ============================================================================

export interface LegacyIntegrationMigration {
  // Legacy integration data
  integration_key: string;
  company_integration_id: string;
  
  // Target application data
  application_id: string;
  company_application_id: string;
  
  // Migration status
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error_message?: string;
  migrated_at?: string;
}

export interface LegacyAutomationMigration {
  // Legacy automation data
  script_key: string;
  company_automation_id: string;
  
  // Target application data
  application_id: string;
  company_application_id: string;
  
  // Migration status
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error_message?: string;
  migrated_at?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface FilterOptions {
  status?: CompanyApplicationStatus[];
  app_type?: AppType[];
  integration_provider?: string[];
  is_enabled?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

// ============================================================================
// Error Types
// ============================================================================

export interface ExecutorError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  bullmq_job_id?: string;
  execution_run_id?: string;
  company_application_id?: string;
}

export type ExecutorErrorCode = 
  | 'INTEGRATION_AUTH_FAILED'
  | 'INTEGRATION_API_ERROR'
  | 'INTEGRATION_QUOTA_EXCEEDED'
  | 'AUTOMATION_TIMEOUT'
  | 'AUTOMATION_CONFIG_INVALID'
  | 'BULLMQ_QUEUE_FULL'
  | 'REDIS_CONNECTION_FAILED'
  | 'HEALTH_CHECK_FAILED'
  | 'CREDENTIALS_EXPIRED'
  | 'WEBHOOK_DELIVERY_FAILED';