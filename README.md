# Base App Template

A production-ready template for building Base Mini Apps with OnchainKit, SIWE authentication, and Supabase.

## Features

- **OnchainKit Integration** - Coinbase's official toolkit for building onchain apps
- **SIWE Authentication** - Sign-In With Ethereum for secure wallet-based auth
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

## Project Structure

```
base-app-template/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # SIWE authentication
│   │   ├── user/          # User management
│   │   └── analytics/     # Analytics tracking
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── join/              # Sign-in page
│   ├── profile/           # User profile
│   ├── terms/             # Terms of Service
│   └── privacy/           # Privacy Policy
├── components/
│   ├── providers/         # React context providers
│   ├── layout/            # Header, Footer, Navigation
│   ├── auth/              # Authentication components
│   ├── wallet/            # Wallet/transaction components
│   ├── ui/                # Reusable UI components
│   └── legal/             # ToS, disclaimers
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions
├── types/                 # TypeScript definitions
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

To use as a Farcaster Mini App:

1. Generate account association signature
2. Update `public/.well-known/farcaster.json`
3. Deploy to production
4. Submit to Farcaster

## License

MIT
