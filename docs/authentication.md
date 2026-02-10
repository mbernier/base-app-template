# Authentication

The template uses **Sign-In With Ethereum (SIWE)** for authentication. Users prove wallet ownership by signing a message, and the server creates an encrypted session cookie. This document explains the full flow, the components involved, and how to protect your own pages and API routes.

## How SIWE Authentication Works

SIWE lets you authenticate users by their wallet address. Instead of email and password, the user signs a structured message with their private key. The server verifies the signature and creates a session.

### Step-by-Step Flow

```
  Browser                           Server
  -------                           ------

  1. User connects wallet
     (Wagmi + OnchainKit)

  2. User clicks "Sign In"
     |
     +--> GET /api/auth/siwe
          ?address=0x...&chainId=84532
                                    3. Generate nonce
                                    4. Build SIWE message
                                    5. Store nonce in session cookie
                                    6. Return { message, nonce }
     <--
  7. Prompt user to sign message
     (wagmi signMessageAsync)

  8. User signs in wallet
     |
     +--> POST /api/auth/siwe
          { message, signature }
                                    9. Verify signature (siwe library)
                                   10. Upsert user in accounts table
                                   11. Check super admin initialization
                                   12. Create session cookie
                                       { address, chainId, isLoggedIn: true }
                                   13. Return { success, user }
     <--
  14. Update auth state
      (useAuth context)
```

### What Happens at Each Step

**Steps 1-2: Wallet connection.** The `AppProviders` component wraps the app in `WagmiProvider` and `OnchainKitProvider`. When the user connects a wallet, Wagmi tracks the connected address and chain.

**Steps 3-6: Message generation.** The `GET /api/auth/siwe` route builds a SIWE message containing:

- The domain (`SIWE_DOMAIN` config)
- The wallet address
- A human-readable statement (`SIWE_STATEMENT` config)
- The app URL
- A random nonce (stored in the session for replay protection)
- A 5-minute expiration

**Steps 7-8: Signing.** The `useAuth` hook calls `signMessageAsync` from Wagmi, which prompts the user's wallet to sign the SIWE message.

**Steps 9-13: Verification.** The `POST /api/auth/siwe` route:

1. Verifies the signature using the `siwe` library.
2. Calls `upsertUser()` to create or update the account in the `accounts` table (address is lowercased, `last_seen_at` is updated).
3. Calls `initializeSuperAdmin()` to check if this address matches `INITIAL_SUPER_ADMIN_ADDRESS` and promote it to `superadmin` if so.
4. Saves the session with `address`, `chainId`, and `isLoggedIn: true`.

**Step 14: Client state update.** The `useAuth` hook updates the React context with the logged-in state and user information.

## Session Management

Sessions use [iron-session](https://github.com/vvo/iron-session), which stores encrypted data directly in an HTTP cookie. There is no server-side session store.

### Session Data

```typescript
interface SessionData {
  address?: string; // Wallet address
  chainId?: number; // Chain ID
  isLoggedIn: boolean; // Auth status
  nonce?: string; // SIWE nonce (temporary, used during sign-in)
  tosAcceptedVersion?: string;
  tosAcceptedAt?: string;
}
```

### Session Cookie Configuration

| Property    | Development                         | Production         |
| ----------- | ----------------------------------- | ------------------ |
| Cookie name | `base_app_session`                  | `base_app_session` |
| `httpOnly`  | `true`                              | `true`             |
| `secure`    | `false`                             | `true`             |
| `sameSite`  | `lax`                               | `lax`              |
| `maxAge`    | `SESSION_DURATION` (default 86400s) | `SESSION_DURATION` |

The session secret is `SESSION_SECRET` from your environment. In development, a fallback secret is used if the variable is not set. **In production, a missing `SESSION_SECRET` causes a hard failure.**

### Reading the Session (Server-Side)

```typescript
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();

  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // session.address is the authenticated wallet address
  // session.chainId is the chain they connected from
}
```

### Destroying the Session (Logout)

The `POST /api/auth/logout` route calls `session.destroy()`, which clears the cookie:

```typescript
const session = await getSession();
session.destroy();
```

On the client side, the `useAuth` hook also calls `disconnect()` from Wagmi to disconnect the wallet.

## The useAuth Hook

The `useAuth` hook provides authentication state and actions to any client component. It is backed by a React context (`AuthProvider`) that wraps the entire app.

### What It Returns

```typescript
interface AuthContextType {
  // State
  isLoggedIn: boolean; // Has the user completed SIWE sign-in?
  isLoading: boolean; // Is an auth operation in progress?
  address?: string; // Authenticated wallet address
  user?: UserInfo; // User data from the database

  // Wallet state (from Wagmi)
  isWalletConnected: boolean; // Is a wallet connected (but not necessarily signed in)?
  walletAddress?: `0x${string}`;

  // Actions
  signIn(): Promise<void>; // Start the full SIWE flow
  signOut(): Promise<void>; // Destroy session and disconnect wallet
  refreshSession(): Promise<void>; // Re-fetch session from the server
}
```

### Usage Example

```tsx
'use client';

import { useAuth } from '@/hooks/useAuth';

export function MyComponent() {
  const { isLoggedIn, isLoading, address, signIn, signOut } = useAuth();

  if (isLoading) return <p>Loading...</p>;

  if (!isLoggedIn) {
    return <button onClick={signIn}>Sign In</button>;
  }

  return (
    <div>
      <p>Signed in as {address}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

### Auto-Logout on Wallet Disconnect

The `AuthProvider` watches the Wagmi connection state. If the wallet disconnects while the user is logged in, it automatically calls `signOut()` to clear the session.

## AuthGuard Component

The `AuthGuard` component protects pages that require authentication. Wrap any page content with it.

### Props

| Prop         | Type        | Default | Description                               |
| ------------ | ----------- | ------- | ----------------------------------------- |
| `children`   | `ReactNode` | --      | Content to show when authenticated        |
| `fallback`   | `ReactNode` | --      | Custom UI to show when not authenticated  |
| `redirectTo` | `string`    | --      | URL to redirect to when not authenticated |

### Behavior

1. While checking auth status, shows a loading spinner.
2. If not authenticated and `redirectTo` is set, redirects to that URL.
3. If not authenticated and `fallback` is provided, renders the fallback.
4. If not authenticated, no fallback, and wallet is connected, shows a "Complete Sign-In" prompt with a `SignInButton`.
5. If not authenticated, no fallback, and wallet is not connected, shows an "Authentication Required" prompt.
6. If authenticated, renders `children`.

### Usage Examples

**Basic protection:**

```tsx
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function ProfilePage() {
  return (
    <AuthGuard>
      <h1>My Profile</h1>
      {/* Only visible to signed-in users */}
    </AuthGuard>
  );
}
```

**With redirect:**

```tsx
<AuthGuard redirectTo="/join">
  <AdminPanel />
</AuthGuard>
```

**With custom fallback:**

```tsx
<AuthGuard fallback={<p>Please sign in to view your portfolio.</p>}>
  <Portfolio />
</AuthGuard>
```

## Server-Side Auth Checking

For API routes, use `getSession()` directly or the `apiMiddleware` helper.

### Using apiMiddleware (Recommended)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { apiMiddleware } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  // Returns a 401/403/429 response if checks fail, or null if all pass
  const middlewareResult = await apiMiddleware(request, {
    requireAuth: true, // Require SIWE session
    rateLimit: true, // Apply rate limiting (default: true)
  });
  if (middlewareResult) return middlewareResult;

  // User is authenticated -- continue with business logic
}
```

### Admin-Only Routes

```typescript
const middlewareResult = await apiMiddleware(request, {
  requireAdmin: true, // Requires auth AND admin/superadmin role
});
if (middlewareResult) return middlewareResult;
```

When `requireAdmin` is `true`, the middleware:

1. Checks that the user is logged in (same as `requireAuth`).
2. Looks up the user's `role` in the `accounts` table.
3. Returns 403 if the role is not `admin` or `superadmin`.

### Using getSession Directly

```typescript
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();

  if (!session.isLoggedIn || !session.address) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // session.address is available
}
```

## Super Admin Auto-Initialization

When the `INITIAL_SUPER_ADMIN_ADDRESS` environment variable is set, the configured wallet address is automatically promoted to `superadmin` role the first time it logs in via SIWE.

This happens in `lib/admin.ts` via `initializeSuperAdmin()`, which is called during the SIWE POST handler. It only runs once -- if the account already has the `superadmin` role, it is a no-op.

This is the recommended way to set up your first admin account. After that, the super admin can promote other users through the admin panel.

## Adding Auth to New Routes

### Protecting a New API Route

Create your route in `app/api/your-feature/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { apiMiddleware } from '@/lib/middleware';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const middlewareResult = await apiMiddleware(request, { requireAuth: true });
  if (middlewareResult) return middlewareResult;

  const session = await getSession();
  // session.address is guaranteed to be set here

  return NextResponse.json({ data: 'protected content' });
}
```

### Protecting a New Page

Wrap the page content with `AuthGuard`:

```tsx
// app/my-page/page.tsx
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function MyPage() {
  return (
    <AuthGuard>
      <div>Protected page content</div>
    </AuthGuard>
  );
}
```

## Farcaster Authentication (SIWF)

When Farcaster mini-app mode is enabled (`NEXT_PUBLIC_FARCASTER_ENABLED=true`), the template supports a second authentication method: Sign-In With Farcaster (SIWF).

### How It Works

Farcaster authentication uses the same session infrastructure as SIWE but authenticates via the Farcaster SDK context instead of a wallet signature.

```
  Farcaster Client                    Server
  ----------------                    ------

  1. Mini-app loads inside
     Farcaster frame

  2. useFarcasterContext() reads
     SDK context (FID, address)

  3. Auto-auth triggers
     |
     +--> POST /api/auth/farcaster
          { message, signature, fid, username, ... }
                                      4. Verify SIWF message
                                         (nonce, domain, expiry)
                                      5. Upsert user in accounts table
                                      6. Link FID in farcaster_users table
                                      7. Create session cookie
                                         { address, fid, authMethod: 'farcaster' }
                                      8. Return { success, user }
     <--
  9. Update auth state
```

### Dual-Mode Authentication

The template automatically detects the context:

- **Standalone browser**: Uses SIWE (wallet signature)
- **Inside Farcaster client**: Uses SIWF (Farcaster SDK context)

The `useFarcasterContext` hook in `hooks/useFarcaster.tsx` detects the Farcaster environment and triggers auto-authentication via `useAuth`. The session stores `authMethod: 'farcaster'` and the user's `fid` for downstream logic.

### Farcaster Notifications

Users who add the mini-app receive a notification token. The template provides:

- `sendNotification(fid, title, body)` -- Send a push notification to a specific user
- `broadcastNotification(title, body)` -- Send to all users with notifications enabled

See `lib/farcaster-notifications.ts` for the notification delivery implementation.

### Farcaster Webhook

The `POST /api/farcaster/webhook` endpoint handles lifecycle events from the Farcaster platform:

- **`frame_added`** -- User added the mini-app; stores notification token
- **`frame_removed`** -- User removed the mini-app; marks user as removed
- **`notifications_enabled`** -- User enabled notifications
- **`notifications_disabled`** -- User disabled notifications

## Auth-Related API Endpoints

| Endpoint                 | Method | Purpose                                                      |
| ------------------------ | ------ | ------------------------------------------------------------ |
| `/api/auth/siwe`         | `GET`  | Generate a SIWE message with a fresh nonce                   |
| `/api/auth/siwe`         | `POST` | Verify a signed SIWE message and create a session            |
| `/api/auth/session`      | `GET`  | Check current session status and return user data            |
| `/api/auth/logout`       | `POST` | Destroy the session cookie                                   |
| `/api/auth/farcaster`    | `POST` | Verify SIWF message and create a Farcaster session           |
| `/api/farcaster/webhook` | `POST` | Handle Farcaster lifecycle events (add/remove/notifications) |

## Next Steps

- [Architecture](./architecture.md) -- see where auth fits in the overall request flow.
- [Database](./database.md) -- the `accounts` and `sessions` tables.
- [Configuration](./configuration.md) -- auth-related environment variables.
