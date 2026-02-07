# Admin System

The admin system provides role-based access control, a management dashboard, and configuration tools for your application. It is built on three roles -- user, admin, and superadmin -- enforced at both the API and UI layers. Admins manage NFT collections and view analytics. Superadmins additionally manage user roles and all application settings.

---

## Role System

Roles are stored in the `role` column of the `accounts` table. Every account defaults to `user` on creation.

| Role | Can access admin dashboard | Manage collections | View analytics | Manage settings | Manage user roles |
|---|---|---|---|---|---|
| `user` | No | No | No | No | No |
| `admin` | Yes | Yes | Yes | Yes | No |
| `superadmin` | Yes | Yes | Yes | Yes | Yes |

The role hierarchy is checked with two helper functions in `lib/admin.ts`:

- `isAdmin(address)` -- returns `true` for `admin` or `superadmin`
- `isSuperAdmin(address)` -- returns `true` only for `superadmin`

---

## Super Admin Initialization

The first superadmin is bootstrapped via the `INITIAL_SUPER_ADMIN_ADDRESS` environment variable.

```bash
# .env.local
INITIAL_SUPER_ADMIN_ADDRESS=0xYourWalletAddress
```

**How it works:** During every SIWE login (`POST /api/auth/siwe`), after the signature is verified and the user is upserted, the system calls `initializeSuperAdmin(address)`. This function:

1. Reads `INITIAL_SUPER_ADMIN_ADDRESS` from `lib/config.ts`
2. Compares it (case-insensitive) to the address that just logged in
3. If they match and the account exists but is not already `superadmin`, promotes the account to `superadmin`

This is a one-time bootstrap mechanism. Once you have a superadmin, they can promote other users to admin or superadmin through the user management UI. You can remove the environment variable after initial setup if you prefer.

---

## Admin Middleware

API routes use `apiMiddleware` from `lib/middleware.ts` to enforce authentication and role checks. The middleware chain runs in this order:

```
1. Rate limiting   (always, unless explicitly disabled)
2. Authentication  (if requireAuth or requireAdmin is true)
3. Admin check     (if requireAdmin is true)
```

### How requireAdmin works

When an API route specifies `{ requireAdmin: true }`:

```typescript
export async function GET(request: NextRequest): Promise<NextResponse> {
  const middlewareResult = await apiMiddleware(request, { requireAdmin: true });
  if (middlewareResult) return middlewareResult; // Returns 401 or 403

  // Your handler code here
}
```

The middleware:

1. Checks rate limit -- returns `429 Too Many Requests` if exceeded
2. Calls `requireAuth` -- reads the iron-session, returns `401` if not logged in
3. Calls `requireAdmin` -- reads the session address, calls `isAdmin(address)` against the database, returns `403` if the user is not an admin or superadmin

If all checks pass, the middleware returns `null` and your handler runs.

### Middleware options

```typescript
apiMiddleware(request, {
  requireAuth?: boolean;   // Check authentication
  requireAdmin?: boolean;  // Check admin role (implies requireAuth)
  rateLimit?: boolean;     // Rate limit (defaults to true)
});
```

---

## AdminGuard Component

`components/admin/AdminGuard.tsx` protects client-side admin pages. It wraps content with both authentication and role checks.

### Basic usage (admin or superadmin)

```tsx
import { AdminGuard } from '@/components/admin/AdminGuard';

export default function AdminPage() {
  return (
    <AdminGuard>
      <h1>Admin Content</h1>
    </AdminGuard>
  );
}
```

### Superadmin-only pages

```tsx
<AdminGuard requireSuperAdmin>
  <h1>Only superadmins see this</h1>
</AdminGuard>
```

### How it works internally

`AdminGuard` composes two layers:

1. **AuthGuard** -- redirects unauthenticated users to connect their wallet
2. **AdminRoleCheck** -- uses the `useAdmin()` hook to fetch the user's role from `GET /api/admin/role`, then renders children, a loading spinner, or an "Access Denied" message

---

## Admin Dashboard Pages

The admin section lives under `app/admin/` and uses a shared layout (`app/admin/layout.tsx`) that wraps all pages with `AdminGuard` and `AdminNav`.

### Layout structure

```tsx
// app/admin/layout.tsx
<AdminGuard>
  <div className="flex">
    <AdminNav />        {/* Sidebar navigation */}
    <div>{children}</div> {/* Page content */}
  </div>
</AdminGuard>
```

### Navigation

`AdminNav` (`components/admin/AdminNav.tsx`) renders these links for all admins:

| Path | Label | Description |
|---|---|---|
| `/admin` | Dashboard | Mint analytics and recent activity |
| `/admin/collections` | Collections | CRUD for NFT collections |
| `/admin/settings` | Settings | App settings management |

Superadmins see an additional link:

| Path | Label | Description |
|---|---|---|
| `/admin/users` | Users | User role management |

### Dashboard page

**File:** `app/admin/page.tsx`

The main dashboard fetches data from `GET /api/admin/mints` and displays:

- **MintAnalytics** -- stat cards showing total mints, total quantity, and unique minters
- **MintActivityFeed** -- a list of recent mint events with minter address, quantity, tx hash, provider, status, and timestamp

---

## Collection Management

Admins create and manage NFT collections through the admin UI and `POST /api/admin/collections` and `PATCH /api/admin/collections/{id}` endpoints.

### Collection fields

| Field | Required | Description |
|---|---|---|
| `name` | Yes | Display name for the collection |
| `description` | No | Text description |
| `provider` | Yes | One of `onchainkit`, `zora_protocol`, `zora_coins` |
| `contractAddress` | No | On-chain contract address (can be set after deployment) |
| `chainId` | No | Defaults to `8453` (Base Mainnet). Also supports `84532` (Base Sepolia) |
| `tokenStandard` | No | `erc721`, `erc1155`, or `erc20` |
| `imageUrl` | No | Collection image URL |
| `externalUrl` | No | Link to external collection page |
| `providerConfig` | No | Provider-specific JSON config (see NFT Abstraction docs) |
| `isActive` | -- | Defaults to `true` on creation. Toggle in the collection list. |

### Provider-specific config in the admin form

The `CollectionForm` component (`components/admin/CollectionForm.tsx`) renders additional fields based on the selected provider:

**Zora Protocol:** Shows a "Mint Referral Address" field that maps to `providerConfig.mintReferral`.

**Zora Coins:** Shows a "Starting Market Cap" dropdown (`LOW` or `HIGH`) that maps to `providerConfig.startingMarketCap`.

**OnchainKit:** No extra fields. Config is minimal (optional `tokenId`).

### Collection list

The `CollectionList` component (`components/admin/CollectionList.tsx`) renders a table with columns for name, provider, token standard, active status, and edit link. Admins can toggle a collection between active and inactive directly from the list.

---

## Mint Analytics

The `MintAnalytics` component (`components/admin/MintAnalytics.tsx`) displays three stat cards:

| Metric | Description |
|---|---|
| **Total Mints** | Count of all mint event records |
| **Total Quantity** | Sum of all tokens minted across all events |
| **Unique Minters** | Count of distinct minter addresses |

Data comes from `GET /api/admin/mints`, which calls `getMintStats()` from `lib/nft-db.ts`. The same endpoint returns `recentMints` for the activity feed.

---

## Settings System

Application settings are stored in the `app_settings` database table and managed through the admin UI.

### How settings work

Each setting is a key-value pair where the value is stored as JSON. Settings have:

| Field | Description |
|---|---|
| `key` | Unique string identifier (e.g., `'maintenance_mode'`, `'mint_enabled'`) |
| `value` | Any JSON-serializable value |
| `description` | Human-readable description |
| `updatedBy` | Account ID of the admin who last updated it |

### SettingsPanel component

The `SettingsPanel` (`components/admin/SettingsPanel.tsx`) displays all settings with inline editing. Clicking "Edit" on a setting opens a JSON textarea where admins can modify the value and save.

### How to add a new setting

1. Insert a row into the `app_settings` table (via migration or seed):

   ```sql
   INSERT INTO app_settings (key, value, description)
   VALUES ('your_setting_key', '"default_value"', 'Description of what this setting controls');
   ```

2. Read the setting in your code using `getSetting('your_setting_key')` from `lib/nft-db.ts`.

3. The setting will automatically appear in the admin Settings page for admins to modify.

---

## User Management

User management is **superadmin-only**. The `UserManagement` component (`components/admin/UserManagement.tsx`) shows a table of all accounts with:

- Truncated wallet address
- Username (if set)
- Role dropdown (user, admin, superadmin)
- Last seen date

Changing a role triggers `PATCH /api/admin/users` with `{ address, role }`. The API route double-checks that the caller is a superadmin before applying the change.

### Important: the superadmin gate is in the API

The `GET /api/admin/users` endpoint requires admin access (any admin can view the user list). But the `PATCH /api/admin/users` endpoint has an additional `isSuperAdmin()` check in the handler -- it returns `403` if the caller is only an admin.

---

## How to Add New Admin Pages

### Step 1: Create the page file

Create a new file under `app/admin/`:

```
app/admin/your-page/page.tsx
```

Because the admin layout (`app/admin/layout.tsx`) already wraps all child routes with `AdminGuard`, your page is automatically protected. You do not need to add `AdminGuard` again.

```tsx
'use client';

export default function YourAdminPage(): React.ReactElement {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Your Page</h1>
      {/* Page content */}
    </div>
  );
}
```

### Step 2: Add navigation

Add your page to the `navItems` array in `components/admin/AdminNav.tsx`:

```typescript
const navItems = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/collections', label: 'Collections' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/your-page', label: 'Your Page' },  // Add this
];
```

If the page should only be visible to superadmins, add it to `superAdminItems` instead:

```typescript
const superAdminItems = [
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/your-page', label: 'Your Page' },  // Superadmin only
];
```

### Step 3: For superadmin-only pages

If the page content should be restricted to superadmins (not just hidden from the nav), wrap the content:

```tsx
import { AdminGuard } from '@/components/admin/AdminGuard';

export default function SuperAdminOnlyPage() {
  return (
    <AdminGuard requireSuperAdmin>
      {/* Content */}
    </AdminGuard>
  );
}
```

---

## How to Add New Admin API Routes

### Step 1: Create the route file

Create a new file under `app/api/admin/`:

```
app/api/admin/your-endpoint/route.ts
```

### Step 2: Add middleware

Use `apiMiddleware` with `requireAdmin: true`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { apiMiddleware } from '@/lib/middleware';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const middlewareResult = await apiMiddleware(request, { requireAdmin: true });
  if (middlewareResult) return middlewareResult;

  try {
    // Your handler logic
    return NextResponse.json({ data: 'something' });
  } catch (error) {
    console.error('Your endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Step 3: For superadmin-only endpoints

Add an explicit `isSuperAdmin()` check inside the handler:

```typescript
import { getSession } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/admin';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const middlewareResult = await apiMiddleware(request, { requireAdmin: true });
  if (middlewareResult) return middlewareResult;

  const session = await getSession();
  if (!session.address || !(await isSuperAdmin(session.address))) {
    return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
  }

  // Superadmin-only logic
}
```

The pattern used throughout the codebase is: `requireAdmin` in middleware for general admin access, then an explicit `isSuperAdmin()` check in the handler for elevated operations.
