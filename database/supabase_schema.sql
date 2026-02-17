-- ============================================
-- TORNADO SHELTER APP - SUPABASE DATABASE SCHEMA
-- ============================================
-- 
-- This SQL file creates the database structure for the Tornado Shelter App.
-- Run this in your Supabase SQL Editor to set up the tables.
--
-- SECURITY NOTES:
-- - No API keys or secrets are stored in the database
-- - Row Level Security (RLS) is enabled on all tables
-- - Policies control read/write access
-- - No personally identifiable information (PII) is collected
--
-- ============================================


-- ============================================
-- SHELTERS TABLE
-- Stores tornado shelter locations (static data)
-- ============================================

CREATE TABLE IF NOT EXISTS shelters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Basic Information
    name TEXT NOT NULL,
    description TEXT,
    shelter_type TEXT CHECK (shelter_type IN ('community', 'campus', 'fema_safe_room', 'public_building', 'other')),
    
    -- Location
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT DEFAULT 'OK',
    zip_code TEXT,
    county TEXT,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    
    -- Capacity (optional - for future real-time status feature)
    max_capacity INTEGER,
    is_ada_accessible BOOLEAN DEFAULT false,
    accepts_pets BOOLEAN DEFAULT false,
    
    -- Contact (optional)
    contact_phone TEXT,
    contact_email TEXT,
    website_url TEXT,
    
    -- Operating Info
    operating_hours TEXT,
    special_instructions TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    
    -- Metadata
    source TEXT, -- 'manual', 'fema', 'municipal', 'osu', etc.
    external_id TEXT, -- ID from external source if applicable
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for geospatial queries
CREATE INDEX IF NOT EXISTS idx_shelters_location ON shelters (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_shelters_city ON shelters (city);
CREATE INDEX IF NOT EXISTS idx_shelters_active ON shelters (is_active) WHERE is_active = true;


-- ============================================
-- WEATHER ALERTS HISTORY TABLE
-- Logs NWS alerts for historical tracking
-- ============================================

CREATE TABLE IF NOT EXISTS weather_alerts_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Alert Identification
    nws_alert_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'Tornado Warning', 'Severe Thunderstorm Warning', etc.
    
    -- Alert Details
    headline TEXT,
    description TEXT,
    instruction TEXT,
    severity TEXT, -- 'Extreme', 'Severe', 'Moderate', 'Minor'
    certainty TEXT, -- 'Observed', 'Likely', 'Possible', etc.
    urgency TEXT, -- 'Immediate', 'Expected', 'Future', etc.
    
    -- Geographic Info
    area_description TEXT,
    affected_zones TEXT[], -- Array of zone codes
    
    -- Timing
    onset_time TIMESTAMPTZ,
    expires_time TIMESTAMPTZ,
    
    -- Source
    sender_name TEXT,
    
    -- Flags for quick filtering
    is_tornado_related BOOLEAN DEFAULT false,
    is_severe_thunderstorm BOOLEAN DEFAULT false,
    
    -- Metadata
    raw_data JSONB, -- Store complete alert for reference (no PII)
    logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_alerts_event_type ON weather_alerts_history (event_type);
CREATE INDEX IF NOT EXISTS idx_alerts_logged_at ON weather_alerts_history (logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_tornado ON weather_alerts_history (is_tornado_related) WHERE is_tornado_related = true;
CREATE INDEX IF NOT EXISTS idx_alerts_nws_id ON weather_alerts_history (nws_alert_id);

-- Prevent duplicate alerts
CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_unique ON weather_alerts_history (nws_alert_id, onset_time);


-- ============================================
-- STORM REPORTS TABLE
-- Logs SPC storm reports for historical tracking
-- ============================================

CREATE TABLE IF NOT EXISTS storm_reports_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Report Type
    report_type TEXT NOT NULL CHECK (report_type IN ('tornado', 'wind', 'hail')),
    
    -- Location
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    location_name TEXT,
    county TEXT,
    state TEXT,
    
    -- Report Details
    report_time TEXT, -- Time as reported by SPC
    report_date DATE NOT NULL,
    
    -- Type-specific data
    f_scale TEXT, -- For tornadoes (EF0-EF5)
    wind_speed_knots INTEGER, -- For wind reports
    hail_size_inches DECIMAL(4, 2), -- For hail reports
    
    -- Additional Info
    comments TEXT,
    
    -- Metadata
    logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reports_type ON storm_reports_history (report_type);
CREATE INDEX IF NOT EXISTS idx_reports_date ON storm_reports_history (report_date DESC);
CREATE INDEX IF NOT EXISTS idx_reports_location ON storm_reports_history (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_reports_state ON storm_reports_history (state);


-- ============================================
-- APP CONFIGURATION TABLE
-- Stores non-sensitive app configuration
-- ============================================

CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default configuration
INSERT INTO app_config (key, value, description) VALUES
    ('cache_duration_alerts', '{"minutes": 2}', 'How long to cache NWS alerts'),
    ('cache_duration_shelters', '{"minutes": 5}', 'How long to cache FEMA shelter data'),
    ('cache_duration_reports', '{"minutes": 10}', 'How long to cache SPC storm reports'),
    ('default_search_radius_miles', '{"value": 50}', 'Default radius for nearby shelter search'),
    ('threat_level_thresholds', '{"extreme": 90, "high": 70, "elevated": 50, "moderate": 30}', 'Tornado probability thresholds')
ON CONFLICT (key) DO NOTHING;


-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE shelters ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_alerts_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE storm_reports_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- SHELTERS: Public read access, no public write
CREATE POLICY "Shelters are viewable by everyone" 
    ON shelters FOR SELECT 
    USING (is_active = true);

-- WEATHER ALERTS HISTORY: Public read access
CREATE POLICY "Weather alerts history is viewable by everyone" 
    ON weather_alerts_history FOR SELECT 
    USING (true);

-- STORM REPORTS HISTORY: Public read access
CREATE POLICY "Storm reports history is viewable by everyone" 
    ON storm_reports_history FOR SELECT 
    USING (true);

-- APP CONFIG: Public read access
CREATE POLICY "App config is viewable by everyone" 
    ON app_config FOR SELECT 
    USING (true);

-- NOTE: Insert/Update/Delete policies for authenticated admin users
-- should be added separately based on your auth setup.
-- Example (uncomment and modify as needed):
--
-- CREATE POLICY "Admins can insert shelters"
--     ON shelters FOR INSERT
--     TO authenticated
--     WITH CHECK (auth.jwt() ->> 'role' = 'admin');


-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance_miles(
    lat1 DECIMAL,
    lon1 DECIMAL,
    lat2 DECIMAL,
    lon2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
    R DECIMAL := 3959; -- Earth radius in miles
    dLat DECIMAL;
    dLon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dLat := RADIANS(lat2 - lat1);
    dLon := RADIANS(lon2 - lon1);
    a := SIN(dLat / 2) * SIN(dLat / 2) +
         COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
         SIN(dLon / 2) * SIN(dLon / 2);
    c := 2 * ATAN2(SQRT(a), SQRT(1 - a));
    RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- Function to get nearby shelters
CREATE OR REPLACE FUNCTION get_nearby_shelters(
    user_lat DECIMAL,
    user_lon DECIMAL,
    radius_miles DECIMAL DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    address TEXT,
    city TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    shelter_type TEXT,
    max_capacity INTEGER,
    is_ada_accessible BOOLEAN,
    accepts_pets BOOLEAN,
    distance_miles DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.address,
        s.city,
        s.latitude,
        s.longitude,
        s.shelter_type,
        s.max_capacity,
        s.is_ada_accessible,
        s.accepts_pets,
        ROUND(calculate_distance_miles(user_lat, user_lon, s.latitude, s.longitude)::DECIMAL, 2) AS distance_miles
    FROM shelters s
    WHERE s.is_active = true
      AND calculate_distance_miles(user_lat, user_lon, s.latitude, s.longitude) <= radius_miles
    ORDER BY distance_miles ASC;
END;
$$ LANGUAGE plpgsql STABLE;


-- Function to get recent tornado alerts
CREATE OR REPLACE FUNCTION get_recent_tornado_alerts(
    hours_back INTEGER DEFAULT 24
)
RETURNS SETOF weather_alerts_history AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM weather_alerts_history
    WHERE is_tornado_related = true
      AND logged_at >= NOW() - (hours_back || ' hours')::INTERVAL
    ORDER BY logged_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;


-- Function to get storm reports for a date range
CREATE OR REPLACE FUNCTION get_storm_reports(
    start_date DATE,
    end_date DATE DEFAULT CURRENT_DATE,
    report_type_filter TEXT DEFAULT NULL
)
RETURNS SETOF storm_reports_history AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM storm_reports_history
    WHERE report_date BETWEEN start_date AND end_date
      AND (report_type_filter IS NULL OR report_type = report_type_filter)
    ORDER BY report_date DESC, logged_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;


-- ============================================
-- AUTOMATIC TIMESTAMP UPDATE TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shelters_updated_at
    BEFORE UPDATE ON shelters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- SAMPLE DATA (Oklahoma Shelters)
-- ============================================
-- Run to insert sample shelters

INSERT INTO shelters (name, address, city, state, latitude, longitude, shelter_type, source) VALUES
    ('OSU Student Union', '900 N Hester St', 'Stillwater', 'OK', 36.1213, -97.0685, 'campus', 'osu'),
    ('OSU Colvin Recreation Center', '1514 W Hall of Fame Ave', 'Stillwater', 'OK', 36.1275, -97.0819, 'campus', 'osu'),
    ('Tulsa Community Center', '1234 Main St', 'Tulsa', 'OK', 36.1540, -95.9928, 'community', 'manual'),
    ('OKC Emergency Shelter', '500 N Walker Ave', 'Oklahoma City', 'OK', 35.4729, -97.5171, 'public_building', 'manual'),
    ('Norman Public Library', '225 N Webster Ave', 'Norman', 'OK', 35.2226, -97.4395, 'public_building', 'manual')
ON CONFLICT DO NOTHING;

-- ============================================
-- SETUP COMPLETE
-- ============================================
-- 
-- Next steps:
-- 1. Run this SQL in your Supabase SQL Editor
-- 2. Update the React Native client with your Supabase URL and anon key
-- 3. Add shelters to the database (manually or via import)
-- 4. Configure additional RLS policies for admin users if needed
--
-- ============================================
