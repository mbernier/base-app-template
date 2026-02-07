# Base App Template

A production-ready Next.js 14 template for building Base Mini Apps with wallet auth, NFT support, and an admin system.

## What's Included

### Core Infrastructure
- **Next.js 14** App Router with TypeScript strict mode
- **SIWE Authentication** (Sign-In With Ethereum) via iron-session
- **Supabase** PostgreSQL database with RLS policies
- **OnchainKit + wagmi + viem** for wallet interactions
- **Tailwind CSS** styling with accessible UI components

### NFT Abstraction Layer
A strategy-pattern system supporting three providers behind a unified API:

| Provider | Use Case | Standards |
|----------|----------|-----------|
| **OnchainKit** | Existing ERC-721/1155 contracts | ERC-721, ERC-1155 |
| **Zora Protocol** | New NFT creation + minting with referral revenue | ERC-721, ERC-1155 |
| **Zora Coins** | Fungible coin creation + trading | ERC-20 |

Application code never calls provider SDKs directly. The server resolves the correct provider from collection config and builds transactions.

**Key files:**
- `lib/nft/` - Provider abstraction (types, registry, facade, provider implementations)
- `hooks/useNFTMint.ts` - Client-side mint flow (prepare tx -> wagmi -> record)
- `components/nft/` - Display and mint UI components
- `app/api/nft/` - Public NFT API routes

### Admin System
Role-based access control with three tiers:

| Role | Capabilities |
|------|-------------|
| **user** | Default role, standard app access |
| **admin** | Manage collections, view mint analytics, configure settings |
| **superadmin** | All admin powers + user role management |

**Key files:**
- `lib/admin.ts` - Role utilities (server-side)
- `lib/middleware.ts` - `requireAdmin` middleware option
- `app/admin/` - Admin dashboard pages
- `app/api/admin/` - Admin API routes
- `components/admin/` - Admin UI components

### Database Schema
Two migrations provide the full schema:

| Table | Purpose |
|-------|---------|
| `accounts` | Users with wallet address and role |
| `app_settings` | Key-value admin configuration |
| `nft_collections` | NFT collections with provider routing |
| `nft_tokens` | Individual tokens within collections |
| `nft_mints` | Mint event tracking with tx hashes |

---

## Creating a New App

### 1. Create from template

On GitHub, click **"Use this template" > "Create a new repository"** and name your app.

### 2. Clone and install

```bash
git clone git@github.com:<your-org>/<your-app>.git
cd <your-app>
npm install
```

### 3. Add template upstream (for future updates)

```bash
git remote add upstream git@github.com:mbernier/base-app-template.git
```

### 4. Configure environment

```bash
cp .env.example .env.local
```

Fill in your values. Required:
- `NEXT_PUBLIC_CDP_API_KEY` - from https://portal.cdp.coinbase.com
- `SESSION_SECRET` - `openssl rand -base64 32`
- Supabase credentials (see `.env.example` for details)

### 5. Set up database

```bash
npx supabase start        # Start local Supabase
npx supabase db push       # Apply migrations
```

### 6. Run

```bash
npm run dev                # http://localhost:3100
```

---

## What to Customize vs. What to Leave

### Customize (your app-specific code)

| Area | What to change |
|------|---------------|
| `app/page.tsx` | Your homepage |
| `app/` pages | Add your app's routes and pages |
| `app/api/` | Add your app-specific API routes |
| `components/` | Add domain-specific components |
| `hooks/` | Add domain-specific hooks |
| `types/` | Add your app's type definitions |
| `lib/config.ts` | Update `app.name`, `app.description` |
| `supabase/migrations/` | Add new migrations (003+) for your schema |
| `.env.local` | Your environment variables |
| `public/` | Your assets, favicon, etc. |

### Leave alone (template infrastructure)

| Area | Why |
|------|-----|
| `lib/nft/` | NFT provider abstraction - extend via new providers, don't modify existing |
| `lib/admin.ts` | Admin role system |
| `lib/middleware.ts` | Auth/admin middleware chain |
| `lib/auth.ts` | SIWE authentication |
| `lib/db.ts` | Database client and base types |
| `components/ui/` | Base UI components (Button, Input, Modal, etc.) |
| `components/auth/` | Auth guards and wallet components |
| `app/admin/` | Admin dashboard (customize appearance, don't restructure) |
| `supabase/migrations/001_*.sql` | Base schema |
| `supabase/migrations/002_*.sql` | NFT + admin schema |

---

## Pulling Template Updates

When the template gets improvements:

```bash
git fetch upstream
git merge upstream/main
```

Resolve any conflicts. Conflicts are most likely in:
- `lib/config.ts` (if you added config groups)
- `package.json` (dependency versions)
- Migration files (if template adds new migrations with the same number)

**Tip:** Keep your app's migrations numbered from `003` onwards to avoid conflicts with template migrations.

---

## Contributing Back to the Template

Found a bug or made an improvement that belongs in the template?

### Option 1: Cherry-pick (preferred for isolated changes)

```bash
# In your template repo clone
cd ../base-app-template
git checkout -b fix/description
git cherry-pick <commit-hash-from-your-app>
git push origin fix/description
# Open PR on GitHub
```

### Option 2: Manual port (for changes spread across commits)

```bash
cd ../base-app-template
git checkout -b improve/description
# Manually apply the changes
git add <files>
git commit -m "improve: description of change"
git push origin improve/description
# Open PR on GitHub
```

### What belongs in the template vs. your app

**Template-worthy:**
- Bug fixes in `lib/`, `components/ui/`, auth, admin, NFT abstraction
- New NFT providers
- UI component improvements
- Middleware enhancements
- Migration fixes

**App-specific (keep in your repo):**
- Business logic, pages, domain components
- App-specific API routes
- Custom styling/branding
- Additional database tables for your domain

---

## Architecture Quick Reference

### Request Flow

```
Client Component
  → hook (useNFTMint, useAuth, etc.)
    → fetch('/api/...')
      → apiMiddleware (auth + rate limit + admin check)
        → lib/ business logic
          → Supabase / NFT provider
```

### NFT Mint Flow

```
1. Client: useNFTMint.mint(collectionId)
2. API:    POST /api/nft/mint/prepare → resolves provider, builds tx calls
3. Client: wagmi writeContractAsync(txParams)
4. Chain:  Transaction confirms
5. API:    POST /api/nft/mint/record → saves mint event to DB
```

### Key Patterns

- **API routes**: Use `apiMiddleware(request, { requireAuth?, requireAdmin? })`
- **Database types**: `lib/db.ts` uses `Row`/`Insert`/`Update` with snake_case; app types in `types/` use camelCase
- **Hooks**: Return `{ data, isLoading, error, refetch }`
- **Components**: 44px min touch targets, use `components/ui/` primitives
- **Images**: Must use `next/image` `<Image>` component

---

## Ports

| Service | Port |
|---------|------|
| Dev Server | 3100 |
| Supabase API | 54340 |
| Supabase DB | 54341 |
| Supabase Studio | 54342 |

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # TypeScript check
npm run format       # Prettier
```
