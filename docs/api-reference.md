# API Reference

This document covers every API route in the application, organized by domain. All routes are Next.js App Router route handlers under `app/api/`.

---

## Quick Reference

### Auth Endpoints

| Method | Path | Auth | Admin | Description |
|---|---|---|---|---|
| `GET` | `/api/auth/siwe` | No | No | Generate a SIWE message for signing |
| `POST` | `/api/auth/siwe` | No | No | Verify signature and create session |
| `GET` | `/api/auth/session` | No | No | Check current session status |

### User Endpoints

| Method | Path | Auth | Admin | Description |
|---|---|---|---|---|
| `GET` | `/api/user` | Yes | No | Get current user profile |
| `PATCH` | `/api/user` | Yes | No | Update current user profile |

### Admin Endpoints

| Method | Path | Auth | Admin | Description |
|---|---|---|---|---|
| `GET` | `/api/admin/role` | Yes | No | Get current user's role |
| `GET` | `/api/admin/users` | Yes | Yes | List all users |
| `PATCH` | `/api/admin/users` | Yes | Yes (superadmin) | Update a user's role |
| `GET` | `/api/admin/collections` | Yes | Yes | List all collections (including inactive) |
| `POST` | `/api/admin/collections` | Yes | Yes | Create a new collection |
| `GET` | `/api/admin/collections/{id}` | Yes | Yes | Get collection details with tokens |
| `PATCH` | `/api/admin/collections/{id}` | Yes | Yes | Update a collection |
| `DELETE` | `/api/admin/collections/{id}` | Yes | Yes | Delete a collection |
| `GET` | `/api/admin/settings` | Yes | Yes | List all app settings |
| `PATCH` | `/api/admin/settings` | Yes | Yes | Update a setting |
| `GET` | `/api/admin/mints` | Yes | Yes | Get mint stats and recent activity |

### NFT Endpoints

| Method | Path | Auth | Admin | Description |
|---|---|---|---|---|
| `GET` | `/api/nft/collections` | No | No | List active collections (public) |
| `GET` | `/api/nft/collections/{id}` | No | No | Get active collection with tokens (public) |
| `GET` | `/api/nft/metadata` | No | No | Get token metadata |
| `POST` | `/api/nft/mint/prepare` | Yes | No | Build mint transaction data |
| `POST` | `/api/nft/mint/record` | Yes | No | Create or update a mint record |
| `GET` | `/api/nft/owned` | Yes | No | Get current user's mint history |

---

## Middleware Chain

Every API route can use `apiMiddleware` to apply a standard chain of checks before the handler runs.

```
Request
  --> Rate Limit Check (429 if exceeded)
  --> Auth Check (401 if not logged in, when requireAuth or requireAdmin is set)
  --> Admin Check (403 if not admin, when requireAdmin is set)
  --> Handler
```

Rate limiting is **on by default** for all routes unless explicitly disabled with `{ rateLimit: false }`. It uses an in-memory counter keyed by `{ip}:{path}` with configurable window and max requests (env vars `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS`, defaults to 100 requests per 60 seconds).

---

## Error Response Format

All errors follow a consistent shape:

```json
{
  "error": "Human-readable error message"
}
```

Common HTTP status codes:

| Status | Meaning |
|---|---|
| `400` | Bad request -- missing or invalid parameters |
| `401` | Authentication required -- no valid session |
| `403` | Forbidden -- insufficient role (e.g., not admin, not superadmin) |
| `404` | Resource not found |
| `429` | Too many requests -- rate limit exceeded |
| `500` | Internal server error |

---

## Auth Endpoints

### GET /api/auth/siwe

Generate a Sign-In With Ethereum (SIWE) message for the user to sign.

**Auth required:** No

**Query parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `address` | `string` | Yes | Ethereum address (checksummed or lowercase) |
| `chainId` | `number` | No | Chain ID (defaults to `84532`) |

**Response (200):**

```json
{
  "message": "localhost wants you to sign in with your Ethereum account:\n0x...",
  "nonce": "abc123..."
}
```

**Error (400):**

```json
{
  "error": "Address required"
}
```

The nonce is stored in the session for later verification.

---

### POST /api/auth/siwe

Verify a signed SIWE message and create an authenticated session.

**Auth required:** No

**Request body:**

```json
{
  "message": "The SIWE message string",
  "signature": "0x..."
}
```

**Response (200):**

```json
{
  "success": true,
  "user": {
    "address": "0x...",
    "username": "alice",
    "createdAt": "2025-01-15T00:00:00.000Z"
  }
}
```

**Side effects:**
- Creates or updates the user in the `accounts` table via `upsertUser`
- Calls `initializeSuperAdmin` to promote the configured address if it matches
- Sets session cookies (`address`, `chainId`, `isLoggedIn`)

---

### GET /api/auth/session

Check whether the current user has an active session.

**Auth required:** No

**Response (200 -- logged in):**

```json
{
  "isLoggedIn": true,
  "address": "0x...",
  "chainId": 8453,
  "tosAcceptedVersion": "1.0",
  "user": {
    "address": "0x...",
    "username": "alice",
    "avatarUrl": "https://...",
    "createdAt": "2025-01-15T00:00:00.000Z"
  }
}
```

**Response (200 -- not logged in):**

```json
{
  "isLoggedIn": false
}
```

This endpoint always returns `200`. It never returns an error status for unauthenticated users.

---

## User Endpoints

### GET /api/user

Get the currently authenticated user's profile.

**Auth required:** Yes

**Response (200):**

```json
{
  "user": {
    "id": "uuid",
    "address": "0x...",
    "username": "alice",
    "avatarUrl": "https://...",
    "tosAcceptedVersion": "1.0",
    "tosAcceptedAt": "2025-01-15T00:00:00.000Z",
    "createdAt": "2025-01-15T00:00:00.000Z"
  }
}
```

---

### PATCH /api/user

Update the currently authenticated user's profile.

**Auth required:** Yes

**Request body:**

```json
{
  "username": "new_username",
  "avatarUrl": "https://new-avatar.png"
}
```

All fields are optional. `username` must be a string of 50 characters or fewer, or `null` to clear.

**Response (200):**

```json
{
  "user": {
    "id": "uuid",
    "address": "0x...",
    "username": "new_username",
    "avatarUrl": "https://new-avatar.png"
  }
}
```

---

## Admin Endpoints

### GET /api/admin/role

Get the current user's role and admin status.

**Auth required:** Yes
**Admin required:** No (any authenticated user can check their own role)

**Response (200):**

```json
{
  "role": "admin",
  "isAdmin": true,
  "isSuperAdmin": false
}
```

---

### GET /api/admin/users

List all user accounts. Available to any admin, but role changes require superadmin.

**Auth required:** Yes
**Admin required:** Yes

**Response (200):**

```json
{
  "users": [
    {
      "id": "uuid",
      "address": "0x...",
      "username": "alice",
      "avatarUrl": "https://...",
      "role": "admin",
      "createdAt": "2025-01-15T00:00:00.000Z",
      "lastSeenAt": "2025-06-01T12:00:00.000Z"
    }
  ]
}
```

Users are ordered by `created_at` descending (newest first).

---

### PATCH /api/admin/users

Update a user's role. Superadmin only.

**Auth required:** Yes
**Admin required:** Yes (superadmin specifically -- returns `403` for regular admins)

**Request body:**

```json
{
  "address": "0xTargetUserAddress",
  "role": "admin"
}
```

Valid roles: `user`, `admin`, `superadmin`.

**Response (200):**

```json
{
  "success": true,
  "address": "0x...",
  "role": "admin"
}
```

---

### GET /api/admin/collections

List all collections (including inactive ones).

**Auth required:** Yes
**Admin required:** Yes

**Response (200):**

```json
{
  "collections": [
    {
      "id": "uuid",
      "name": "My Collection",
      "description": "A cool collection",
      "provider": "zora_protocol",
      "contractAddress": "0x...",
      "chainId": 8453,
      "tokenStandard": "erc1155",
      "isActive": true,
      "providerConfig": { "mintReferral": "0x..." },
      "imageUrl": "https://...",
      "externalUrl": "https://...",
      "createdBy": "uuid",
      "createdAt": "2025-01-15T00:00:00.000Z",
      "updatedAt": "2025-01-15T00:00:00.000Z"
    }
  ]
}
```

---

### POST /api/admin/collections

Create a new collection.

**Auth required:** Yes
**Admin required:** Yes

**Request body:**

```json
{
  "name": "New Collection",
  "description": "Optional description",
  "provider": "onchainkit",
  "contractAddress": "0x...",
  "chainId": 8453,
  "tokenStandard": "erc721",
  "providerConfig": {},
  "imageUrl": "https://...",
  "externalUrl": "https://..."
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | `string` | Yes | |
| `provider` | `string` | Yes | `onchainkit`, `zora_protocol`, or `zora_coins` |
| `description` | `string` | No | |
| `contractAddress` | `string` | No | |
| `chainId` | `number` | No | Defaults to `8453` |
| `tokenStandard` | `string` | No | `erc721`, `erc1155`, or `erc20` |
| `providerConfig` | `object` | No | Defaults to `{}` |
| `imageUrl` | `string` | No | |
| `externalUrl` | `string` | No | |

**Response (201):**

```json
{
  "collection": {
    "id": "uuid",
    "name": "New Collection",
    "isActive": true,
    "..."
  }
}
```

---

### GET /api/admin/collections/{id}

Get a single collection with its tokens. Returns all tokens (including inactive).

**Auth required:** Yes
**Admin required:** Yes

**Response (200):**

```json
{
  "collection": {
    "id": "uuid",
    "name": "My Collection",
    "..."
  },
  "tokens": [
    {
      "id": "uuid",
      "collectionId": "uuid",
      "tokenId": "1",
      "name": "Token #1",
      "description": "...",
      "imageUrl": "https://...",
      "metadataUri": "ipfs://...",
      "metadata": {},
      "maxSupply": 100,
      "totalMinted": 42,
      "isActive": true,
      "createdAt": "2025-01-15T00:00:00.000Z",
      "updatedAt": "2025-01-15T00:00:00.000Z"
    }
  ]
}
```

---

### PATCH /api/admin/collections/{id}

Update a collection. All fields are optional -- only provided fields are updated.

**Auth required:** Yes
**Admin required:** Yes

**Request body:**

```json
{
  "name": "Updated Name",
  "isActive": false,
  "providerConfig": { "mintReferral": "0xNewAddress" }
}
```

Any field from the create body can be included. Additionally:

| Field | Type | Description |
|---|---|---|
| `isActive` | `boolean` | Enable or disable the collection |

**Response (200):**

```json
{
  "collection": { "..." }
}
```

---

### DELETE /api/admin/collections/{id}

Delete a collection permanently.

**Auth required:** Yes
**Admin required:** Yes

**Response (200):**

```json
{
  "success": true
}
```

Returns `404` if the collection does not exist.

---

### GET /api/admin/settings

List all application settings.

**Auth required:** Yes
**Admin required:** Yes

**Response (200):**

```json
{
  "settings": [
    {
      "id": "uuid",
      "key": "maintenance_mode",
      "value": false,
      "description": "When true, the app shows a maintenance page",
      "updatedBy": "uuid",
      "createdAt": "2025-01-15T00:00:00.000Z",
      "updatedAt": "2025-01-15T00:00:00.000Z"
    }
  ]
}
```

---

### PATCH /api/admin/settings

Update a setting's value.

**Auth required:** Yes
**Admin required:** Yes

**Request body:**

```json
{
  "key": "maintenance_mode",
  "value": true
}
```

The `value` field accepts any JSON-serializable value (string, number, boolean, object, array).

**Response (200):**

```json
{
  "setting": {
    "id": "uuid",
    "key": "maintenance_mode",
    "value": true,
    "description": "When true, the app shows a maintenance page",
    "updatedBy": "uuid",
    "createdAt": "2025-01-15T00:00:00.000Z",
    "updatedAt": "2025-01-15T00:00:00.000Z"
  }
}
```

---

### GET /api/admin/mints

Get aggregated mint statistics and recent mint activity.

**Auth required:** Yes
**Admin required:** Yes

**Response (200):**

```json
{
  "stats": {
    "totalMints": 150,
    "totalQuantity": 312,
    "uniqueMinters": 87
  },
  "recentMints": [
    {
      "id": "uuid",
      "collectionId": "uuid",
      "tokenId": "1",
      "accountId": "uuid",
      "minterAddress": "0x...",
      "quantity": 2,
      "txHash": "0x...",
      "provider": "zora_protocol",
      "providerMetadata": {},
      "status": "confirmed",
      "createdAt": "2025-06-01T12:00:00.000Z"
    }
  ]
}
```

---

## NFT Endpoints

### GET /api/nft/collections

List all active, public collections. No authentication required.

**Auth required:** No
**Rate limited:** Yes

**Response (200):**

```json
{
  "collections": [
    {
      "id": "uuid",
      "name": "Public Collection",
      "description": "...",
      "provider": "onchainkit",
      "contractAddress": "0x...",
      "chainId": 8453,
      "tokenStandard": "erc721",
      "imageUrl": "https://...",
      "externalUrl": "https://...",
      "createdAt": "2025-01-15T00:00:00.000Z"
    }
  ]
}
```

Note: This endpoint only returns active collections. It does not include `isActive`, `providerConfig`, `createdBy`, or `updatedAt` in the response (those are admin-only fields).

---

### GET /api/nft/collections/{id}

Get a single active collection with its active tokens. Returns `404` if the collection is inactive or does not exist.

**Auth required:** No
**Rate limited:** Yes

**Response (200):**

```json
{
  "collection": {
    "id": "uuid",
    "name": "Public Collection",
    "description": "...",
    "provider": "onchainkit",
    "contractAddress": "0x...",
    "chainId": 8453,
    "tokenStandard": "erc721",
    "imageUrl": "https://...",
    "externalUrl": "https://...",
    "createdAt": "2025-01-15T00:00:00.000Z"
  },
  "tokens": [
    {
      "id": "uuid",
      "collectionId": "uuid",
      "tokenId": "1",
      "name": "Token #1",
      "description": "...",
      "imageUrl": "https://...",
      "maxSupply": 100,
      "totalMinted": 42,
      "createdAt": "2025-01-15T00:00:00.000Z"
    }
  ]
}
```

Note: Only active tokens are returned. The response does not include admin-only fields like `metadataUri`, `metadata`, `isActive`, or `updatedAt`.

---

### GET /api/nft/metadata

Fetch normalized token metadata from a provider.

**Auth required:** No
**Rate limited:** Yes

**Query parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `contractAddress` | `string` | Yes | Contract address |
| `tokenId` | `string` | No | Token ID within the contract |
| `provider` | `string` | No | Provider to use. Defaults to `onchainkit` |

**Response (200):**

```json
{
  "metadata": {
    "name": "Token Name",
    "description": "Description text",
    "imageUrl": "https://...",
    "animationUrl": "https://...",
    "externalUrl": "https://...",
    "attributes": [
      { "traitType": "Color", "value": "Blue" }
    ]
  }
}
```

---

### POST /api/nft/mint/prepare

Build transaction data for minting. The server resolves the collection's provider, builds the contract calls, and returns them for the client to execute via wagmi.

**Auth required:** Yes
**Rate limited:** Yes

**Request body:**

```json
{
  "collectionId": "uuid",
  "tokenId": "1",
  "quantity": 2
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `collectionId` | `string` | Yes | Collection to mint from |
| `tokenId` | `string` | No | Specific token ID (for ERC-1155) |
| `quantity` | `number` | No | Number to mint (defaults to `1`) |

The minter address is read from the authenticated session, not the request body.

**Response (200):**

```json
{
  "calls": [
    {
      "address": "0xContractAddress",
      "abi": [ ... ],
      "functionName": "mint",
      "args": ["0xMinterAddress"],
      "value": "1000000000000000"
    }
  ],
  "value": "1000000000000000"
}
```

Note: `BigInt` values are serialized as strings for JSON transport. The client must convert `value` back to `BigInt` before passing to wagmi.

---

### POST /api/nft/mint/record

Create a new mint record or update an existing one.

**Auth required:** Yes
**Rate limited:** Yes

**Creating a new record:**

```json
{
  "collectionId": "uuid",
  "tokenId": "1",
  "quantity": 2,
  "status": "pending"
}
```

**Response (201):**

```json
{
  "mint": {
    "id": "uuid",
    "collectionId": "uuid",
    "tokenId": "1",
    "minterAddress": "0x...",
    "quantity": 2,
    "txHash": null,
    "provider": "zora_protocol",
    "status": "pending",
    "createdAt": "2025-06-01T12:00:00.000Z"
  }
}
```

**Updating an existing record:**

```json
{
  "mintId": "uuid",
  "status": "confirmed",
  "txHash": "0xTransactionHash"
}
```

**Response (200):**

```json
{
  "mint": {
    "id": "uuid",
    "..."
    "status": "confirmed",
    "txHash": "0xTransactionHash"
  }
}
```

Valid status values for updates: `pending`, `confirmed`, `failed`.

---

### GET /api/nft/owned

Get all mint records for the currently authenticated user.

**Auth required:** Yes
**Rate limited:** Yes

**Response (200):**

```json
{
  "mints": [
    {
      "id": "uuid",
      "collectionId": "uuid",
      "tokenId": "1",
      "minterAddress": "0x...",
      "quantity": 1,
      "txHash": "0x...",
      "provider": "zora_protocol",
      "providerMetadata": {},
      "status": "confirmed",
      "createdAt": "2025-06-01T12:00:00.000Z"
    }
  ]
}
```

Returns an empty array if the user has no mint records or if the user account is not found in the database.

---

## Rate Limiting Behavior

Rate limiting is applied per IP address per route path. The default configuration is:

| Setting | Default | Env Variable |
|---|---|---|
| Window | 60 seconds | `RATE_LIMIT_WINDOW_MS` |
| Max requests | 100 per window | `RATE_LIMIT_MAX_REQUESTS` |

When the limit is exceeded, the API returns:

```json
{
  "error": "Too many requests"
}
```

With HTTP status `429`.

The current implementation uses an in-memory `Map`. This means rate limits reset on server restart and are not shared across multiple server instances. For production deployments with multiple instances, replace the in-memory store with Redis or a similar distributed cache.

---

## Audit Logging

The auth endpoints (`/api/auth/siwe` and `/api/auth/session`) include audit logging via `logApiRequest` from `lib/audit.ts`. Each request is logged with:

- Endpoint path
- HTTP method
- Account ID (if known)
- Response status code
- Response time in milliseconds

Other endpoints do not currently include audit logging but follow the same error handling patterns.
