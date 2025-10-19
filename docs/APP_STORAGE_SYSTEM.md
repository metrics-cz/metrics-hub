# App Storage and Execution System

## Overview

This document describes the comprehensive app storage and execution system implemented for the metrics-hub application. The system provides infrastructure for storing, managing, and executing user-submitted applications with proper security, isolation, and monitoring.

## Storage Infrastructure

### Supabase Storage Buckets

#### 1. `app-storage` Bucket
- **Purpose**: Main storage for application files, builds, and source code
- **Access**: Private with RLS policies
- **Size Limit**: 100MB per upload
- **Folder Structure**: `/app_{appId}/`
- **Allowed File Types**:
  - `application/json` - manifest.json files
  - `application/javascript`, `text/javascript` - JS files
  - `text/html`, `text/css` - Frontend files
  - `application/zip`, `application/x-tar`, `application/gzip` - Archives
  - `application/octet-stream` - Binary executables
  - `image/png`, `image/jpeg`, `image/svg+xml` - Icons and images

#### 2. `app-logs` Bucket
- **Purpose**: Execution logs and outputs
- **Access**: Private with company-specific access
- **Size Limit**: 50MB per log file
- **Folder Structure**: `/app_{appId}/runs/{runId}/`
- **Allowed File Types**:
  - `text/plain` - Log files
  - `application/json` - JSON output
  - `text/csv`, `application/xml`, `text/xml` - Structured output

### RLS Policies

#### Storage Access Control
- **Company Access**: Companies can only access apps they're assigned to
- **Superadmin Access**: Superadmins can manage all app storage
- **System Access**: Service role can read all app storage for execution
- **Executor Access**: Separate server can access files for execution

## Database Schema

### Core Tables

#### `app_storage`
Tracks all app files and their metadata:
- `id` - UUID primary key
- `app_id` - References applications table
- `file_path` - Path in storage bucket
- `file_type` - Type of file (manifest, source, build, asset, dist, config)
- `file_size` - Size in bytes
- `version` - App version
- `checksum` - File integrity checksum
- `metadata` - Additional file metadata
- `created_at`, `updated_at` - Timestamps

#### `app_builds`
Manages build metadata and status:
- `id` - UUID primary key
- `app_id` - References applications table
- `build_version` - Build version string
- `build_status` - Status (pending, building, success, failed, cancelled)
- `build_path` - Path to build artifacts
- `build_config` - Build configuration
- `build_logs` - Build logs
- `created_at`, `completed_at` - Timestamps

#### `app_runs`
Tracks execution history:
- `id` - UUID primary key
- `app_id` - References applications table
- `company_id` - References companies table
- `build_id` - References app_builds table
- `run_type` - Type (manual, cron, webhook, test)
- `status` - Status (pending, running, success, failed, cancelled, timeout)
- `executor_id` - ID of executor server
- `started_at`, `completed_at` - Timestamps
- `duration_ms` - Execution duration
- `logs_path`, `output_path` - Paths to logs and output
- `error_message` - Error details
- `metadata` - Additional run metadata

#### `app_outputs`
Stores execution results:
- `id` - UUID primary key
- `run_id` - References app_runs table
- `output_type` - Type (stdout, stderr, file, metric, result, error)
- `output_name` - Output identifier
- `output_data` - Small output data (JSON)
- `output_path` - Path to large output files
- `file_size` - Output file size
- `created_at` - Timestamp

#### `app_cron_schedules`
Manages scheduled executions:
- `id` - UUID primary key
- `app_id` - References applications table
- `company_id` - References companies table
- `cron_expression` - Cron schedule expression
- `timezone` - Schedule timezone
- `is_active` - Whether schedule is active
- `last_run_at`, `next_run_at` - Execution times
- `last_run_id` - References app_runs table
- `config` - Schedule configuration
- `created_at`, `updated_at` - Timestamps

#### `app_permissions`
Defines app-specific permissions:
- `id` - UUID primary key
- `app_id` - References applications table
- `permission_type` - Type (storage, network, database, api, system, custom)
- `permission_value` - Permission scope/value
- `description` - Human-readable description
- `is_required` - Whether permission is required
- `created_at` - Timestamp

### Security Features

#### Row Level Security (RLS)
All tables have RLS enabled with policies for:
- **Company Access**: Users can only access data for their companies
- **Superadmin Access**: Superadmins can manage all data
- **Role-based Access**: Different permissions for owners, admins, members

#### Data Validation
- **File Type Validation**: Strict MIME type checking
- **Size Limits**: Configurable file size limits
- **Status Validation**: Enum constraints for status fields
- **Unique Constraints**: Prevent duplicate entries

## App Manifest Format

Apps must include a `manifest.json` file with the following structure:

```json
{
  "name": "app-name",
  "version": "1.0.0",
  "description": "App description",
  "author": "Developer Name",
  "type": "both",
  "runtime": {
    "backend": {
      "type": "nodejs",
      "version": "18",
      "entrypoint": "index.js",
      "package_manager": "pnpm",
      "dependencies": {
        "express": "^4.18.2"
      }
    },
    "frontend": {
      "type": "static",
      "entrypoint": "dist/index.html",
      "assets": ["dist/"]
    }
  },
  "permissions": [
    {
      "type": "storage",
      "scope": "read",
      "required": true
    },
    {
      "type": "network",
      "scope": "outbound_http",
      "required": false
    }
  ],
  "config": {
    "timeout": 300,
    "memory_limit": "256MB",
    "cpu_limit": "0.5"
  }
}
```

## Execution Architecture

### Package Management

The system now uses **pnpm** as the default package manager for better performance and dependency management:

#### pnpm Benefits
- **Faster installs**: pnpm uses hard links and symlinks for efficient storage
- **Space efficient**: Shared dependency storage across projects  
- **Better dependency resolution**: Strict handling of peer dependencies
- **npm compatibility**: All npm scripts work seamlessly with pnpm

#### Configuration Files
Apps can include these pnpm configuration files:
- **`.pnpmrc`**: pnpm-specific configuration
- **`pnpm-lock.yaml`**: Dependency lockfile (replaces package-lock.json)
- **`package.json`**: Standard package configuration (works with both npm and pnpm)

#### Dependency Installation Process
1. System checks for `package.json` in extracted app directory
2. If found, runs `pnpm install` with 5-minute timeout
3. Falls back to npm if pnpm is not available
4. Logs installation output for debugging

### Executor Server Integration
The system is designed to work with a separate executor server that:
- Pulls app files from `app-storage` bucket
- Executes apps in sandboxed Docker containers
- Uses pnpm for dependency installation by default
- Writes logs to `app-logs` bucket
- Updates run status in database
- Handles cron scheduling

### Security Isolation
- **Container Sandboxing**: Each app runs in isolated Docker container
- **Resource Limits**: Configurable CPU and memory limits
- **Network Isolation**: Controlled network access based on permissions
- **File System Isolation**: Apps can only access their own files

## Usage Examples

### Direct Database Insert (Current Method)
Since upload functionality is not yet implemented, apps can be added directly to the database:

```sql
-- Add app files to app_storage table
INSERT INTO app_storage (app_id, file_path, file_type, file_size, version, checksum, metadata)
VALUES (
  'app-uuid',
  'app_app-uuid/manifest.json',
  'manifest',
  512,
  '1.0.0',
  'sha256:abc123',
  '{"entrypoint": "index.js"}'
);
```

### API Endpoints (Future Implementation)
The schema supports future API endpoints for:
- `/api/apps/{appId}/storage` - File management
- `/api/apps/{appId}/builds` - Build management
- `/api/apps/{appId}/runs` - Execution management
- `/api/apps/{appId}/schedules` - Cron schedule management

## Migration Files

The system includes three migration files:

1. `20250715000000_create_app_storage_buckets.sql` - Creates storage buckets and policies
2. `20250715000001_create_app_storage_schema.sql` - Creates database tables and indexes
3. `20250715000002_add_test_app_data.sql` - Template for test data (commented out)

## Integration Points

### Existing System Integration
- **Applications Table**: Extends existing marketplace apps
- **Companies Table**: Connects to company management
- **Authentication**: Uses existing Supabase auth
- **Notifications**: Can integrate with existing notification system

### Future Enhancements
- **Upload Interface**: Web-based app upload system
- **Build Pipeline**: Automated build and deployment
- **Monitoring Dashboard**: Real-time execution monitoring
- **Scaling**: Multi-executor support and load balancing

## Performance Considerations

### Database Optimization
- **Indexes**: Comprehensive indexing for common queries
- **Partitioning**: Future table partitioning for large datasets
- **Caching**: Query result caching for frequent operations

### Storage Optimization
- **Compression**: File compression for large uploads
- **CDN**: Content delivery network for static assets
- **Cleanup**: Automated cleanup of old builds and logs

## Monitoring and Logging

### Metrics Collection
- **Execution Metrics**: Runtime, resource usage, success rates
- **Storage Metrics**: File sizes, storage usage, transfer rates
- **Performance Metrics**: Query performance, API response times

### Alerting
- **Failed Executions**: Alert on execution failures
- **Resource Limits**: Alert on resource usage thresholds
- **Security Events**: Alert on security violations

This comprehensive system provides a solid foundation for app storage and execution with proper security, monitoring, and scalability considerations.