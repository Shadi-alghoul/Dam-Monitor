-- ============================================================
--  Database Migration for AI Validation - Fix NULL values
--  Removes and recreates ai_approved column with proper defaults
--  Generated: May 2026
-- ============================================================

-- First, remove the index if it exists
DROP INDEX IF EXISTS idx_environmental_reports_ai_approved;

-- Drop the columns if they exist (cleaning up from previous migration)
ALTER TABLE IF EXISTS environmental_reports
DROP COLUMN IF EXISTS ai_approved,
DROP COLUMN IF EXISTS ai_rejection_reason;

-- Add AI validation fields back with proper constraints
ALTER TABLE environmental_reports
ADD COLUMN ai_approved BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN ai_rejection_reason VARCHAR(1000);

-- Create index for quick filtering of approved/rejected reports
CREATE INDEX idx_environmental_reports_ai_approved ON environmental_reports (ai_approved);