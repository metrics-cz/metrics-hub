# Executor Server Database Schema Documentation

This document describes the database schema designed for the unified integrations & automations executor server system.

## Overview

The executor server database schema provides a unified, scalable architecture optimized for distributed job processing. As of July 26, 2025, all legacy integration and automation tables have been cleaned up, leaving a streamlined, production-ready schema.

### Key Design Principles

1. **Unified Management**: Single `applications` table supports both frontend apps and backend integrations/automations
2. **Distributed Execution**: Support for multiple executor server instances with load balancing
3. **Reliable Job Processing**: Integration with BullMQ for robust job queue management
4. **Health Monitoring**: Comprehensive integration health tracking and alerting
5. **Enhanced Scheduling**: Advanced cron-based scheduling with timezone support
6. **Security**: Row-level security (RLS) throughout with service role permissions

## Schema Architecture

### Core Tables

#### `applications` (Extended)
Unified table for all applications, integrations, and automations.

**Key Fields:**
- `app_type`: `'app' | 'integration' | 'both'`
- `execution_type`: `'iframe' | 'server' | 'both'`
- `integration_provider`: Third-party service provider
- `auth_type`: Authentication method required
- `trigger_type`: How the integration is triggered
- `supported_frequencies`: Available scheduling options

#### `company_applications`
Replaces `company_integrations` and `company_automations` tables.

**Key Features:**
- Unified installation management
- Status tracking (`active`, `inactive`, `error`, `pending`, `installing`)
- Configuration and notification settings
- Execution statistics and error tracking
- Pricing and billing information

#### `secrets`
Secure credential storage for integrations.

**Security Features:**
- Encrypted values (placeholder encryption in current implementation)
- App-specific or company-wide secrets
- Usage tracking with `last_used_at`
- RLS policies restricting access to company members

### Executor Infrastructure Tables

#### `executor_nodes`
Tracks executor server instances for distributed processing.

**Capabilities:**
- Load balancing with `current_job_count` / `max_concurrent_jobs`
- Health monitoring via `last_heartbeat`
- Version tracking for rolling updates
- Capability declarations (`supported_app_types`, `docker_enabled`)

#### `executor_jobs`
Job queue table integrated with BullMQ.

**Job Management:**
- Priority-based scheduling
- Retry logic with `attempts` / `max_attempts`
- Execution tracking and timing
- Results and error storage
- Node assignment for processing

#### `integration_health`
Monitors third-party integration health and performance.

**Health Metrics:**
- Connection status and response times
- API quota and usage tracking
- Credential validation and expiration
- Historical health data for trend analysis

#### `automation_schedules`
Enhanced scheduling system with timezone support.

**Advanced Features:**
- Full cron expression support
- Execution time windows
- Multi-timezone scheduling
- Schedule activation/deactivation

#### `execution_runs`
Enhanced execution tracking (replaces `automation_runs`).

**Execution Details:**
- Trigger source tracking
- Performance metrics
- Detailed logging and results
- Error handling and debugging info

## Schema Evolution History

### Migration Timeline

1. **July 8, 2025**: Initial separate integrations/automations system created
2. **July 15, 2025**: Unified applications system introduced
3. **July 26, 2025**: Executor server schema deployed and legacy tables cleaned up

### Key Migration Files

- `20250726000000_consolidate_executor_schema.sql`: Core executor schema
- `20250726000003_add_missing_columns.sql`: Applications table enhancements
- `20250726000004_fix_company_applications.sql`: Company applications optimization
- `20250726000006_create_executor_tables.sql`: Executor infrastructure tables
- `20250726000007_cleanup_legacy_tables.sql`: Legacy table cleanup (COMPLETED)

### ✅ **Legacy Cleanup Completed**

As of the latest migration, the following legacy tables have been **successfully removed**:
- ~~`integrations`~~ → Functionality moved to `applications` table
- ~~`company_integrations`~~ → Functionality moved to `company_applications` table  
- ~~`automations`~~ → Functionality moved to `applications` table
- ~~`company_automations`~~ → Functionality moved to `company_applications` table
- ~~`automation_runs`~~ → Functionality moved to `execution_runs` and `executor_jobs` tables

The database now contains only the essential, optimized tables for the executor server architecture.

## Security Model

### Row Level Security (RLS)

All tables implement RLS with policies for:
- **Company Isolation**: Users only access their company's data
- **Service Role Access**: Executor servers have full access via service role
- **Role-Based Permissions**: Different access levels for owners/admins/members

### Service Role Permissions

The executor server operates with `service_role` permissions to:
- Create and update job records
- Monitor integration health
- Manage executor node registration
- Access secrets for integration authentication

## Executor Server Integration

### BullMQ Integration

The `executor_jobs` table maps directly to BullMQ jobs:
- `job_id` field stores BullMQ job identifier
- `status` field mirrors BullMQ job states
- `priority` field controls BullMQ job priority
- `result` and `error_message` store job outcomes

### Docker Container Support

Executor nodes can run integrations in Docker containers:
- `docker_enabled` flag on executor nodes
- Isolation and security for third-party code
- Resource limits via `memory_limit` and `timeout_seconds`

### Health Monitoring

Automated health checks via:
- Regular API connection testing
- Credential validation and renewal
- Quota monitoring and alerting
- Performance degradation detection

## Performance Optimizations

### Database Indexes

Strategic indexes for common query patterns:
- Job queue operations (`status`, `priority`, `scheduled_at`)
- Company data access (`company_id`)
- Health monitoring (`checked_at`, `status`)
- Scheduling queries (`next_run_at`, `is_active`)

### Query Optimization

- RLS policies optimized to avoid N+1 queries
- Materialized views for reporting (can be added later)
- Connection pooling configuration for high concurrency

## API Integration

### TypeScript Interfaces

Complete type definitions in `/src/lib/types/executor.ts`:
- Database table interfaces
- API request/response types
- Configuration and error types
- Utility types for filtering and pagination

### REST API Endpoints

The schema supports REST API endpoints for:
- `/api/company/{id}/applications` - Unified app management
- `/api/executor/jobs` - Job queue operations
- `/api/executor/health` - Health monitoring
- `/api/executor/schedules` - Schedule management

## Monitoring and Observability

### Built-in Metrics

The schema captures:
- Execution counts and success rates
- Response times and error rates
- Resource usage and quotas
- Scheduling accuracy and drift

### Audit Trail

Comprehensive audit logging via:
- Creation and modification timestamps
- User attribution for all changes
- Execution history preservation
- Error tracking and debugging info

## Scaling Considerations

### Horizontal Scaling

The schema supports horizontal scaling via:
- Multiple executor nodes with load balancing
- Partitioned job queues by priority/type
- Read replicas for reporting queries
- Background job processing separation

### Performance Monitoring

Key metrics to monitor:
- Job queue depth and processing time
- Integration response times and error rates
- Database connection pool utilization
- Executor node resource usage

## Development Workflow

### Local Development

1. Run migrations to create schema:
   ```sql
   -- Apply consolidated schema
   \i supabase/migrations/20250726000000_consolidate_executor_schema.sql
   
   -- Migrate existing data (if applicable)
   \i supabase/migrations/20250726000001_migrate_legacy_data.sql
   ```

2. Import TypeScript types:
   ```typescript
   import { CompanyApplication, ExecutorJob } from '@/lib/types/executor';
   ```

### Testing Strategy

- Unit tests for database functions
- Integration tests for API endpoints
- Load testing for job queue performance
- Health check validation tests

## Future Enhancements

### Planned Features

1. **Advanced Scheduling**: Support for complex scheduling rules and dependencies
2. **Auto-scaling**: Dynamic executor node provisioning based on load
3. **Enhanced Monitoring**: Real-time dashboards and alerting systems
4. **Advanced Analytics**: Performance insights and usage optimization
5. **Workflow Orchestration**: Multi-step automation workflows

### Extension Points

The schema includes extension points for:
- Custom integration types via `metadata` fields
- Plugin architecture via `supported_features`
- Advanced configuration via JSON fields
- Custom health checks via `health_check_url`

## Troubleshooting

### Common Issues

1. **Migration Failures**: Check foreign key constraints and data types
2. **Permission Errors**: Verify RLS policies and service role grants
3. **Performance Issues**: Review indexes and query patterns
4. **Data Inconsistency**: Run validation queries after migration

### Debugging Tools

- Migration validation queries in migration scripts
- Health check endpoints for system status
- Detailed error logging in `executor_jobs` table
- Audit trails for change tracking

## Support and Maintenance

### Regular Maintenance

- Monitor job queue depth and performance
- Review integration health trends
- Clean up old execution run data
- Update executor node versions

### Performance Tuning

- Analyze slow queries and add indexes
- Optimize RLS policies for efficiency
- Configure connection pooling
- Monitor resource usage patterns

---

*This documentation will be updated as the executor server system evolves and new features are added.*