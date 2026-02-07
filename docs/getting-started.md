# Getting Started

This guide walks you through forking the Base Mini App template, setting up your local environment, and running the app for the first time. By the end, you will have a fully functional development environment with wallet authentication, a local database, and a running Next.js server.

## Prerequisites

Before you begin, install the following tools:

| Tool | Version | Purpose |
|------|---------|---------|
| [Node.js](https://nodejs.org/) | 18+ | JavaScript runtime |
| [npm](https://www.npmjs.com/) | 9+ | Package manager (ships with Node.js) |
| [Supabase CLI](https://supabase.com/docs/guides/cli) | Latest | Local database and auth services |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Latest | Required by Supabase CLI for local services |
| [Git](https://git-scm.com/) | Latest | Version control |

Verify your installations:

```bash
node --version    # v18.x or higher
npm --version     # 9.x or higher
supabase --version
docker --version
```

## Fork and Clone the Template

This project is a GitHub template repository. You can create your own repo from it directly on GitHub or clone it manually.

**Option A: Use the GitHub template button**

1. Go to the repository on GitHub.
2. Click **Use this template** > **Create a new repository**.
3. Clone your newly created repository.

**Option B: Clone directly**

```bash
git clone git@github.com:mbernier/base-app-template.git my-app
cd my-app
```

If you cloned directly, remove the existing remote and set up your own:

```bash
git remote rename origin upstream
git remote add origin git@github.com:YOUR_ORG/YOUR_REPO.git
```

This keeps `upstream` pointing at the template so you can pull updates later (see [Pulling Template Updates](#pulling-template-updates) below).

## Install Dependencies

```bash
npm install
```

This installs all production and development dependencies including Next.js 14, OnchainKit, Supabase client, wagmi, viem, iron-session, and the Zora SDKs.

## Environment Setup

Copy the example environment file:

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the required values. Here is a breakdown of every variable:

### Blockchain

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_TOKEN_ADDRESS` | No | -- | Your app's primary ERC-20 token contract address on Base |
| `NEXT_PUBLIC_TOKEN_SYMBOL` | No | `TOKEN` | Display symbol for your token |
| `NEXT_PUBLIC_TOKEN_DECIMALS` | No | `18` | Token decimal places |
| `NEXT_PUBLIC_CHAIN_ID` | No | `84532` | `84532` for Base Sepolia (testnet), `8453` for Base Mainnet |
| `NEXT_PUBLIC_TREASURY_WALLET` | No | -- | Treasury or escrow wallet address |

### Coinbase / OnchainKit (Optional)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_CDP_API_KEY` | No | -- | Coinbase Developer Platform API key. Enables gasless transactions and premium features. Get one at [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com). The app works without it -- users just pay their own gas. |
| `NEXT_PUBLIC_PAYMASTER_URL` | No | -- | Paymaster URL for sponsored/gasless transactions |

### Application

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3100` | Public URL of your app |
| `NEXT_PUBLIC_APP_NAME` | No | `Base App` | App name shown in wallet prompts and page titles |
| `NODE_ENV` | No | `development` | `development` or `production` |

### Database (Supabase)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | `http://127.0.0.1:54340` | Supabase API URL. Use the local default for development. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | -- | Supabase anonymous key. Printed when you run `supabase start`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | -- | Supabase service role key (server-side only). Also printed by `supabase start`. |

### Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SESSION_SECRET` | **Yes** | -- | Secret for encrypting session cookies. Generate one: `openssl rand -base64 32` |
| `SESSION_DURATION` | No | `86400` | Session lifetime in seconds (default: 24 hours) |
| `SIWE_DOMAIN` | No | `localhost` | Domain used in Sign-In With Ethereum messages |
| `SIWE_STATEMENT` | No | `Sign in to this app` | Human-readable statement shown during wallet signing |

### Rate Limiting

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Rate limit time window in milliseconds |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Maximum requests per window per IP+path |

### Feature Flags

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_SHOW_USER_AUDIT_LOG` | No | `false` | Show the user audit log on the profile page |

### NFT Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_DEFAULT_NFT_PROVIDER` | No | `onchainkit` | Default NFT provider: `onchainkit`, `zora_protocol`, or `zora_coins` |
| `ZORA_CREATE_REFERRAL_ADDRESS` | No | -- | Earn Zora protocol rewards on collection creation |
| `ZORA_MINT_REFERRAL_ADDRESS` | No | -- | Earn Zora protocol rewards on mints |
| `ZORA_PLATFORM_REFERRER_ADDRESS` | No | -- | Platform referrer address for Zora Coins |

### Admin

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `INITIAL_SUPER_ADMIN_ADDRESS` | No | -- | Wallet address that gets superadmin role on first login |

## Start Supabase Locally

Make sure Docker Desktop is running, then start the local Supabase stack:

```bash
supabase start
```

This starts PostgreSQL, the Supabase API, Studio, and other services. On first run it also applies all migrations in `supabase/migrations/`.

After startup, the CLI prints the local credentials:

```
API URL: http://127.0.0.1:54340
anon key: eyJ...
service_role key: eyJ...
Studio URL: http://127.0.0.1:54342
```

Copy the `anon key` and `service_role key` values into your `.env.local` file for `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.

## Run the Dev Server

```bash
npm run dev
```

The app starts on [http://localhost:3100](http://localhost:3100).

## Verify Everything Works

You should see the following when everything is set up correctly:

1. **Browser**: Open [http://localhost:3100](http://localhost:3100). The app loads with a header, footer (desktop), and mobile navigation.
2. **Wallet connection**: Click the wallet/connect button in the header. A Coinbase Smart Wallet modal or other wallet prompt appears.
3. **Supabase Studio**: Open [http://127.0.0.1:54342](http://127.0.0.1:54342) to browse your local database tables. You should see `accounts`, `sessions`, `page_visits`, `analytics_events`, `api_audit_log`, `app_settings`, `nft_collections`, `nft_tokens`, and `nft_mints`.
4. **No console errors**: The browser console should be clean. If you see Supabase connection warnings, double-check your anon key and URL in `.env.local`.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server on port 3100 |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build on port 3100 |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run the TypeScript compiler without emitting files |
| `npm run format` | Format all files with Prettier |
| `npm run format:check` | Check formatting without writing changes |

## Pulling Template Updates

If you set up the `upstream` remote (see the clone step above), you can pull improvements from the template:

```bash
git fetch upstream
git merge upstream/main --allow-unrelated-histories
```

Resolve any merge conflicts, test, and commit. This lets you benefit from template updates while keeping your own customizations.

## Next Steps

- [Architecture](./architecture.md) -- understand how the codebase is organized.
- [Configuration](./configuration.md) -- deep dive into every config group.
- [Database](./database.md) -- explore the schema and learn how to add tables.
- [Authentication](./authentication.md) -- learn the SIWE sign-in flow end to end.
- [Testing](./testing.md) -- understand the testing philosophy and write your first test.
