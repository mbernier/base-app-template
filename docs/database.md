# Database

The template uses Supabase (PostgreSQL) for all persistent storage. This document covers the full schema, how to interact with the database from application code, and how to add new tables through migrations.

## Schema Overview

The schema is split across four migration files:

- `001_base_schema.sql` -- Core tables (accounts, sessions, analytics, audit log)
- `002_admin_and_nft_schema.sql` -- Admin settings, NFT collections, tokens, and mints
- `003_farcaster_schema.sql` -- Farcaster user linking and notification preferences
- `004_enhanced_admin_rbac.sql` -- Granular admin permissions and admin audit logging

### accounts

Stores every wallet that has signed in. One row per unique wallet address.

| Column                 | Type          | Default             | Nullable | Description                         |
| ---------------------- | ------------- | ------------------- | -------- | ----------------------------------- |
| `id`                   | `uuid`        | `gen_random_uuid()` | No       | Primary key                         |
| `address`              | `varchar(42)` | --                  | No       | Wallet address (unique, lowercased) |
| `chain_id`             | `integer`     | `8453`              | No       | Chain the user connected from       |
| `role`                 | `varchar(20)` | `'user'`            | No       | `user`, `admin`, or `superadmin`    |
| `username`             | `varchar(50)` | --                  | Yes      | Optional display name               |
| `avatar_url`           | `text`        | --                  | Yes      | Profile picture URL                 |
| `tos_accepted_version` | `varchar(20)` | --                  | Yes      | Version of ToS the user accepted    |
| `tos_accepted_at`      | `timestamptz` | --                  | Yes      | When the user accepted ToS          |
| `created_at`           | `timestamptz` | `NOW()`             | No       | Account creation time               |
| `updated_at`           | `timestamptz` | `NOW()`             | No       | Auto-updated via trigger            |
| `last_seen_at`         | `timestamptz` | `NOW()`             | No       | Updated on each login               |

Indexes: `address`, `created_at`, `role`

### sessions

Audit trail of login sessions. The actual session state lives in an iron-session cookie -- this table is for tracking and analytics only.

| Column       | Type          | Default             | Nullable | Description                          |
| ------------ | ------------- | ------------------- | -------- | ------------------------------------ |
| `id`         | `uuid`        | `gen_random_uuid()` | No       | Primary key                          |
| `account_id` | `uuid`        | --                  | No       | FK to `accounts.id` (cascade delete) |
| `ip_hash`    | `varchar(64)` | --                  | Yes      | Hashed IP for privacy                |
| `user_agent` | `text`        | --                  | Yes      | Browser user agent                   |
| `created_at` | `timestamptz` | `NOW()`             | No       | Session start                        |
| `expires_at` | `timestamptz` | --                  | No       | Planned session expiry               |

### page_visits

Tracks page views for analytics. Can be linked to an account or remain anonymous.

| Column          | Type           | Default             | Nullable | Description                      |
| --------------- | -------------- | ------------------- | -------- | -------------------------------- |
| `id`            | `uuid`         | `gen_random_uuid()` | No       | Primary key                      |
| `anonymous_id`  | `varchar(36)`  | --                  | No       | Client-side anonymous identifier |
| `account_id`    | `uuid`         | --                  | Yes      | FK to `accounts.id`              |
| `path`          | `varchar(500)` | --                  | No       | Page path visited                |
| `referrer`      | `varchar(500)` | --                  | Yes      | HTTP referrer                    |
| `query_params`  | `jsonb`        | --                  | Yes      | URL query parameters             |
| `user_agent`    | `text`         | --                  | Yes      | Browser user agent               |
| `screen_width`  | `integer`      | --                  | Yes      | Viewport width                   |
| `screen_height` | `integer`      | --                  | Yes      | Viewport height                  |
| `session_id`    | `varchar(36)`  | --                  | Yes      | Client session identifier        |
| `created_at`    | `timestamptz`  | `NOW()`             | No       | Visit timestamp                  |

### analytics_events

Custom analytics events (button clicks, feature usage, etc.).

| Column         | Type           | Default             | Nullable | Description                 |
| -------------- | -------------- | ------------------- | -------- | --------------------------- |
| `id`           | `uuid`         | `gen_random_uuid()` | No       | Primary key                 |
| `event_type`   | `varchar(100)` | --                  | No       | Event name                  |
| `anonymous_id` | `varchar(36)`  | --                  | No       | Client anonymous identifier |
| `account_id`   | `uuid`         | --                  | Yes      | FK to `accounts.id`         |
| `properties`   | `jsonb`        | --                  | Yes      | Event metadata              |
| `created_at`   | `timestamptz`  | `NOW()`             | No       | Event timestamp             |

### api_audit_log

Records every API request for security auditing.

| Column             | Type           | Default             | Nullable | Description                   |
| ------------------ | -------------- | ------------------- | -------- | ----------------------------- |
| `id`               | `uuid`         | `gen_random_uuid()` | No       | Primary key                   |
| `endpoint`         | `varchar(200)` | --                  | No       | API path                      |
| `method`           | `varchar(10)`  | --                  | No       | HTTP method                   |
| `account_id`       | `uuid`         | --                  | Yes      | FK to `accounts.id`           |
| `anonymous_id`     | `varchar(36)`  | --                  | Yes      | Anonymous caller identifier   |
| `response_status`  | `integer`      | --                  | No       | HTTP status code returned     |
| `response_time_ms` | `integer`      | --                  | Yes      | Response time in milliseconds |
| `ip_hash`          | `varchar(64)`  | --                  | Yes      | Hashed IP                     |
| `created_at`       | `timestamptz`  | `NOW()`             | No       | Request timestamp             |

### app_settings

Key-value store for admin-configurable settings. Seeded with default NFT settings.

| Column        | Type           | Default             | Nullable | Description                |
| ------------- | -------------- | ------------------- | -------- | -------------------------- |
| `id`          | `uuid`         | `gen_random_uuid()` | No       | Primary key                |
| `key`         | `varchar(100)` | --                  | No       | Setting key (unique)       |
| `value`       | `jsonb`        | --                  | No       | Setting value              |
| `description` | `text`         | --                  | Yes      | Human-readable description |
| `updated_by`  | `uuid`         | --                  | Yes      | FK to `accounts.id`        |
| `created_at`  | `timestamptz`  | `NOW()`             | No       | Creation time              |
| `updated_at`  | `timestamptz`  | `NOW()`             | No       | Auto-updated via trigger   |

Default seed data:

| Key                    | Value          | Description                          |
| ---------------------- | -------------- | ------------------------------------ |
| `default_nft_provider` | `"onchainkit"` | Default provider for new collections |
| `nft_minting_enabled`  | `true`         | Global minting toggle                |

### nft_collections

Each row represents a deployed contract or coin. Stores which provider to use and provider-specific configuration.

| Column             | Type           | Default             | Nullable | Description                                    |
| ------------------ | -------------- | ------------------- | -------- | ---------------------------------------------- |
| `id`               | `uuid`         | `gen_random_uuid()` | No       | Primary key                                    |
| `name`             | `varchar(200)` | --                  | No       | Collection display name                        |
| `description`      | `text`         | --                  | Yes      | Collection description                         |
| `provider`         | `varchar(20)`  | --                  | No       | `onchainkit`, `zora_protocol`, or `zora_coins` |
| `contract_address` | `varchar(42)`  | --                  | Yes      | On-chain contract address                      |
| `chain_id`         | `integer`      | `8453`              | No       | Chain ID                                       |
| `token_standard`   | `varchar(10)`  | --                  | Yes      | `erc721`, `erc1155`, or `erc20`                |
| `is_active`        | `boolean`      | `true`              | No       | Whether minting is enabled                     |
| `provider_config`  | `jsonb`        | `'{}'`              | No       | Provider-specific configuration                |
| `image_url`        | `text`         | --                  | Yes      | Collection image                               |
| `external_url`     | `text`         | --                  | Yes      | External link                                  |
| `created_by`       | `uuid`         | --                  | Yes      | FK to `accounts.id`                            |
| `created_at`       | `timestamptz`  | `NOW()`             | No       | Creation time                                  |
| `updated_at`       | `timestamptz`  | `NOW()`             | No       | Auto-updated via trigger                       |

### nft_tokens

Individual token types within a collection (e.g., token ID 1, token ID 2 of an ERC-1155).

| Column          | Type           | Default             | Nullable | Description                                 |
| --------------- | -------------- | ------------------- | -------- | ------------------------------------------- |
| `id`            | `uuid`         | `gen_random_uuid()` | No       | Primary key                                 |
| `collection_id` | `uuid`         | --                  | No       | FK to `nft_collections.id` (cascade delete) |
| `token_id`      | `varchar(100)` | --                  | Yes      | On-chain token ID (null for coins)          |
| `name`          | `varchar(200)` | --                  | Yes      | Token name                                  |
| `description`   | `text`         | --                  | Yes      | Token description                           |
| `image_url`     | `text`         | --                  | Yes      | Token image                                 |
| `metadata_uri`  | `text`         | --                  | Yes      | On-chain metadata URI                       |
| `metadata`      | `jsonb`        | --                  | Yes      | Cached metadata                             |
| `max_supply`    | `bigint`       | --                  | Yes      | Maximum supply (null = unlimited)           |
| `total_minted`  | `bigint`       | `0`                 | No       | Running mint count                          |
| `is_active`     | `boolean`      | `true`              | No       | Whether this token is mintable              |
| `created_at`    | `timestamptz`  | `NOW()`             | No       | Creation time                               |
| `updated_at`    | `timestamptz`  | `NOW()`             | No       | Auto-updated via trigger                    |

### nft_mints

Every mint event, including pending and failed attempts.

| Column              | Type          | Default             | Nullable | Description                               |
| ------------------- | ------------- | ------------------- | -------- | ----------------------------------------- |
| `id`                | `uuid`        | `gen_random_uuid()` | No       | Primary key                               |
| `collection_id`     | `uuid`        | --                  | No       | FK to `nft_collections.id`                |
| `token_id`          | `uuid`        | --                  | Yes      | FK to `nft_tokens.id`                     |
| `account_id`        | `uuid`        | --                  | Yes      | FK to `accounts.id`                       |
| `minter_address`    | `varchar(42)` | --                  | No       | Wallet that minted                        |
| `quantity`          | `integer`     | `1`                 | No       | Number of tokens minted                   |
| `tx_hash`           | `varchar(66)` | --                  | Yes      | Transaction hash (set after confirmation) |
| `provider`          | `varchar(20)` | --                  | No       | Provider used for this mint               |
| `provider_metadata` | `jsonb`       | --                  | Yes      | Provider-specific data                    |
| `status`            | `varchar(20)` | `'pending'`         | No       | `pending`, `confirmed`, or `failed`       |
| `created_at`        | `timestamptz` | `NOW()`             | No       | Mint timestamp                            |

### farcaster_users

Links Farcaster FIDs to accounts and stores notification preferences.

| Column                  | Type           | Default             | Nullable | Description                                         |
| ----------------------- | -------------- | ------------------- | -------- | --------------------------------------------------- |
| `id`                    | `uuid`         | `gen_random_uuid()` | No       | Primary key                                         |
| `account_id`            | `uuid`         | --                  | No       | FK to `accounts.id` (cascade delete)                |
| `fid`                   | `bigint`       | --                  | No       | Farcaster user ID (unique)                          |
| `username`              | `varchar(50)`  | --                  | Yes      | Farcaster username                                  |
| `display_name`          | `varchar(100)` | --                  | Yes      | Farcaster display name                              |
| `pfp_url`               | `text`         | --                  | Yes      | Profile picture URL                                 |
| `notification_url`      | `text`         | --                  | Yes      | Webhook URL for push notifications                  |
| `notification_token`    | `text`         | --                  | Yes      | Token for authenticating notification delivery      |
| `notifications_enabled` | `boolean`      | `false`             | No       | Whether user has opted in to notifications          |
| `added_at`              | `timestamptz`  | `NOW()`             | Yes      | When the user added the mini-app                    |
| `removed_at`            | `timestamptz`  | --                  | Yes      | When the user removed the mini-app (null if active) |
| `created_at`            | `timestamptz`  | `NOW()`             | No       | Row creation time                                   |
| `updated_at`            | `timestamptz`  | `NOW()`             | No       | Auto-updated via trigger                            |

Indexes: `account_id`, `fid`, partial index on `notifications_enabled` where enabled and not removed

### admin_permissions

Granular permission grants for admin accounts. Superadmins implicitly have all permissions.

| Column       | Type          | Default             | Nullable | Description                                 |
| ------------ | ------------- | ------------------- | -------- | ------------------------------------------- |
| `id`         | `uuid`        | `gen_random_uuid()` | No       | Primary key                                 |
| `account_id` | `uuid`        | --                  | No       | FK to `accounts.id` (cascade delete)        |
| `permission` | `varchar(50)` | --                  | No       | Permission key (e.g., `manage_collections`) |
| `granted_by` | `uuid`        | --                  | No       | FK to `accounts.id` -- who granted this     |
| `granted_at` | `timestamptz` | `NOW()`             | Yes      | When the permission was granted             |
| `signature`  | `text`        | --                  | Yes      | Optional cryptographic signature for audit  |

Unique constraint: `(account_id, permission)` -- one grant per permission per account.

Indexes: `account_id`, `permission`

### admin_audit_log

Tracks admin actions with before/after value snapshots for compliance and debugging.

| Column           | Type           | Default             | Nullable | Description                                                       |
| ---------------- | -------------- | ------------------- | -------- | ----------------------------------------------------------------- |
| `id`             | `uuid`         | `gen_random_uuid()` | No       | Primary key                                                       |
| `account_id`     | `uuid`         | --                  | No       | FK to `accounts.id` -- who performed the action                   |
| `action`         | `varchar(100)` | --                  | No       | Action type (e.g., `role.update`, `collection.create`)            |
| `resource_type`  | `varchar(50)`  | --                  | No       | Resource category (`user`, `permission`, `setting`, `collection`) |
| `resource_id`    | `text`         | --                  | Yes      | ID of the affected resource                                       |
| `previous_value` | `jsonb`        | --                  | Yes      | State before the action                                           |
| `new_value`      | `jsonb`        | --                  | Yes      | State after the action                                            |
| `metadata`       | `jsonb`        | `'{}'`              | Yes      | Additional context                                                |
| `success`        | `boolean`      | `true`              | No       | Whether the action succeeded                                      |
| `error_message`  | `text`         | --                  | Yes      | Error details if action failed                                    |
| `ip_hash`        | `varchar(64)`  | --                  | Yes      | Hashed IP address                                                 |
| `request_id`     | `varchar(36)`  | --                  | Yes      | Request correlation ID                                            |
| `created_at`     | `timestamptz`  | `NOW()`             | No       | When the action occurred                                          |

Indexes: `account_id`, `action`, compound `(resource_type, resource_id)`, `created_at DESC`, `success`

## Entity Relationships

```
accounts
  |-- 1:N --> sessions          (account_id)
  |-- 1:N --> page_visits       (account_id, optional)
  |-- 1:N --> analytics_events  (account_id, optional)
  |-- 1:N --> api_audit_log     (account_id, optional)
  |-- 1:N --> app_settings      (updated_by, optional)
  |-- 1:N --> nft_collections   (created_by, optional)
  |-- 1:N --> nft_mints         (account_id, optional)
  |-- 1:N --> farcaster_users    (account_id, cascade delete)
  |-- 1:N --> admin_permissions  (account_id, cascade delete)
  |-- 1:N --> admin_audit_log    (account_id)

nft_collections
  |-- 1:N --> nft_tokens        (collection_id, cascade delete)
  |-- 1:N --> nft_mints         (collection_id)

nft_tokens
  |-- 1:N --> nft_mints         (token_id, optional)

farcaster_users
  (no child relations)

admin_permissions
  (no child relations)

admin_audit_log
  (no child relations)
```

## Row Level Security (RLS)

Every table has RLS enabled. The current policy is straightforward:

- **Service role** has full read/write access on all tables.
- **Anonymous/public role** has no access to any table.

This means all database operations go through the service role key on the server. The anon key is used only for Supabase client initialization on the browser side (where it has no table access).

If you need client-side direct queries in the future, you would add RLS policies that reference `auth.uid()` or custom JWT claims. For now, all data flows through API routes that use the service role.

## Database Clients

The template provides three Supabase client factories in `lib/db.ts`:

| Function                      | Key Used         | Typed            | Use Case                                                               |
| ----------------------------- | ---------------- | ---------------- | ---------------------------------------------------------------------- |
| `createBrowserClient()`       | Anon key         | Yes (`Database`) | Client-side queries (currently unused -- reserved for future RLS)      |
| `createServerClient()`        | Service role key | Yes (`Database`) | Server-side operations with full type safety                           |
| `createUntypedServerClient()` | Service role key | No               | Server-side operations with simpler API (used throughout the codebase) |

### Row / Insert / Update Type Pattern

The `Database` interface in `lib/db.ts` defines three type variants for every table:

```typescript
// Full row as returned by a SELECT
type AccountRow = Database['public']['Tables']['accounts']['Row'];

// Fields for INSERT (id and timestamps optional)
type AccountInsert = Database['public']['Tables']['accounts']['Insert'];

// Fields for UPDATE (everything optional)
type AccountUpdate = Database['public']['Tables']['accounts']['Update'];
```

This pattern is used in `lib/nft-db.ts` for type-safe CRUD:

```typescript
type CollectionRow = Database['public']['Tables']['nft_collections']['Row'];

export async function createCollection(
  input: Database['public']['Tables']['nft_collections']['Insert']
): Promise<CollectionRow> {
  const supabase = createUntypedServerClient();
  const { data, error } = await supabase.from('nft_collections').insert(input).select().single();
  // ...
}
```

## Database Operation Patterns

All database operations follow these conventions:

### Basic CRUD (from lib/nft-db.ts)

**Query with optional filters:**

```typescript
export async function getCollections(options?: {
  activeOnly?: boolean;
  provider?: NFTProvider;
}): Promise<CollectionRow[]> {
  const supabase = createUntypedServerClient();
  let query = supabase
    .from('nft_collections')
    .select('*')
    .order('created_at', { ascending: false });

  if (options?.activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to get collections: ${error.message}`);
  }
  return (data ?? []) as CollectionRow[];
}
```

**Single row lookup with not-found handling:**

```typescript
export async function getCollectionById(id: string): Promise<CollectionRow | null> {
  const supabase = createUntypedServerClient();
  const { data, error } = await supabase.from('nft_collections').select('*').eq('id', id).single();

  // PGRST116 = "no rows returned" -- not an error, just means not found
  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get collection: ${error.message}`);
  }
  return (data as CollectionRow) ?? null;
}
```

**Upsert with conflict resolution:**

```typescript
const { data, error } = await supabase
  .from('accounts')
  .upsert(
    { address: input.address.toLowerCase(), chain_id: input.chainId },
    { onConflict: 'address' }
  )
  .select()
  .single();
```

### Error Handling Convention

All database functions throw descriptive errors on failure. The API route handlers catch these and return appropriate HTTP responses. The `PGRST116` error code (no rows found) is treated as a non-error for lookup operations.

## Adding New Tables

### Migration Naming

Migration files must be numbered sequentially. The existing migrations are:

- `001_base_schema.sql`
- `002_admin_and_nft_schema.sql`
- `003_farcaster_schema.sql`
- `004_enhanced_admin_rbac.sql`

Name your migration `005_your_feature.sql` (or the next available number).

### Migration Template

```sql
-- =============================================================================
-- YOUR FEATURE NAME
-- =============================================================================

CREATE TABLE your_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- your columns here
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_your_table_some_column ON your_table(some_column);

-- Enable RLS
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Service role access
CREATE POLICY "Service role full access on your_table" ON your_table
    FOR ALL USING (auth.role() = 'service_role');

-- Auto-update updated_at (reuses the function from 001)
CREATE TRIGGER your_table_updated_at
    BEFORE UPDATE ON your_table
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

### Applying Migrations

**Local development:**

```bash
# Reset and reapply all migrations
supabase db reset

# Or apply only new migrations
supabase db push
```

**After adding a migration:**

1. Add the SQL file in `supabase/migrations/`.
2. Add corresponding TypeScript types to the `Database` interface in `lib/db.ts`.
3. Create a data access module (e.g., `lib/your-feature-db.ts`) following the patterns in `lib/nft-db.ts`.
4. Run `supabase db reset` to apply locally.

## Supabase Local Development

| Command             | Description                                                 |
| ------------------- | ----------------------------------------------------------- |
| `supabase start`    | Start all local Supabase services (PostgreSQL, API, Studio) |
| `supabase stop`     | Stop all services                                           |
| `supabase db reset` | Drop and recreate the database, reapply all migrations      |
| `supabase db push`  | Apply pending migrations to the local database              |
| `supabase db diff`  | Generate a migration from manual Studio changes             |
| `supabase status`   | Show local service URLs and keys                            |

**Supabase Studio** is available at [http://127.0.0.1:54342](http://127.0.0.1:54342) when services are running. Use it to browse data, run SQL, and inspect table schemas.

### Local Service Ports

These are configured in `supabase/config.toml`:

| Service                  | Port  |
| ------------------------ | ----- |
| API                      | 54340 |
| Database (PostgreSQL)    | 54341 |
| Studio                   | 54342 |
| Inbucket (email testing) | 54343 |
| Analytics                | 54347 |

## Next Steps

- [Architecture](./architecture.md) -- see how database clients fit into the overall system.
- [Authentication](./authentication.md) -- understand how user accounts are created during SIWE login.
- [Configuration](./configuration.md) -- database-related environment variables.
