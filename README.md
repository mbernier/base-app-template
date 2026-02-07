# Base App Template

A production-ready Next.js 14 template for building Base Mini Apps with wallet authentication, an NFT abstraction layer, and a full admin system.

Built and maintained by [Bernier LLC](https://mbernier.com).

## Overview

Base App Template provides everything you need to build onchain applications on [Base](https://base.org). Instead of wiring up wallet connections, authentication, database schemas, and NFT integrations from scratch, fork this template and start building your app's unique features immediately.

### What's included

- **Wallet Authentication** - SIWE (Sign-In With Ethereum) with iron-session, OnchainKit wallet integration, and Smart Wallet support for gasless transactions
- **Farcaster Mini-App Support** - Dual-mode: standalone web + embedded Farcaster/Base mini-app via OnchainKit MiniKit
- **Farcaster Auto-Auth** - Automatic authentication when running inside a Farcaster client
- **NFT Abstraction Layer** - Strategy-pattern provider system supporting OnchainKit, Zora Protocol SDK, and Zora Coins SDK behind a single unified API
- **Admin System** - Role-based access control (user/admin/superadmin) with a dashboard for managing collections, viewing mint analytics, and configuring settings
- **Database** - Supabase PostgreSQL with Row Level Security, migrations, and typed client utilities
- **UI Kit** - Accessible component library (WCAG 2.1 AA) with 44px touch targets, built on Tailwind CSS
- **ERC-20 Utilities** - Token balance display, transfer, and approval helpers

## Quick Start

```bash
# 1. Use this template on GitHub, then clone your new repo
git clone git@github.com:<your-org>/<your-app>.git
cd <your-app>

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env.local
# Edit .env.local with your values (see docs/configuration.md)

# 4. Start local database
npx supabase start
npx supabase db push

# 5. Start dev server
npm run dev
```

Open [http://localhost:3100](http://localhost:3100) in your browser.

For detailed setup instructions, see [Getting Started](docs/getting-started.md).

## Documentation

| Guide | Description |
|-------|-------------|
| [Getting Started](docs/getting-started.md) | Installation, environment setup, first run |
| [Architecture](docs/architecture.md) | System design, request flow, directory structure |
| [Authentication](docs/authentication.md) | SIWE flow, sessions, auth guards, protected routes |
| [NFT Abstraction](docs/nft-abstraction.md) | Provider system, mint flow, adding new providers |
| [Admin System](docs/admin-system.md) | Roles, dashboard, collection management, settings |
| [API Reference](docs/api-reference.md) | Every endpoint with request/response examples |
| [UI Kit](docs/ui-kit.md) | Component catalog, props, accessibility, design system |
| [Database](docs/database.md) | Schema, migrations, RLS, query patterns |
| [Configuration](docs/configuration.md) | All environment variables and config options |
| [Testing](docs/testing.md) | Testing philosophy, patterns, running tests |

### For your app's users

Foundational user-facing documentation you can customize for your app:

| Template | Description |
|----------|-------------|
| [User Docs Overview](docs/user-docs/README.md) | How to use and customize user-facing docs |
| [Help Page](docs/user-docs/help.md) | Getting started guide for end users |
| [FAQ](docs/user-docs/faq.md) | Common questions and answers |
| [Terms Template](docs/user-docs/terms-template.md) | Terms of service starting point |

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | [Next.js 14](https://nextjs.org) (App Router) |
| Language | [TypeScript](https://www.typescriptlang.org) (strict mode) |
| Styling | [Tailwind CSS](https://tailwindcss.com) |
| Database | [Supabase](https://supabase.com) (PostgreSQL) |
| Auth | [SIWE](https://login.xyz) + [iron-session](https://github.com/vvo/iron-session) |
| Wallet | [OnchainKit](https://onchainkit.xyz) + [wagmi](https://wagmi.sh) + [viem](https://viem.sh) |
| NFT | [Zora Protocol SDK](https://docs.zora.co/protocol-sdk) + [Zora Coins SDK](https://docs.zora.co/coins) |
| Mini-App | [OnchainKit MiniKit](https://onchainkit.xyz) + [@farcaster/miniapp-sdk](https://miniapps.farcaster.xyz) |

## Using as a Template

This is a [GitHub Template Repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-template-repository). Click **"Use this template"** on GitHub to create your own repo from it.

After creating your app:

```bash
# Add the template as an upstream remote (for pulling future updates)
git remote add upstream git@github.com:mbernier/base-app-template.git

# Later, pull template improvements into your app
git fetch upstream
git merge upstream/main
```

See [TEMPLATE.md](TEMPLATE.md) for the full guide on customizing, pulling updates, and contributing back.

## Farcaster Mini App

This template includes built-in support for running as a Farcaster Mini App via OnchainKit MiniKit. When running inside a Farcaster client (Warpcast) or Coinbase Wallet, it automatically:

- Hides the app chrome (header, footer, navigation) since the host provides its own
- Auto-authenticates using the Farcaster user context (no wallet signature needed)
- Applies safe area insets from the host client
- Signals readiness to dismiss the splash screen

### Setup

1. Set `NEXT_PUBLIC_FARCASTER_ENABLED=true` in `.env.local`
2. Generate an account association signature using [Farcaster tools](https://miniapps.farcaster.xyz)
3. Set the `FARCASTER_ACCOUNT_HEADER`, `FARCASTER_ACCOUNT_PAYLOAD`, and `FARCASTER_ACCOUNT_SIGNATURE` env vars
4. Set image URLs for `NEXT_PUBLIC_FARCASTER_ICON_URL`, `NEXT_PUBLIC_FARCASTER_IMAGE_URL`, and `NEXT_PUBLIC_FARCASTER_SPLASH_IMAGE_URL`
5. Deploy to production — the manifest is served dynamically at `/.well-known/farcaster.json`
6. Submit your app URL to Farcaster

### Webhook

Set `NEXT_PUBLIC_FARCASTER_WEBHOOK_URL` to your production webhook URL. The `/api/farcaster/webhook` endpoint handles lifecycle events (`miniapp_added`, `miniapp_removed`, `notifications_enabled`, `notifications_disabled`).

### Notifications

Use the utilities in `lib/farcaster-notifications.ts` to send push notifications:

```typescript
import { sendNotification, broadcastNotification } from '@/lib/farcaster-notifications';

// Send to a single user by FID
await sendNotification(12345, {
  notificationId: 'unique-id',
  title: 'Hello!',
  body: 'You have a new message',
  targetUrl: 'https://yourapp.com/messages',
});

// Broadcast to all opted-in users
await broadcastNotification({
  notificationId: 'broadcast-id',
  title: 'New feature!',
  body: 'Check out our latest update',
  targetUrl: 'https://yourapp.com/new',
});
```

## Development

```bash
npm run dev          # Start dev server (port 3100)
npm run build        # Production build
npm run type-check   # TypeScript validation
npm run lint         # ESLint
npm run format       # Prettier formatting
```

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines, code standards, and the documentation update requirement.

**Key rule**: Every code change must include corresponding documentation updates.

## License

[MIT](LICENSE) - Bernier LLC
