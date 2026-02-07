-- =============================================================================
-- BASE APP TEMPLATE - Core Database Schema
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- ACCOUNTS (Users)
-- -----------------------------------------------------------------------------

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address VARCHAR(42) UNIQUE NOT NULL,         -- Wallet address (checksummed)
    chain_id INTEGER NOT NULL DEFAULT 8453,       -- Base mainnet
    username VARCHAR(50),                         -- Optional display name
    avatar_url TEXT,                              -- Profile picture URL
    tos_accepted_version VARCHAR(20),             -- ToS version accepted
    tos_accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_accounts_address ON accounts(address);
CREATE INDEX idx_accounts_created ON accounts(created_at);

-- -----------------------------------------------------------------------------
-- SESSIONS (for audit/tracking, actual session in iron-session cookie)
-- -----------------------------------------------------------------------------

CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    ip_hash VARCHAR(64),                          -- Hashed IP for privacy
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_sessions_account ON sessions(account_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- -----------------------------------------------------------------------------
-- ANALYTICS - Page Visits
-- -----------------------------------------------------------------------------

CREATE TABLE page_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anonymous_id VARCHAR(36) NOT NULL,            -- From localStorage
    account_id UUID REFERENCES accounts(id),      -- If signed in
    path VARCHAR(500) NOT NULL,
    referrer VARCHAR(500),
    query_params JSONB,
    user_agent TEXT,
    screen_width INTEGER,
    screen_height INTEGER,
    session_id VARCHAR(36),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_page_visits_path ON page_visits(path);
CREATE INDEX idx_page_visits_account ON page_visits(account_id);
CREATE INDEX idx_page_visits_date ON page_visits(created_at);

-- -----------------------------------------------------------------------------
-- ANALYTICS - Events
-- -----------------------------------------------------------------------------

CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    anonymous_id VARCHAR(36) NOT NULL,
    account_id UUID REFERENCES accounts(id),
    properties JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_account ON analytics_events(account_id);
CREATE INDEX idx_analytics_date ON analytics_events(created_at);

-- -----------------------------------------------------------------------------
-- API AUDIT LOG
-- -----------------------------------------------------------------------------

CREATE TABLE api_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint VARCHAR(200) NOT NULL,
    method VARCHAR(10) NOT NULL,
    account_id UUID REFERENCES accounts(id),
    anonymous_id VARCHAR(36),
    response_status INTEGER NOT NULL,
    response_time_ms INTEGER,
    ip_hash VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_audit_endpoint ON api_audit_log(endpoint);
CREATE INDEX idx_api_audit_account ON api_audit_log(account_id);
CREATE INDEX idx_api_audit_date ON api_audit_log(created_at);

-- -----------------------------------------------------------------------------
-- Row Level Security (RLS)
-- -----------------------------------------------------------------------------

-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_audit_log ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access on accounts" ON accounts
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on sessions" ON sessions
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on page_visits" ON page_visits
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on analytics_events" ON analytics_events
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on api_audit_log" ON api_audit_log
    FOR ALL USING (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- Functions
-- -----------------------------------------------------------------------------

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for accounts
CREATE TRIGGER accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
