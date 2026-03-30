-- ============================================================
--  Hartbeespoort Dam Environmental Monitoring App
--  PostgreSQL Database Schema
--  Generated: March 2026
-- ============================================================

-- Enable PostGIS for geospatial support (install extension first)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
--  ENUM TYPES
-- ============================================================

CREATE TYPE problem_type AS ENUM (
    'hyacinth',
    'green_algae',
    'blue_green_algae',
    'pollution',
    'sewage',
    'litter',
    'oil_spill',
    'other'
);

CREATE TYPE alert_severity AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);

CREATE TYPE notification_channel AS ENUM (
    'push',
    'email',
    'in_app'
);

CREATE TYPE notification_status AS ENUM (
    'pending',
    'sent',
    'failed'
);

-- ============================================================
--  USERS
-- ============================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    username        VARCHAR(100) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(150),
    phone_number    VARCHAR(30),
    fcm_token       VARCHAR(512),           -- Firebase Cloud Messaging device token
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
    points          INTEGER NOT NULL DEFAULT 0,     -- Gamification
    level           INTEGER NOT NULL DEFAULT 1,     -- Gamification
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);

-- ============================================================
--  DAM ZONES
--  Pre-defined geographic zones of the dam used for
--  concentration calculations and alert scoping.
-- ============================================================

CREATE TABLE dam_zones (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,          -- e.g. "North Basin", "Eastern Shore"
    description     TEXT,
    boundary        GEOMETRY(POLYGON, 4326),        -- PostGIS polygon (WGS84)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dam_zones_boundary ON dam_zones USING GIST (boundary);

-- ============================================================
--  REPORTS
--  Core table — one row per user-submitted photo report.
-- ============================================================

CREATE TABLE reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE SET NULL,
    zone_id         INTEGER REFERENCES dam_zones (id) ON DELETE SET NULL,

    -- Geographic coordinates (nullable — supplied when user clicks the map)
    latitude        DOUBLE PRECISION
                        CHECK (latitude  IS NULL OR latitude  BETWEEN -90  AND 90),
    longitude       DOUBLE PRECISION
                        CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),

    -- Map pixel coordinates of the clicked location
    -- These are the raw pixel (x, y) values from the frontend map image/canvas
    pixel_x         INTEGER,
    pixel_y         INTEGER,

    location        GEOMETRY(POINT, 4326),          -- PostGIS point, populated via trigger

    -- Content
    description     TEXT,
    problem_type    problem_type NOT NULL,
    severity        alert_severity NOT NULL DEFAULT 'low',

    -- Image
    image_url       VARCHAR(1024) NOT NULL,         -- Azure Blob CDN URL
    image_blob_key  VARCHAR(512),                   -- Raw blob storage key

    -- AI categorisation (Phase 4)
    ai_problem_type     problem_type,               -- Azure Custom Vision result
    ai_confidence       NUMERIC(5, 4),              -- 0.0000 – 1.0000
    ai_processed_at     TIMESTAMPTZ,

    -- Metadata
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    is_flagged      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_user_id      ON reports (user_id);
CREATE INDEX idx_reports_zone_id      ON reports (zone_id);
CREATE INDEX idx_reports_problem_type ON reports (problem_type);
CREATE INDEX idx_reports_created_at   ON reports (created_at DESC);
CREATE INDEX idx_reports_location     ON reports USING GIST (location);

-- ============================================================
--  ZONE CONCENTRATION SNAPSHOTS
--  Periodically computed concentration scores per zone
--  per problem type. Powers the heatmap.
-- ============================================================

CREATE TABLE zone_concentrations (
    id              SERIAL PRIMARY KEY,
    zone_id         INTEGER NOT NULL REFERENCES dam_zones (id) ON DELETE CASCADE,
    problem_type    problem_type NOT NULL,
    report_count    INTEGER NOT NULL DEFAULT 0,
    concentration   NUMERIC(8, 4) NOT NULL DEFAULT 0,   -- Weighted score
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_zone_concentrations_zone    ON zone_concentrations (zone_id);
CREATE INDEX idx_zone_concentrations_time    ON zone_concentrations (computed_at DESC);

-- ============================================================
--  ALERT THRESHOLDS
--  Configurable per zone + problem type. Admin-managed.
-- ============================================================

CREATE TABLE alert_thresholds (
    id              SERIAL PRIMARY KEY,
    zone_id         INTEGER REFERENCES dam_zones (id) ON DELETE CASCADE,
                                                    -- NULL = applies to all zones
    problem_type    problem_type,                   -- NULL = applies to all problem types
    severity        alert_severity NOT NULL,
    threshold_value NUMERIC(8, 4) NOT NULL,         -- Concentration value to trigger alert
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      UUID REFERENCES users (id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  ALERTS
--  Generated when a zone concentration breaches a threshold.
-- ============================================================

CREATE TABLE alerts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id         INTEGER NOT NULL REFERENCES dam_zones (id) ON DELETE CASCADE,
    threshold_id    INTEGER REFERENCES alert_thresholds (id),
    problem_type    problem_type NOT NULL,
    severity        alert_severity NOT NULL,
    concentration   NUMERIC(8, 4) NOT NULL,         -- Concentration at time of alert
    message         TEXT NOT NULL,
    is_resolved     BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_zone_id    ON alerts (zone_id);
CREATE INDEX idx_alerts_created_at ON alerts (created_at DESC);
CREATE INDEX idx_alerts_resolved   ON alerts (is_resolved);

-- ============================================================
--  USER NOTIFICATIONS
--  Tracks which alerts were dispatched to which users
--  and via which channel.
-- ============================================================

CREATE TABLE user_notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    alert_id        UUID NOT NULL REFERENCES alerts (id) ON DELETE CASCADE,
    channel         notification_channel NOT NULL,
    status          notification_status NOT NULL DEFAULT 'pending',
    sent_at         TIMESTAMPTZ,
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_notifications_user  ON user_notifications (user_id);
CREATE INDEX idx_user_notifications_alert ON user_notifications (alert_id);

-- ============================================================
--  SATELLITE IMAGE LOG  (Phase 4 – Earth Engine integration)
--  Tracks which satellite images have been fetched and linked
--  to heatmap snapshots.
-- ============================================================

CREATE TABLE satellite_images (
    id              SERIAL PRIMARY KEY,
    source          VARCHAR(50) NOT NULL,           -- e.g. 'landsat_7', 'sentinel_2'
    image_date      DATE NOT NULL,
    image_url       VARCHAR(1024),
    blob_key        VARCHAR(512),
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
--  AUTO-UPDATE updated_at TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
--  AUTO-ASSIGN ZONE + POPULATE location POINT TRIGGER
--  When a report is inserted with lat/lon, derive the PostGIS
--  point and find the containing dam_zone automatically.
-- ============================================================

CREATE OR REPLACE FUNCTION assign_zone_to_report()
RETURNS TRIGGER AS $$
BEGIN
    -- Build the PostGIS point from lat/lon when both are provided
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);

        SELECT id INTO NEW.zone_id
        FROM   dam_zones
        WHERE  ST_Contains(boundary, NEW.location)
        LIMIT  1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reports_assign_zone
    BEFORE INSERT ON reports
    FOR EACH ROW EXECUTE FUNCTION assign_zone_to_report();

-- ============================================================
--  SEED DATA — Problem thresholds (example values)
-- ============================================================

INSERT INTO alert_thresholds (zone_id, problem_type, severity, threshold_value) VALUES
    (NULL, 'hyacinth',         'medium',   10),
    (NULL, 'hyacinth',         'high',     25),
    (NULL, 'hyacinth',         'critical', 50),
    (NULL, 'blue_green_algae', 'medium',   8),
    (NULL, 'blue_green_algae', 'high',     20),
    (NULL, 'blue_green_algae', 'critical', 40),
    (NULL, 'pollution',        'medium',   5),
    (NULL, 'pollution',        'high',     15),
    (NULL, 'pollution',        'critical', 30);

-- ============================================================
--  END OF SCHEMA
-- ============================================================
