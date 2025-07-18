-- Add test app data to demonstrate the app storage and execution system
-- This migration creates a simple test app with sample data

-- Insert a test application (assuming there's an applications table)
-- Note: This will be empty for now as requested, but structure is prepared

-- Create a test app entry (commented out for now - will be added when needed)
/*
INSERT INTO public.applications (
    id,
    name,
    description,
    category,
    type,
    version,
    author,
    status,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Hello World App',
    'A simple Hello World application for testing the execution system',
    'utility',
    'both', -- Both frontend and backend
    '1.0.0',
    'System',
    'approved',
    now(),
    now()
);
*/

-- Create test app storage entries (commented out for now)
/*
INSERT INTO public.app_storage (
    app_id,
    file_path,
    file_type,
    file_size,
    version,
    checksum,
    metadata
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440000',
    'app_550e8400-e29b-41d4-a716-446655440000/manifest.json',
    'manifest',
    512,
    '1.0.0',
    'sha256:abc123def456',
    '{"entrypoint": "index.js", "frontend_path": "dist/index.html"}'
),
(
    '550e8400-e29b-41d4-a716-446655440000',
    'app_550e8400-e29b-41d4-a716-446655440000/index.js',
    'source',
    1024,
    '1.0.0',
    'sha256:def456ghi789',
    '{"language": "javascript", "runtime": "node18"}'
),
(
    '550e8400-e29b-41d4-a716-446655440000',
    'app_550e8400-e29b-41d4-a716-446655440000/dist/index.html',
    'dist',
    2048,
    '1.0.0',
    'sha256:ghi789jkl012',
    '{"build_tool": "webpack", "minified": true}'
);
*/

-- Create test app build (commented out for now)
/*
INSERT INTO public.app_builds (
    app_id,
    build_version,
    build_status,
    build_path,
    build_config,
    build_logs,
    created_at,
    completed_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'v1.0.0-build.1',
    'success',
    'app_550e8400-e29b-41d4-a716-446655440000/builds/v1.0.0-build.1',
    '{"node_version": "18", "build_command": "npm run build"}',
    'Build completed successfully',
    now() - interval '1 hour',
    now() - interval '50 minutes'
);
*/

-- Create test app permissions (commented out for now)
/*
INSERT INTO public.app_permissions (
    app_id,
    permission_type,
    permission_value,
    description,
    is_required
) VALUES 
(
    '550e8400-e29b-41d4-a716-446655440000',
    'storage',
    'read',
    'Read access to app storage',
    true
),
(
    '550e8400-e29b-41d4-a716-446655440000',
    'network',
    'outbound_http',
    'Make outbound HTTP requests',
    false
),
(
    '550e8400-e29b-41d4-a716-446655440000',
    'system',
    'console_log',
    'Write to console/logs',
    true
);
*/

-- Create test cron schedule (commented out for now)
/*
INSERT INTO public.app_cron_schedules (
    app_id,
    company_id,
    cron_expression,
    timezone,
    is_active,
    next_run_at,
    config
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    '00000000-0000-0000-0000-000000000001', -- Replace with actual company ID
    '0 9 * * 1', -- Every Monday at 9 AM
    'UTC',
    true,
    now() + interval '1 day',
    '{"timeout": 300, "retry_count": 3}'
);
*/

-- Sample manifest.json content for reference
/*
{
  "name": "hello-world-app",
  "version": "1.0.0",
  "description": "A simple Hello World application",
  "author": "System",
  "type": "both",
  "runtime": {
    "backend": {
      "type": "nodejs",
      "version": "18",
      "entrypoint": "index.js",
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
*/

-- Sample index.js content for reference
/*
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.json({
        message: 'Hello World!',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
});

app.listen(port, () => {
    console.log(`Hello World app listening at http://localhost:${port}`);
});
*/

-- Sample index.html content for reference
/*
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hello World App</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background-color: #f0f0f0;
        }
        .container {
            text-align: center;
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .status {
            color: #28a745;
            font-size: 1.2rem;
            margin-top: 1rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Hello World App</h1>
        <p>This is a test application for the execution system.</p>
        <div class="status" id="status">Loading...</div>
    </div>
    
    <script>
        // Simple frontend that communicates with backend
        fetch('/api/health')
            .then(response => response.json())
            .then(data => {
                document.getElementById('status').textContent = 'Status: ' + data.status;
            })
            .catch(error => {
                document.getElementById('status').textContent = 'Status: Error - ' + error.message;
            });
    </script>
</body>
</html>
*/

-- This migration creates the structure but leaves the actual data commented out
-- Uncomment the INSERT statements above when you're ready to add test data
-- The sample files content is provided as comments for reference