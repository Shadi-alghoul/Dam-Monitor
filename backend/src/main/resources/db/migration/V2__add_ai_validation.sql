-- ============================================================
--  Database Migration for AI Validation
--  Adds AI approval status and rejection reason to reports
--  Generated: May 2026
-- ============================================================

-- Add AI validation fields to environmental_reports table
-- Drop existing columns if they exist to ensure clean state
ALTER TABLE IF EXISTS environmental_reports
DROP COLUMN IF EXISTS ai_approved CASCADE;

ALTER TABLE IF EXISTS environmental_reports
DROP COLUMN IF EXISTS ai_rejection_reason CASCADE;

-- Now add the columns fresh
ALTER TABLE environmental_reports
ADD COLUMN ai_approved BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN ai_rejection_reason VARCHAR(1000);

-- Create index for quick filtering of approved/rejected reports
CREATE INDEX IF NOT EXISTS idx_environmental_reports_ai_approved ON environmental_reports (ai_approved);

-- ============================================================
-- Migration Complete
-- ============================================================