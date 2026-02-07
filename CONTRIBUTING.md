# Contributing to Base App Template

Thank you for your interest in contributing to the Base App Template. This guide covers how to contribute improvements back from your app or directly to the template.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Create a feature branch: `git checkout -b improve/description`
4. Make your changes
5. Submit a pull request

## Development Setup

```bash
git clone git@github.com:mbernier/base-app-template.git
cd base-app-template
npm install
cp .env.example .env.local
# Fill in .env.local values
npx supabase start
npm run dev
```

## Contributing from a Consuming App

If you built an app from this template and want to contribute an improvement back:

### Option 1: Cherry-pick (for clean, isolated commits)

```bash
cd base-app-template
git checkout -b improve/description
git cherry-pick <commit-hash-from-your-app>
git push origin improve/description
# Open PR on GitHub
```

### Option 2: Manual port (for changes across multiple commits)

```bash
cd base-app-template
git checkout -b improve/description
# Manually apply the relevant changes
git add <files>
git commit -m "improve: description of change"
git push origin improve/description
# Open PR on GitHub
```

### What belongs in the template

- Bug fixes in `lib/`, `components/ui/`, auth, admin, NFT abstraction
- New NFT providers
- UI component improvements or new base components
- Middleware enhancements
- Database migration fixes
- Documentation improvements
- Test additions

### What stays in your app

- Business logic, domain pages, custom components
- App-specific API routes
- Custom styling/branding
- Database tables for your domain
- App-specific configuration

## Code Standards

### TypeScript

- No `any` types unless absolutely necessary (document with eslint-disable comment and explanation)
- All components must have explicit return types
- Use named exports for components
- Follow existing patterns in `hooks/` and `lib/`

### Components

- Use `forwardRef` for components that wrap native elements
- 44px minimum touch targets on all interactive elements
- WCAG 2.1 AA accessibility compliance
- Use `components/ui/` primitives (Button, Input, Modal) as building blocks

### API Routes

- Use `apiMiddleware(request, { requireAuth?, requireAdmin? })` for all routes
- Return `NextResponse.json()` with consistent shape
- Admin routes must use `requireAdmin: true`

### Database

- Migrations numbered sequentially (003+)
- Use `TIMESTAMP WITH TIME ZONE`, UUID PKs, `gen_random_uuid()`
- Enable RLS on all new tables
- Add service_role bypass policies
- Follow snake_case for column names
- Add `update_updated_at()` trigger for tables with `updated_at`

### Images

- Must use `next/image` `<Image>` component, never `<img>` tags

## Documentation Requirement

**Every code change must include corresponding documentation updates.**

This is a hard requirement, not a suggestion. When your PR changes code, you must also update the relevant docs:

| What you changed | Docs to update |
|-----------------|----------------|
| New/modified API route | `docs/api-reference.md` |
| New/modified component | `docs/ui-kit.md` |
| Database schema change | `docs/database.md` |
| New/modified hook | Relevant feature doc (`docs/nft-abstraction.md`, etc.) |
| Auth changes | `docs/authentication.md` |
| NFT provider changes | `docs/nft-abstraction.md` |
| Admin system changes | `docs/admin-system.md` |
| Config/env var changes | `docs/configuration.md` |
| Architecture changes | `docs/architecture.md` |
| Testing patterns | `docs/testing.md` |
| Setup/install changes | `docs/getting-started.md` |
| User-facing features | `docs/user-docs/` |

Additionally, update `AGENTINFO.md` if the change affects patterns that AI agents need to know about.

PRs without documentation updates will be asked to add them before merge.

## Testing Requirements

- If we own it, we test it directly - no mocking internal systems
- Use real Supabase for database tests
- Mocks are only for external third-party services (Zora SDKs, wagmi)
- All mocks must have validation tests that verify they match the real API
- Tests must pass 100% before PR merge

```bash
npm run test           # Run all tests
npm run type-check     # TypeScript validation
npm run lint           # ESLint
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with documentation updates
3. Ensure all checks pass: `npm run type-check && npm run lint`
4. Write a clear PR description explaining what changed and why
5. Reference any related issues
6. Request review

## Commit Message Format

Use conventional-ish commit messages:

```
feat: add new NFT provider for SuperMint
fix: correct admin role check for settings endpoint
docs: update API reference with new mint parameters
refactor: extract shared validation logic to lib/
test: add integration tests for collection CRUD
```

## Questions?

Open an issue on GitHub or reach out at [mbernier.com](https://mbernier.com).
