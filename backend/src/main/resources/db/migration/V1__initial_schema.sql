-- ============================================================
--  Initial Database Schema for Environmental Reports
--  Flyway Baseline Migration (V1)
--  Generated: May 2026
-- ============================================================

-- Create environmental_reports table
CREATE TABLE IF NOT EXISTS environmental_reports (
    id SERIAL PRIMARY KEY,
    blob_name VARCHAR(512) NOT NULL UNIQUE,
    image_url VARCHAR(1024) NOT NULL,
    description VARCHAR(1000) NOT NULL,
    problem_type VARCHAR(64) NOT NULL,
    satellite_image_url VARCHAR(1024),
    satellite_taken_at TIMESTAMP,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    pixelx INTEGER,
    pixely INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_environmental_reports_created_at ON environmental_reports (created_at DESC);

-- ============================================================
-- Flyway Baseline Complete
-- ============================================================