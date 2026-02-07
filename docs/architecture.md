# Architecture

This document explains how the Base Mini App template is structured, how requests flow through the system, and the reasoning behind the key architectural decisions. Use it as a map when navigating the codebase or planning new features.

## High-Level Architecture

```
+------------------------------------------------------------------+
|  Browser (Client)                                                |
|                                                                  |
|  +------------------+   +------------------+   +---------------+ |
|  | React Components |   | Hooks            |   | Wagmi/Viem    | |
|  | (app/, components)|  | (useAuth, etc.)  |   | (wallet ops)  | |
|  +--------+---------+   +--------+---------+   +-------+-------+ |
|           |                      |                      |        |
+-----------+----------------------+----------------------+--------+
            |                      |                      |
            v                      v                      v
+------------------------------------------------------------------+
|  Next.js API Routes  (app/api/**/route.ts)                       |
|                                                                  |
|  +------------------------------------------------------------+  |
|  |  apiMiddleware (lib/middleware.ts)                          |  |
|  |  - Rate limiting (per IP + path)                           |  |
|  |  - Auth verification (iron-session)                        |  |
|  |  - Admin role check                                        |  |
|  +------------------------------------------------------------+  |
|           |                                                      |
|           v                                                      |
|  +------------------------------------------------------------+  |
|  |  Business Logic                                            |  |
|  |  - lib/auth.ts         (SIWE, sessions)                    |  |
|  |  - lib/admin.ts        (role management)                   |  |
|  |  - lib/nft/            (strategy pattern for NFT ops)      |  |
|  |  - lib/db.ts           (user CRUD, Supabase clients)       |  |
|  |  - lib/nft-db.ts       (collections, tokens, mints CRUD)   |  |
|  +------------------------------------------------------------+  |
|           |                                                      |
|           v                                                      |
|  +----------------------------+  +-----------------------------+ |
|  |  Supabase (PostgreSQL)     |  |  Blockchain Providers       | |
|  |  - accounts, sessions      |  |  - OnchainKit               | |
|  |  - analytics, audit        |  |  - Zora Protocol SDK        | |
|  |  - NFT tables              |  |  - Zora Coins SDK           | |
|  +----------------------------+  +-----------------------------+ |
+------------------------------------------------------------------+
```

## Request Flow

A typical authenticated request follows this path:

1. **Client** -- A React component calls a hook or fetches an API route.
2. **Hook** -- The hook (for example `useAuth`) makes a `fetch()` call to a Next.js API route.
3. **API Route** -- The route handler in `app/api/**/route.ts` calls `apiMiddleware()` with options.
4. **Middleware** -- `apiMiddleware` runs up to three checks in order:
   - **Rate limiting** -- compares the caller's IP + path against an in-memory counter.
   - **Auth** -- reads the iron-session cookie and checks `isLoggedIn`.
   - **Admin** -- looks up the caller's `role` in the `accounts` table.
5. **Business logic** -- If all middleware passes, the route handler calls functions in `lib/` (database operations, NFT provider calls, etc.).
6. **Database / Provider** -- The business logic reads from or writes to Supabase, or delegates to a blockchain provider.

```
Client  -->  fetch('/api/nft/mint')
               |
               v
         apiMiddleware({ requireAuth: true, rateLimit: true })
               |
               +-- requireRateLimit()  --> 429 if exceeded
               +-- requireAuth()       --> 401 if not logged in
               |
               v
         buildMintTransaction()  (lib/nft/index.ts)
               |
               v
         getProvider('zora_protocol')  (lib/nft/registry.ts)
               |
               v
         ZoraProtocolProvider.buildMintTransaction()
               |
               v
         Response with transaction data
```

## NFT Strategy Pattern

The template supports multiple NFT providers through a **strategy pattern**. Each provider implements the same `INFTProvider` interface, so the rest of the application never needs to know which provider is in use.

### Provider Interface

Every provider must implement `INFTProvider` (defined in `lib/nft/types.ts`):

```typescript
interface INFTProvider {
  readonly providerType: NFTProvider;
  getTokenMetadata(contractAddress, tokenId?): Promise<NFTMetadata>;
  buildMintTransaction(params): Promise<MintTransactionData>;
  buildCreateCollectionTransaction?(params): Promise<MintTransactionData>;
  validateConfig(config): boolean;
}
```

### Available Providers

| Provider | Type String | SDK | Use Case |
|----------|-------------|-----|----------|
| OnchainKit | `onchainkit` | `@coinbase/onchainkit` | Simple NFT minting via Coinbase |
| Zora Protocol | `zora_protocol` | `@zoralabs/protocol-sdk` | ERC-721/1155 minting with referral rewards |
| Zora Coins | `zora_coins` | `@zoralabs/coins-sdk` | ERC-20 coin creation and trading |

### Provider Resolution Flow

```
buildMintTransaction({ collectionId })
       |
       v
getCollectionById(collectionId)        <-- reads DB for provider type
       |
       v
getProvider(collection.provider)       <-- lazy singleton from registry
       |
       v
provider.buildMintTransaction(...)     <-- delegates to specific provider
       |
       v
MintTransactionData { calls, value }   <-- provider-agnostic output
```

The registry (`lib/nft/registry.ts`) uses lazy singleton initialization. Each provider is instantiated only once, on first access, and cached in a `Map`.

### Adding a New Provider

1. Create `lib/nft/providers/your-provider.ts` implementing `INFTProvider`.
2. Add the new type string to `NFTProvider` in `types/nft.ts`.
3. Register it in `lib/nft/registry.ts` by adding a case to the `initProvider` switch and including the type in `getAllProviderTypes()`.

## Directory Structure

```
base-app-template/
  app/                          # Next.js App Router pages and API routes
    layout.tsx                  # Root layout with AppProviders wrapper
    page.tsx                    # Home page
    admin/                      # Admin panel pages
    api/                        # API route handlers
      auth/                     # SIWE, session, logout endpoints
    join/                       # Onboarding page
    privacy/                    # Privacy policy
    profile/                    # User profile
    terms/                      # Terms of service
  components/                   # React components
    auth/                       # AuthGuard, SignInButton
    layout/                     # Header, Footer, MobileNav
    providers/                  # AppProviders (Wagmi, OnchainKit, Auth, Analytics)
    ui/                         # Shared UI primitives (LoadingSpinner, etc.)
  hooks/                        # React hooks
    useAuth.tsx                 # Authentication context and hook
    useAnalytics.tsx            # Analytics tracking
  lib/                          # Server and shared logic
    admin.ts                    # Role management, super admin init
    auth.ts                     # SIWE message generation, verification, sessions
    audit.ts                    # API request audit logging
    config.ts                   # Typed environment configuration
    db.ts                       # Supabase clients and user CRUD
    middleware.ts               # Rate limiting, auth, and admin middleware
    nft-db.ts                   # Collections, tokens, mints database operations
    nft/                        # NFT provider system
      index.ts                  # Public API (getTokenMetadata, buildMintTransaction)
      registry.ts               # Lazy singleton provider registry
      types.ts                  # INFTProvider interface and param types
      providers/                # Provider implementations
        onchainkit.ts
        zora-protocol.ts
        zora-coins.ts
  types/                        # Shared TypeScript type definitions
    admin.ts                    # UserRole, admin types
    api.ts                      # API response types
    auth.ts                     # Session, auth state, SIWE types
    nft.ts                      # NFTProvider, MintStatus, collection types
    user.ts                     # User-related types
  supabase/                     # Supabase project configuration
    config.toml                 # Local Supabase service ports and settings
    migrations/                 # SQL migration files
  public/                       # Static assets
```

## Key Architectural Decisions

### Server vs. Client Boundary

The template draws a clear boundary between server and client code:

**Server-only** (never shipped to the browser):
- All files in `lib/` that use `SUPABASE_SERVICE_ROLE_KEY` or `SESSION_SECRET`
- API routes in `app/api/`
- Database operations (`lib/db.ts`, `lib/nft-db.ts`)
- Auth verification and session management (`lib/auth.ts`)
- Admin role checks (`lib/admin.ts`)

**Client-only** (runs in the browser):
- Components marked with `'use client'`
- Hooks in `hooks/` (`useAuth`, `useAnalytics`)
- The `AppProviders` wrapper (Wagmi, OnchainKit, React Query)

**Shared** (used by both, but with different behavior):
- `lib/config.ts` -- `NEXT_PUBLIC_*` variables are inlined at build time for client use. Server-only variables (like `SESSION_SECRET`) are only available on the server. The `validateServerConfig()` function skips validation when called from the browser.

### Why iron-session Instead of Supabase Auth

The template uses [iron-session](https://github.com/vvo/iron-session) for session management instead of Supabase's built-in auth. This is because:

1. **SIWE is the primary auth method.** Users authenticate by signing an Ethereum message with their wallet, not with email/password. Supabase Auth does not natively support SIWE.
2. **Stateless encrypted cookies.** iron-session stores session data in an encrypted, tamper-proof cookie. There is no session store to manage on the server.
3. **Simplicity.** The session contains only `address`, `chainId`, and `isLoggedIn`. No OAuth token management needed.

The `sessions` table in the database exists for audit and tracking purposes only. The actual session state lives in the cookie.

### Why a Strategy Pattern for NFTs

The NFT ecosystem on Base includes multiple minting protocols with different contract interfaces. Rather than scattering provider-specific logic throughout the codebase, the strategy pattern:

1. **Isolates provider complexity** in individual provider files.
2. **Makes adding providers trivial** -- implement the interface, register it, done.
3. **Keeps business logic clean** -- API routes and database operations work with `MintTransactionData` regardless of the underlying provider.
4. **Supports per-collection provider selection** -- each collection stores its provider type and config in the database, so you can use OnchainKit for one collection and Zora Protocol for another.

### Middleware Composition

The `apiMiddleware` function in `lib/middleware.ts` composes rate limiting, auth, and admin checks into a single call. This avoids duplicating boilerplate across API routes:

```typescript
// In an API route handler:
const middlewareResult = await apiMiddleware(request, {
  requireAuth: true,
  rateLimit: true,
});
if (middlewareResult) return middlewareResult; // 401, 403, or 429

// Continue with business logic...
```

Rate limiting is enabled by default (you must explicitly set `rateLimit: false` to disable it). Auth and admin checks are opt-in.

## Next Steps

- [Configuration](./configuration.md) -- full reference for all environment variables and config groups.
- [Database](./database.md) -- schema details and migration patterns.
- [Authentication](./authentication.md) -- the SIWE flow explained step by step.
