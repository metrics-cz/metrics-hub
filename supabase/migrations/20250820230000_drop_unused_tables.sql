-- Migration: Drop unused tables after moving to BullMQ job scheduling
-- Date: 2025-08-20
-- Description: Remove automation_schedules, integration_health, and application_permissions tables
--              as they are no longer used with the new BullMQ-based scheduling system

-- Drop automation_schedules table (replaced by BullMQ scheduling)
DROP TABLE IF EXISTS automation_schedules CASCADE;

-- Drop integration_health table (if not actively used)
-- Uncomment if confirmed this table is not needed
-- DROP TABLE IF EXISTS integration_health CASCADE;

-- Drop application_permissions table (if not actively used) 
-- Uncomment if confirmed this table is not needed
-- DROP TABLE IF EXISTS application_permissions CASCADE;

-- Note: The commented tables should only be dropped after confirming
-- they are not being used elsewhere in the application