# Base App Template

A production-ready template for building Base Mini Apps with OnchainKit, SIWE authentication, and Supabase.

## Features

- **OnchainKit Integration** - Coinbase's official toolkit for building onchain apps
- **Farcaster Mini-App Support** - Dual-mode: standalone web + embedded Farcaster/Base mini-app
- **SIWE Authentication** - Sign-In With Ethereum for secure wallet-based auth
- **Farcaster Auto-Auth** - Automatic authentication when running inside a Farcaster client
- **Smart Wallet Support** - Gasless transactions with Coinbase Smart Wallet
- **Token Utilities** - ERC-20 token balance and transfer helpers
- **Supabase Database** - PostgreSQL with Row Level Security
- **Cookie-Free Analytics** - Privacy-respecting usage tracking
- **Mobile-First UI** - Responsive layout with bottom navigation
- **WCAG 2.1 AA** - Accessible components with proper ARIA labels
- **TypeScript** - Full type safety throughout

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local:
# - SESSION_SECRET (generate with: openssl rand -base64 32)
# - Optional: NEXT_PUBLIC_CDP_API_KEY for gasless transactions

# Start Supabase (optional, for database features)
npx supabase start

# Start development server
npm run dev
```

Open [http://localhost:3100](http://localhost:3100) in your browser.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SESSION_SECRET` | Yes | Secret for session encryption (32+ chars) |
| `NEXT_PUBLIC_CHAIN_ID` | No | 84532 (Base Sepolia) or 8453 (Base Mainnet) |
| `NEXT_PUBLIC_TOKEN_ADDRESS` | No | Your ERC-20 token contract address |
| `NEXT_PUBLIC_CDP_API_KEY` | No | For gasless transactions only |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Supabase service role key |
| `NEXT_PUBLIC_FARCASTER_ENABLED` | No | Enable Farcaster mini-app mode (`true`/`false`) |
| `FARCASTER_ACCOUNT_HEADER` | No | Account association header (for manifest) |
| `FARCASTER_ACCOUNT_PAYLOAD` | No | Account association payload (for manifest) |
| `FARCASTER_ACCOUNT_SIGNATURE` | No | Account association signature (for manifest) |
| `NEXT_PUBLIC_FARCASTER_ICON_URL` | No | Mini-app icon URL |
| `NEXT_PUBLIC_FARCASTER_IMAGE_URL` | No | Mini-app image URL |
| `NEXT_PUBLIC_FARCASTER_SPLASH_IMAGE_URL` | No | Splash screen image URL |
| `NEXT_PUBLIC_FARCASTER_SPLASH_BG_COLOR` | No | Splash screen background color |
| `NEXT_PUBLIC_FARCASTER_BUTTON_TITLE` | No | Launch button title |
| `NEXT_PUBLIC_FARCASTER_WEBHOOK_URL` | No | Webhook URL for lifecycle events |

## Project Structure

```
base-app-template/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # SIWE + Farcaster authentication
│   │   ├── farcaster/     # Farcaster webhook endpoint
│   │   ├── user/          # User management
│   │   └── analytics/     # Analytics tracking
│   ├── .well-known/       # Dynamic Farcaster manifest
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page (dual-mode)
│   ├── join/              # Sign-in page
│   ├── profile/           # User profile
│   ├── terms/             # Terms of Service
│   └── privacy/           # Privacy Policy
├── components/
│   ├── providers/         # React context providers
│   ├── layout/            # AppShell, Header, Footer, Navigation
│   ├── auth/              # Authentication components
│   ├── wallet/            # Wallet/transaction components
│   ├── ui/                # Reusable UI components
│   └── legal/             # ToS, disclaimers
├── hooks/                 # Custom React hooks (useAuth, useFarcaster)
├── lib/                   # Utility functions + Farcaster DB/notifications
├── types/                 # TypeScript definitions (auth, farcaster)
├── supabase/              # Database migrations
└── public/                # Static assets
```

## Development

```bash
# Run development server
npm run dev

# Type check
npm run type-check

# Lint
npm run lint

# Format code
npm run format

# Build for production
npm run build
```

## Database Setup

This template uses Supabase for the database. For local development:

```bash
# Start local Supabase
npx supabase start

# Apply migrations
npx supabase db push

# Open Supabase Studio
open http://127.0.0.1:54342
```

## Ports

| Service | Port |
|---------|------|
| Next.js Dev Server | 3100 |
| Supabase API | 54340 |
| Supabase DB | 54341 |
| Supabase Studio | 54342 |
| Supabase Mailpit | 54343 |

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect to Vercel
3. Set environment variables
4. Deploy

### Other Platforms

```bash
npm run build
npm start
```

## Customization

1. **Branding**: Update `NEXT_PUBLIC_APP_NAME` and colors in `tailwind.config.ts`
2. **Token**: Set `NEXT_PUBLIC_TOKEN_ADDRESS` for your ERC-20 token
3. **Features**: Add domain-specific pages in `app/`
4. **Database**: Extend schema in `supabase/migrations/`

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

## License

MIT
