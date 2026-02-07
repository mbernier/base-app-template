-- =============================================================================
-- ADMIN & NFT SCHEMA
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ACCOUNTS - Add role column
-- -----------------------------------------------------------------------------

ALTER TABLE accounts ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user';
CREATE INDEX idx_accounts_role ON accounts(role);

-- -----------------------------------------------------------------------------
-- APP SETTINGS (admin-configurable key-value store)
-- -----------------------------------------------------------------------------

CREATE TABLE app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES accounts(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_app_settings_key ON app_settings(key);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on app_settings" ON app_settings
    FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER app_settings_updated_at
    BEFORE UPDATE ON app_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- NFT COLLECTIONS (one per deployed contract/coin)
-- -----------------------------------------------------------------------------

CREATE TABLE nft_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    provider VARCHAR(20) NOT NULL,              -- 'onchainkit' | 'zora_protocol' | 'zora_coins'
    contract_address VARCHAR(42),
    chain_id INTEGER NOT NULL DEFAULT 8453,
    token_standard VARCHAR(10),                 -- 'erc721' | 'erc1155' | 'erc20'
    is_active BOOLEAN NOT NULL DEFAULT true,
    provider_config JSONB NOT NULL DEFAULT '{}',
    image_url TEXT,
    external_url TEXT,
    created_by UUID REFERENCES accounts(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_nft_collections_provider ON nft_collections(provider);
CREATE INDEX idx_nft_collections_active ON nft_collections(is_active);
CREATE INDEX idx_nft_collections_contract ON nft_collections(contract_address);

ALTER TABLE nft_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on nft_collections" ON nft_collections
    FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER nft_collections_updated_at
    BEFORE UPDATE ON nft_collections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- NFT TOKENS (individual token types within a collection)
-- -----------------------------------------------------------------------------

CREATE TABLE nft_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES nft_collections(id) ON DELETE CASCADE,
    token_id VARCHAR(100),                      -- On-chain token ID (null for coins)
    name VARCHAR(200),
    description TEXT,
    image_url TEXT,
    metadata_uri TEXT,
    metadata JSONB,
    max_supply BIGINT,
    total_minted BIGINT DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_nft_tokens_collection ON nft_tokens(collection_id);
CREATE INDEX idx_nft_tokens_active ON nft_tokens(is_active);

ALTER TABLE nft_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on nft_tokens" ON nft_tokens
    FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER nft_tokens_updated_at
    BEFORE UPDATE ON nft_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- NFT MINT EVENTS (every mint tracked with provider info)
-- -----------------------------------------------------------------------------

CREATE TABLE nft_mints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES nft_collections(id),
    token_id UUID REFERENCES nft_tokens(id),
    account_id UUID REFERENCES accounts(id),
    minter_address VARCHAR(42) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    tx_hash VARCHAR(66),
    provider VARCHAR(20) NOT NULL,
    provider_metadata JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_nft_mints_collection ON nft_mints(collection_id);
CREATE INDEX idx_nft_mints_token ON nft_mints(token_id);
CREATE INDEX idx_nft_mints_account ON nft_mints(account_id);
CREATE INDEX idx_nft_mints_minter ON nft_mints(minter_address);
CREATE INDEX idx_nft_mints_status ON nft_mints(status);
CREATE INDEX idx_nft_mints_created ON nft_mints(created_at);

ALTER TABLE nft_mints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on nft_mints" ON nft_mints
    FOR ALL USING (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- SEED DATA - Default app settings
-- -----------------------------------------------------------------------------

INSERT INTO app_settings (key, value, description) VALUES
    ('default_nft_provider', '"onchainkit"', 'Default NFT provider for new collections'),
    ('nft_minting_enabled', 'true', 'Global toggle for NFT minting');
