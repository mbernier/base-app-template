-- =============================================================================
-- FARCASTER MINI-APP SCHEMA
-- =============================================================================

-- -----------------------------------------------------------------------------
-- FARCASTER USERS (links Farcaster FIDs to accounts)
-- -----------------------------------------------------------------------------

CREATE TABLE farcaster_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    fid BIGINT UNIQUE NOT NULL,
    username VARCHAR(50),
    display_name VARCHAR(100),
    pfp_url TEXT,
    notification_url TEXT,
    notification_token TEXT,
    notifications_enabled BOOLEAN NOT NULL DEFAULT false,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    removed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_farcaster_users_account ON farcaster_users(account_id);
CREATE INDEX idx_farcaster_users_fid ON farcaster_users(fid);
CREATE INDEX idx_farcaster_users_notifications ON farcaster_users(notifications_enabled)
    WHERE notifications_enabled = true AND removed_at IS NULL;

ALTER TABLE farcaster_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on farcaster_users" ON farcaster_users
    FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER farcaster_users_updated_at
    BEFORE UPDATE ON farcaster_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
