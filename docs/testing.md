# Testing

This document covers the testing philosophy for the Base Mini App template, what to mock (and what not to), and patterns for writing reliable tests. Following these guidelines ensures that your test suite actually catches real bugs rather than passing because of over-mocked internals.

## Testing Philosophy

The core principle is:

> **If we own it or write it, we test it directly. We do NOT mock it in tests.**

This means:

- **Do NOT mock the database.** Use a real Supabase instance (the local one started with `supabase start`).
- **Do NOT mock internal API routes.** Make real HTTP calls against the running Next.js server.
- **Do NOT mock internal libraries** (`lib/db.ts`, `lib/auth.ts`, `lib/nft-db.ts`, etc.).
- **DO mock external third-party services** that you do not control (Zora SDKs, wagmi hooks, OnchainKit components, external HTTP APIs).

The reasoning: mocking your own code creates a parallel universe where tests pass but production breaks. If the database query changes shape or an API route changes its response format, tests that mock those layers will not catch the regression.

## What Gets Mocked

Only external services and browser-specific APIs that cannot run in a test environment:

| Mock Target                          | Why                                        |
| ------------------------------------ | ------------------------------------------ |
| `@zoralabs/protocol-sdk`             | External service, requires live blockchain |
| `@zoralabs/coins-sdk`                | External service, requires live blockchain |
| `wagmi` hooks                        | Browser-only, requires wallet connection   |
| `@coinbase/onchainkit` components    | Browser-only, requires CDP API             |
| `window.ethereum` / wallet providers | Not available in Node.js                   |
| External HTTP APIs                   | Unreliable in CI, may cost money           |

## Mock Validation Requirement

Every mock must have its own validation test. This ensures that when the real system changes, you know the mock is out of date.

A mock validation test verifies that:

1. The mock's interface matches the real module's exports.
2. The mock's return types match what the real system returns.
3. Key behaviors are consistent (e.g., if the real function throws on invalid input, the mock should too).

Example pattern:

```typescript
// __tests__/unit/mocks/zora-protocol-sdk.test.ts
import { mockZoraProtocol } from './__mocks__/zora-protocol-sdk';
import * as realModule from '@zoralabs/protocol-sdk';

describe('Zora Protocol SDK mock validation', () => {
  it('exports the same public functions as the real module', () => {
    const realExports = Object.keys(realModule);
    const mockExports = Object.keys(mockZoraProtocol);

    for (const key of realExports) {
      expect(mockExports).toContain(key);
    }
  });

  it('mock return types match real function signatures', () => {
    // Validate that the mock's createCollection returns the expected shape
    const result = mockZoraProtocol.createCollection({});
    expect(result).toHaveProperty('contractAddress');
    expect(result).toHaveProperty('transactionHash');
  });
});
```

## What NOT to Mock

These are systems you own and control. Test them directly:

| System                           | Why Not Mock It                                               |
| -------------------------------- | ------------------------------------------------------------- |
| Supabase / PostgreSQL            | You own the schema and queries. Use the real local database.  |
| Internal API routes (`app/api/`) | You own the route handlers. Make real HTTP requests.          |
| `lib/db.ts` functions            | You own the database access layer. Call them for real.        |
| `lib/nft-db.ts` functions        | You own the CRUD operations. Run them against the real DB.    |
| `lib/auth.ts`                    | You own session and SIWE logic. Test with real iron-session.  |
| `lib/middleware.ts`              | You own the middleware. Test with real request objects.       |
| `lib/config.ts`                  | You own the config. Set env vars in tests instead of mocking. |

## Test File Organization

```
__tests__/
  unit/                        # Pure function and module tests
    nft/                       # Tests for NFT provider logic
      registry.test.ts
    mocks/                     # Mock validation tests
      zora-protocol-sdk.test.ts
      zora-coins-sdk.test.ts
  integration/                 # Tests that hit the database or span modules
    lib/                       # Database-backed lib module tests
      admin.test.ts
      admin-audit.test.ts
      admin-permissions.test.ts
      audit.test.ts
      farcaster.test.ts
      farcaster-notifications.test.ts
      nft-db.test.ts
    api/                       # API route integration tests
      admin/
        collections.test.ts
        settings.test.ts
        role.test.ts
      auth/
        farcaster.test.ts
        siwe.test.ts
      nft/
        collections.test.ts
        mint-prepare.test.ts
  component/                   # React component tests
    auth/
      AuthGuard.test.tsx
    layout/
      Header.test.tsx
  __mocks__/                   # Shared mock implementations
    @zoralabs/
      protocol-sdk.ts
      coins-sdk.ts
    wagmi.ts
lib/__tests__/                 # Tests co-located with lib modules (unit-level)
  config.test.ts
  middleware.test.ts
  rate-limit.test.ts
```

## Running Tests

The following commands are available (or should be added to `package.json`):

```bash
# Run all tests (exits when done -- no --watch)
npm test

# Run only unit tests
npm test -- --testPathPattern=__tests__/unit

# Run only integration tests
npm test -- --testPathPattern=__tests__/integration

# Run only component tests
npm test -- --testPathPattern=__tests__/component

# Run tests matching a pattern
npm test -- --testPathPattern=auth

# Run with coverage
npm test -- --coverage
```

All tests run without `--watch` so they complete and exit on their own. This is important for CI pipelines and to avoid leaving hanging processes.

## Vitest Project Configuration

The test suite is split into two vitest projects to balance speed and reliability:

### Unit Project

- Includes: `__tests__/unit/`, `__tests__/component/`, `lib/__tests__/`
- Parallelism: Full (default vitest behavior)
- Timeouts: 10s test, 15s hook
- No database contention concerns

### Integration Project

- Includes: `__tests__/integration/`
- Parallelism: **Disabled** (`fileParallelism: false`) -- tests run one file at a time
- Timeouts: 30s test, 30s hook
- Sequential execution prevents Supabase connection contention

This split ensures unit tests run fast while integration tests run reliably against the shared database.

## Writing a New Test

### Unit Test Pattern

Unit tests verify individual functions in isolation from the network, but still use the real database.

```typescript
// __tests__/unit/lib/nft-db.test.ts
import { createCollection, getCollectionById, deleteCollection } from '@/lib/nft-db';

describe('nft-db: collections', () => {
  let testCollectionId: string;

  afterEach(async () => {
    // Clean up test data
    if (testCollectionId) {
      try {
        await deleteCollection(testCollectionId);
      } catch {}
    }
  });

  it('creates and retrieves a collection', async () => {
    const collection = await createCollection({
      name: 'Test Collection',
      provider: 'onchainkit',
      chain_id: 84532,
    });

    testCollectionId = collection.id;

    expect(collection.name).toBe('Test Collection');
    expect(collection.provider).toBe('onchainkit');
    expect(collection.is_active).toBe(true);

    const fetched = await getCollectionById(collection.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.name).toBe('Test Collection');
  });

  it('returns null for a non-existent collection', async () => {
    const result = await getCollectionById('00000000-0000-0000-0000-000000000000');
    expect(result).toBeNull();
  });
});
```

### Integration Test Pattern

Integration tests verify the full request path from HTTP request to database and back.

```typescript
// __tests__/integration/api/session.test.ts

describe('GET /api/auth/session', () => {
  it('returns isLoggedIn: false when no session exists', async () => {
    const response = await fetch('http://localhost:3100/api/auth/session');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isLoggedIn).toBe(false);
  });
});
```

### Component Test Pattern

Component tests render React components and verify their behavior. External wallet libraries are mocked.

```typescript
// __tests__/component/auth/AuthGuard.test.tsx
import { render, screen } from '@testing-library/react';
import { AuthGuard } from '@/components/auth/AuthGuard';

// Mock useAuth hook for component tests (wallet interaction is external)
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isLoggedIn: false,
    isLoading: false,
    isWalletConnected: false,
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe('AuthGuard', () => {
  it('shows authentication required when not logged in', () => {
    render(
      <AuthGuard>
        <p>Protected content</p>
      </AuthGuard>
    );

    expect(screen.getByText('Authentication Required')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });
});
```

**Note:** Even in component tests, we only mock browser-specific externals (wallet hooks, Next.js router). The mock for `useAuth` in this example is acceptable because `wagmi` hooks do not work outside a browser environment.

## Test Environment Setup

### Prerequisites

Before running tests:

1. **Supabase must be running** (`supabase start`). Integration and unit tests that hit the database need a real PostgreSQL instance.
2. **Environment variables must be set.** Copy `.env.example` to `.env.test.local` and fill in the Supabase keys.
3. **For integration tests,** the Next.js dev server should be running (`npm run dev`).

### Database Cleanup

Tests should clean up after themselves. Create test data at the start of each test and delete it in `afterEach` or `afterAll`. Do not rely on the database being empty -- other tests may run in parallel.

### Environment Variable Overrides

To test configuration behavior, set environment variables directly in the test rather than mocking `lib/config.ts`:

```typescript
describe('config validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('warns when SESSION_SECRET is missing in development', () => {
    process.env.NODE_ENV = 'development';
    process.env.SESSION_SECRET = '';

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    // Import and call validateServerConfig()
    consoleSpy.mockRestore();
  });
});
```

## Summary of Rules

1. **If we own it, test it directly.** No mocking databases, internal APIs, or internal libraries.
2. **Only mock external third-party services** (Zora SDKs, wagmi, OnchainKit, external APIs).
3. **Every mock must have a validation test** that confirms it matches the real system.
4. **Use a real Supabase instance** for all database tests.
5. **Tests run without `--watch`** so they exit cleanly.
6. **Tests must pass at 100%.** No skipping, no known failures.
7. **Linting errors are never ignored or bypassed.**
8. **Clean up test data** in `afterEach` or `afterAll`.

## Next Steps

- [Database](./database.md) -- understand the schema your tests will interact with.
- [Authentication](./authentication.md) -- test the SIWE flow end to end.
- [Architecture](./architecture.md) -- see how all the pieces fit together.
