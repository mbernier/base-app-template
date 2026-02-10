# Configuration

All application configuration is loaded from environment variables and organized into typed groups in `lib/config.ts`. This document covers every variable, how they are grouped, and how to add new configuration values.

## How Configuration Works

The file `lib/config.ts` exports named objects that group related settings. Each object reads from `process.env` and applies sensible defaults where possible.

```typescript
// Example: reading blockchain config
import { blockchain } from '@/lib/config';

console.log(blockchain.chainId); // 84532
console.log(blockchain.tokenSymbol); // "TOKEN"
```

Key behaviors:

- **`NEXT_PUBLIC_*` variables** are inlined by Next.js at build time. They are available on both server and client. They must be accessed directly (not through dynamic lookups) for the inlining to work.
- **Server-only variables** (like `SESSION_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`) are never exposed to the browser.
- **Hard failure in production.** The `validateServerConfig()` function throws an error if `SESSION_SECRET` is missing in production. In development, it logs a warning instead.
- **No dotenv in production.** Production environments must set environment variables at the system level. The `dotenv` package is not used.

## Complete Environment Variable Reference

### Blockchain (`blockchain`)

| Variable                      | Type          | Default | Client | Description                                                                 |
| ----------------------------- | ------------- | ------- | ------ | --------------------------------------------------------------------------- |
| `NEXT_PUBLIC_TOKEN_ADDRESS`   | `0x${string}` | --      | Yes    | Primary ERC-20 token contract address                                       |
| `NEXT_PUBLIC_TOKEN_SYMBOL`    | `string`      | `TOKEN` | Yes    | Display symbol                                                              |
| `NEXT_PUBLIC_TOKEN_DECIMALS`  | `number`      | `18`    | Yes    | Token decimal places                                                        |
| `NEXT_PUBLIC_CHAIN_ID`        | `number`      | `84532` | Yes    | Chain ID: `84532` (Base Sepolia) or `8453` (Base Mainnet)                   |
| `NEXT_PUBLIC_RPC_URL`         | `string`      | --      | Yes    | Custom RPC URL (Alchemy, Infura, etc.). Uses default public RPC if not set. |
| `NEXT_PUBLIC_TREASURY_WALLET` | `0x${string}` | --      | Yes    | Treasury or escrow wallet                                                   |

### OnchainKit (`onchainKit`)

| Variable                    | Type     | Default | Client | Description                                                  |
| --------------------------- | -------- | ------- | ------ | ------------------------------------------------------------ |
| `NEXT_PUBLIC_CDP_API_KEY`   | `string` | --      | Yes    | Coinbase Developer Platform API key for gasless transactions |
| `NEXT_PUBLIC_PAYMASTER_URL` | `string` | --      | Yes    | Paymaster URL for sponsored transactions                     |

### Application (`app`)

| Variable               | Type     | Default                 | Client | Description                                |
| ---------------------- | -------- | ----------------------- | ------ | ------------------------------------------ |
| `NEXT_PUBLIC_APP_URL`  | `string` | `http://localhost:3100` | Yes    | Public URL of the app                      |
| `NEXT_PUBLIC_APP_NAME` | `string` | `Base App`              | Yes    | App name in titles and wallet prompts      |
| `NODE_ENV`             | `string` | `development`           | No     | Environment: `development` or `production` |

The `app` object also exposes a computed property:

- `app.isProduction` -- `true` when `NODE_ENV === 'production'`

### Features (`features`)

| Variable                          | Type      | Default | Client | Description                        |
| --------------------------------- | --------- | ------- | ------ | ---------------------------------- |
| `NEXT_PUBLIC_SHOW_USER_AUDIT_LOG` | `boolean` | `false` | Yes    | Show audit log on the profile page |

### Database (`database`)

| Variable                        | Type     | Default | Client | Description                                               |
| ------------------------------- | -------- | ------- | ------ | --------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | `string` | `''`    | Yes    | Supabase API URL                                          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `string` | `''`    | Yes    | Supabase anonymous/public key                             |
| `SUPABASE_SERVICE_ROLE_KEY`     | `string` | `''`    | **No** | Supabase service role key (full access, server-side only) |

### Authentication (`auth`)

| Variable           | Type     | Default               | Client | Description                                                             |
| ------------------ | -------- | --------------------- | ------ | ----------------------------------------------------------------------- |
| `SESSION_SECRET`   | `string` | `''`                  | **No** | Secret for encrypting iron-session cookies. **Required in production.** |
| `SESSION_DURATION` | `number` | `86400`               | **No** | Session TTL in seconds (default: 24 hours)                              |
| `SIWE_DOMAIN`      | `string` | `localhost`           | **No** | Domain in SIWE messages. Set to your production domain.                 |
| `SIWE_STATEMENT`   | `string` | `Sign in to this app` | **No** | Human-readable statement shown during signing                           |

### NFT (`nft`)

| Variable                           | Type          | Default      | Client | Description                                                      |
| ---------------------------------- | ------------- | ------------ | ------ | ---------------------------------------------------------------- |
| `NEXT_PUBLIC_DEFAULT_NFT_PROVIDER` | `string`      | `onchainkit` | Yes    | Default provider: `onchainkit`, `zora_protocol`, or `zora_coins` |
| `ZORA_CREATE_REFERRAL_ADDRESS`     | `0x${string}` | --           | **No** | Zora referral address for collection creation rewards            |
| `ZORA_MINT_REFERRAL_ADDRESS`       | `0x${string}` | --           | **No** | Zora referral address for mint rewards                           |
| `ZORA_PLATFORM_REFERRER_ADDRESS`   | `0x${string}` | --           | **No** | Platform referrer for Zora Coins                                 |

### Admin (`admin`)

| Variable                      | Type     | Default | Client | Description                                               |
| ----------------------------- | -------- | ------- | ------ | --------------------------------------------------------- |
| `INITIAL_SUPER_ADMIN_ADDRESS` | `string` | --      | **No** | Wallet address auto-promoted to superadmin on first login |

### Rate Limiting (`rateLimit`)

| Variable                   | Type     | Default | Client | Description                                                                                                                                         |
| -------------------------- | -------- | ------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RATE_LIMIT_WINDOW_MS`     | `number` | `60000` | **No** | Time window in milliseconds                                                                                                                         |
| `RATE_LIMIT_MAX_REQUESTS`  | `number` | `100`   | **No** | Maximum requests per IP+path per window                                                                                                             |
| `REDIS_URL`                | `string` | `''`    | **No** | Standard Redis connection URL (TCP). When set, enables distributed rate limiting via ioredis. Used with Railway, Redis Cloud, or self-hosted Redis. |
| `UPSTASH_REDIS_REST_URL`   | `string` | `''`    | **No** | Upstash Redis REST endpoint URL. Used with `UPSTASH_REDIS_REST_TOKEN` for HTTP-based distributed rate limiting (ideal for Vercel/serverless).       |
| `UPSTASH_REDIS_REST_TOKEN` | `string` | `''`    | **No** | Upstash Redis REST auth token. Required when `UPSTASH_REDIS_REST_URL` is set.                                                                       |

### Farcaster Mini-App (`farcaster`)

| Variable                                 | Type      | Default       | Client | Description                                          |
| ---------------------------------------- | --------- | ------------- | ------ | ---------------------------------------------------- |
| `NEXT_PUBLIC_FARCASTER_ENABLED`          | `boolean` | `false`       | Yes    | Enable Farcaster mini-app mode                       |
| `FARCASTER_SIWF_DOMAIN`                  | `string`  | `SIWE_DOMAIN` | **No** | Domain for SIWF message verification                 |
| `FARCASTER_ACCOUNT_HEADER`               | `string`  | `''`          | **No** | Account association header (proves domain ownership) |
| `FARCASTER_ACCOUNT_PAYLOAD`              | `string`  | `''`          | **No** | Account association payload                          |
| `FARCASTER_ACCOUNT_SIGNATURE`            | `string`  | `''`          | **No** | Account association signature                        |
| `NEXT_PUBLIC_FARCASTER_ICON_URL`         | `string`  | `''`          | Yes    | Mini-app icon URL                                    |
| `NEXT_PUBLIC_FARCASTER_IMAGE_URL`        | `string`  | `''`          | Yes    | Mini-app image URL                                   |
| `NEXT_PUBLIC_FARCASTER_SPLASH_IMAGE_URL` | `string`  | `''`          | Yes    | Splash screen image URL                              |
| `NEXT_PUBLIC_FARCASTER_SPLASH_BG_COLOR`  | `string`  | `#ffffff`     | Yes    | Splash screen background color                       |
| `NEXT_PUBLIC_FARCASTER_BUTTON_TITLE`     | `string`  | `Launch`      | Yes    | Button title in Farcaster embed                      |

**Testnet note:** Farcaster requires Base mainnet for onchain transactions. When `NEXT_PUBLIC_FARCASTER_ENABLED=true` and `NEXT_PUBLIC_CHAIN_ID=84532`, identity features (FID, SIWF) will work but wallet transactions will fail. See [Testnet Development](./testnet-development.md) for details.

## Development vs. Production

| Behavior                 | Development                          | Production                                                              |
| ------------------------ | ------------------------------------ | ----------------------------------------------------------------------- |
| `SESSION_SECRET` missing | Warning logged, fallback secret used | **Hard failure** -- app refuses to start                                |
| Supabase config missing  | Warning logged                       | Warning logged (will fail on first DB call)                             |
| Cookie `secure` flag     | `false` (works over HTTP)            | `true` (requires HTTPS)                                                 |
| Rate limiting            | In-memory Map (default)              | Redis or Upstash (auto-detected from env vars); falls back to in-memory |
| Environment variables    | Loaded from `.env.local` by Next.js  | Must be set at the system/platform level                                |

### Production Checklist

Before deploying to production, verify:

- [ ] `SESSION_SECRET` is set to a strong random value (`openssl rand -base64 32`)
- [ ] `SIWE_DOMAIN` matches your production domain (e.g., `myapp.com`)
- [ ] `NEXT_PUBLIC_APP_URL` points to your production URL (e.g., `https://myapp.com`)
- [ ] `NEXT_PUBLIC_CHAIN_ID` is `8453` (Base Mainnet) if targeting mainnet
- [ ] `NEXT_PUBLIC_SUPABASE_URL` and keys point to your hosted Supabase project
- [ ] `INITIAL_SUPER_ADMIN_ADDRESS` is set to a wallet you control
- [ ] If Farcaster is enabled, `NEXT_PUBLIC_CHAIN_ID` is `8453` (Farcaster requires Base mainnet for transactions)
- [ ] `NEXT_PUBLIC_RPC_URL` is set to a reliable RPC provider (Alchemy, Infura, etc.) for production traffic
- [ ] For multi-instance deployments, set `REDIS_URL` or `UPSTASH_REDIS_REST_URL`+`UPSTASH_REDIS_REST_TOKEN` for distributed rate limiting
- [ ] No `.env` files are present on the production server

## Server-Side Validation

The `validateServerConfig()` function runs on server startup (skipped in the browser). It checks:

1. `SESSION_SECRET` is set and is not the placeholder value. Throws in production, warns in development.
2. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present. Warns if missing.

You can call it explicitly in a server-side entry point, or it runs when imported modules first execute on the server.

## Adding New Config Values

Follow this pattern to keep configuration consistent:

1. **Add the variable to `.env.example`** with a comment and sensible default.

2. **Add it to the appropriate group in `lib/config.ts`:**

```typescript
// In the relevant config group:
export const myGroup = {
  existingValue: process.env.MY_EXISTING_VALUE || 'default',
  newValue: process.env.MY_NEW_VALUE || 'default', // Add here
};
```

3. **Use `NEXT_PUBLIC_` prefix** if the value is needed in the browser. Otherwise, keep it server-only.

4. **Parse non-string types explicitly:**

```typescript
myNumber: parseInt(process.env.MY_NUMBER || '42'),
myBoolean: process.env.MY_FEATURE_FLAG === 'true',
myAddress: process.env.MY_ADDRESS as `0x${string}` | undefined,
```

5. **Add validation** in `validateServerConfig()` if the value is required in production.

## Next Steps

- [Architecture](./architecture.md) -- see how config flows into the provider tree and middleware.
- [Authentication](./authentication.md) -- the auth config values in action.
- [Database](./database.md) -- how `database` config connects to Supabase.
- [Testnet Development](./testnet-development.md) -- chain switching, Farcaster limitations, and development workflow.
