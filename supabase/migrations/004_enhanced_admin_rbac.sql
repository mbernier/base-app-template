-- =============================================================================
-- ENHANCED ADMIN RBAC - Permissions & Audit Trail
-- Additive to template migrations 001-003
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ADMIN PERMISSIONS (granular permission grants)
-- -----------------------------------------------------------------------------

CREATE TABLE admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    permission VARCHAR(50) NOT NULL,
    granted_by UUID NOT NULL REFERENCES accounts(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    signature TEXT,
    UNIQUE(account_id, permission)
);

CREATE INDEX idx_admin_permissions_account ON admin_permissions(account_id);
CREATE INDEX idx_admin_permissions_permission ON admin_permissions(permission);

ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on admin_permissions" ON admin_permissions
    FOR ALL USING (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- ADMIN AUDIT LOG (enhanced with before/after values)
-- -----------------------------------------------------------------------------

CREATE TABLE admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id TEXT,
    previous_value JSONB,
    new_value JSONB,
    metadata JSONB DEFAULT '{}',
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    ip_hash VARCHAR(64),
    request_id VARCHAR(36),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_log_account ON admin_audit_log(account_id);
CREATE INDEX idx_admin_audit_log_action ON admin_audit_log(action);
CREATE INDEX idx_admin_audit_log_resource ON admin_audit_log(resource_type, resource_id);
CREATE INDEX idx_admin_audit_log_created ON admin_audit_log(created_at DESC);
CREATE INDEX idx_admin_audit_log_success ON admin_audit_log(success);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on admin_audit_log" ON admin_audit_log
    FOR ALL USING (auth.role() = 'service_role');
