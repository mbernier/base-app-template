# UI Kit Reference

This document covers every reusable component shipped with the Base Mini App template. Each section includes the full props interface, a copy-pasteable usage example, and accessibility notes drawn directly from the source code.

Use this reference when you are building pages in your forked app. All import paths use the `@/` alias that maps to the project root.

---

## Table of Contents

- [Base UI Components](#base-ui-components)
  - [Button](#button)
  - [Input](#input)
  - [Modal](#modal)
  - [LoadingSpinner and PageLoading](#loadingspinner-and-pageloading)
  - [Toast and ToastContainer](#toast-and-toastcontainer)
- [Auth Components](#auth-components)
  - [AuthGuard](#authguard)
- [Wallet Components](#wallet-components)
  - [TransactionButtonWrapper](#transactionbuttonwrapper)
- [NFT Components](#nft-components)
  - [NFTDisplay](#nftdisplay)
  - [NFTMintButton](#nftmintbutton)
  - [NFTCollectionCard](#nftcollectioncard)
  - [NFTGrid](#nftgrid)
  - [MintStatus](#mintstatus)
- [Admin Components](#admin-components)
  - [AdminGuard](#adminguard)
  - [AdminNav](#adminnav)
  - [StatCard](#statcard)
  - [CollectionForm](#collectionform)
  - [CollectionList](#collectionlist)
  - [MintAnalytics](#mintanalytics)
  - [MintActivityFeed](#mintactivityfeed)
  - [SettingsPanel](#settingspanel)
  - [UserManagement](#usermanagement)
- [Design System](#design-system)
  - [Tailwind Configuration](#tailwind-configuration)
  - [Spacing Conventions](#spacing-conventions)
  - [Touch Target Requirements](#touch-target-requirements)
  - [Accessibility Standards](#accessibility-standards)
  - [Common Layout Patterns](#common-layout-patterns)
- [Adding New Components](#adding-new-components)

---

## Base UI Components

These live in `components/ui/` and form the foundation of every page in the app. They are framework-agnostic (no wallet or blockchain dependencies) and can be used anywhere.

---

### Button

**Import:** `import { Button } from '@/components/ui/Button';`

A general-purpose button with variant styling, size options, and a built-in loading spinner. Uses `forwardRef` so you can attach refs for focus management or third-party libraries.

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'outline' \| 'ghost'` | No | `'primary'` | Visual style of the button. |
| `size` | `'sm' \| 'md' \| 'lg'` | No | `'md'` | Controls padding, font size, and minimum height. `md` meets the 44px touch target. |
| `isLoading` | `boolean` | No | `undefined` | When `true`, shows an animated spinner and disables the button. |
| `disabled` | `boolean` | No | `undefined` | Disables the button. Also set automatically when `isLoading` is `true`. |
| `className` | `string` | No | `undefined` | Additional CSS classes appended to the button element. |
| `children` | `ReactNode` | No | `undefined` | Button label or content. |
| ...rest | `ButtonHTMLAttributes<HTMLButtonElement>` | -- | -- | All standard HTML button attributes (`onClick`, `type`, `aria-label`, etc.) are forwarded. |

#### Variant Styles

| Variant | Appearance |
|---------|-----------|
| `primary` | Blue background, white text. |
| `secondary` | Light gray background, dark text. |
| `outline` | Transparent background, gray border. |
| `ghost` | No background or border; shows background on hover. |

#### Size Reference

| Size | Min Height | Padding | Font Size |
|------|-----------|---------|-----------|
| `sm` | 32px | `px-3 py-1.5` | `text-sm` |
| `md` | 44px | `px-4 py-2` | `text-base` |
| `lg` | 52px | `px-6 py-3` | `text-lg` |

#### Usage

```tsx
import { Button } from '@/components/ui/Button';

// Basic primary button
<Button onClick={() => save()}>Save Changes</Button>

// Outline button, small size
<Button variant="outline" size="sm">Cancel</Button>

// Loading state
<Button isLoading>Submitting...</Button>

// Ghost button used as an inline action
<Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
  Edit
</Button>
```

#### Accessibility

- Focus ring: 2px offset ring on focus (`focus:ring-2 focus:ring-offset-2`).
- Disabled state: Reduced opacity and `cursor-not-allowed`.
- Loading spinner SVG has `aria-hidden="true"` so screen readers skip the decorative graphic.
- The `md` and `lg` sizes meet the WCAG 2.5.5 minimum 44px touch target. Use `sm` only for non-primary actions in dense layouts.

---

### Input

**Import:** `import { Input } from '@/components/ui/Input';`

A form input with integrated label, error message, and helper text. Uses `forwardRef` for compatibility with form libraries such as React Hook Form.

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `label` | `string` | No | `undefined` | Rendered as a `<label>` element above the input. Automatically linked via `htmlFor`. |
| `error` | `string` | No | `undefined` | Error message shown below the input in red. Switches the border color to red and sets `aria-invalid="true"`. |
| `helperText` | `string` | No | `undefined` | Hint text shown below the input (hidden when `error` is present). |
| `id` | `string` | No | Auto-generated | HTML `id` for the input. Generated randomly if not provided. |
| `className` | `string` | No | `undefined` | Additional CSS classes for the `<input>` element. |
| ...rest | `InputHTMLAttributes<HTMLInputElement>` | -- | -- | All standard HTML input attributes (`placeholder`, `type`, `required`, `onChange`, etc.) are forwarded. |

#### Usage

```tsx
import { Input } from '@/components/ui/Input';

// With label and placeholder
<Input
  label="Email Address"
  type="email"
  placeholder="you@example.com"
/>

// With validation error
<Input
  label="Wallet Address"
  value={address}
  onChange={(e) => setAddress(e.target.value)}
  error={addressError}
/>

// With helper text
<Input
  label="Display Name"
  helperText="This will be visible to other users."
/>
```

#### Accessibility

- The `<label>` is linked to the input through a shared `id`/`htmlFor` pair.
- `aria-invalid="true"` is set when `error` is provided.
- `aria-describedby` connects the input to the error and/or helper text elements so screen readers announce them.
- Error messages use `role="alert"` for immediate screen reader announcement.
- Minimum height of 44px (`min-h-[44px]`) meets touch target requirements.

---

### Modal

**Import:** `import { Modal } from '@/components/ui/Modal';`

A dialog overlay with backdrop, focus trapping, escape-to-close, and scroll locking. This is a client component (`'use client'`).

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isOpen` | `boolean` | Yes | -- | Controls visibility. When `false`, the component renders `null`. |
| `onClose` | `() => void` | Yes | -- | Called when the user clicks the backdrop, presses Escape, or clicks the close button. |
| `title` | `string` | No | `undefined` | Displayed in a header bar with a close button. When omitted, a floating close button appears in the top-right corner. |
| `children` | `ReactNode` | Yes | -- | Modal body content, rendered inside a `p-6` container. |
| `className` | `string` | No | `undefined` | Additional CSS classes for the modal panel (the white box, not the backdrop). |

#### Usage

```tsx
import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

function ConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Delete Collection</Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirm Deletion"
      >
        <p className="text-gray-600 mb-4">
          This action cannot be undone. Are you sure?
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => handleDelete()}>Delete</Button>
        </div>
      </Modal>
    </>
  );
}
```

#### Accessibility

- `role="dialog"` and `aria-modal="true"` on the container.
- `aria-labelledby="modal-title"` when a `title` is provided.
- Close button has `aria-label="Close modal"`.
- Escape key closes the modal.
- Focus moves into the modal on open, and returns to the previously focused element on close.
- Body scroll is locked while the modal is open (`document.body.style.overflow = 'hidden'`).
- The backdrop has `aria-hidden="true"` so it is not announced by screen readers.

---

### LoadingSpinner and PageLoading

**Import:** `import { LoadingSpinner, PageLoading } from '@/components/ui/LoadingSpinner';`

Two loading indicators. `LoadingSpinner` is a compact inline spinner. `PageLoading` is a full-section centered spinner with a text message, used as a page-level placeholder.

#### LoadingSpinner Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `size` | `'sm' \| 'md' \| 'lg'` | No | `'md'` | Spinner dimensions: `sm` = 16px, `md` = 32px, `lg` = 48px. |
| `className` | `string` | No | `undefined` | Additional CSS classes for the wrapper `<div>`. |

#### PageLoading Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `message` | `string` | No | `'Loading...'` | Text displayed below the spinner. |

#### Usage

```tsx
import { LoadingSpinner, PageLoading } from '@/components/ui/LoadingSpinner';

// Inline spinner next to a label
<div className="flex items-center gap-2">
  <LoadingSpinner size="sm" />
  <span>Saving...</span>
</div>

// Full-page loading state
<PageLoading message="Fetching your collections..." />
```

#### Accessibility

- The wrapper `<div>` has `role="status"` and `aria-label="Loading"`.
- The SVG has `aria-hidden="true"` because it is decorative.
- A visually hidden `<span className="sr-only">Loading...</span>` provides a screen reader announcement.

---

### Toast and ToastContainer

**Import:** `import { Toast, ToastContainer } from '@/components/ui/Toast';`

Notification banners that appear in the bottom-right corner. `Toast` renders a single notification. `ToastContainer` manages a stack of multiple toasts. Both are client components.

#### Toast Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `message` | `string` | Yes | -- | The notification text. |
| `type` | `'success' \| 'error' \| 'warning' \| 'info'` | No | `'info'` | Controls the icon, background color, and border color. |
| `duration` | `number` | No | `5000` | Milliseconds before auto-dismiss. Set to `0` to disable auto-dismiss. |
| `onClose` | `() => void` | Yes | -- | Called when the toast is dismissed (by timer or user click). |

#### ToastContainer Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `toasts` | `ToastItem[]` | Yes | -- | Array of `{ id: string; message: string; type: ToastType }` objects. |
| `onRemove` | `(id: string) => void` | Yes | -- | Called with the toast `id` when a toast should be removed from the array. |

#### Type Styles

| Type | Background | Border | Icon |
|------|-----------|--------|------|
| `success` | Green | Green | CheckCircle |
| `error` | Red | Red | AlertCircle |
| `warning` | Yellow | Yellow | AlertTriangle |
| `info` | Blue | Blue | Info |

#### Usage

```tsx
import { useState } from 'react';
import { Toast, ToastContainer, type ToastType } from '@/components/ui/Toast';

// Single toast
<Toast
  message="Collection created successfully!"
  type="success"
  onClose={() => setShowToast(false)}
/>

// Managing multiple toasts
function App() {
  const [toasts, setToasts] = useState<
    { id: string; message: string; type: ToastType }[]
  >([]);

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <>
      <button onClick={() => addToast('Saved!', 'success')}>Save</button>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}
```

#### Accessibility

- Each toast has `role="alert"` and `aria-live="polite"` for screen reader announcements.
- The dismiss button has `aria-label="Dismiss notification"`.
- Icons have `aria-hidden="true"`.
- The toast animates in with a slide-up transition (`translate-y-0 opacity-100`) and animates out before calling `onClose`.

---

## Auth Components

### AuthGuard

**Import:** `import { AuthGuard } from '@/components/auth/AuthGuard';`

A wrapper component that gates content behind wallet authentication and SIWE (Sign-In with Ethereum). It handles three distinct states and renders appropriate UI for each. This is a client component.

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `children` | `ReactNode` | Yes | -- | Content to render when the user is fully authenticated. |
| `fallback` | `ReactNode` | No | `undefined` | Custom UI to show when the user is not logged in (replaces the default sign-in prompt). |
| `redirectTo` | `string` | No | `undefined` | URL to redirect to instead of showing a sign-in prompt. Takes priority over `fallback`. |

#### State Behavior

| State | What Renders |
|-------|-------------|
| **Loading** | `<PageLoading message="Checking authentication..." />` -- a centered spinner. |
| **Not connected** (no wallet) | Centered heading "Authentication Required" with a `<SignInButton />`. |
| **Wallet connected, not signed in** | Heading "Complete Sign-In" showing the truncated wallet address, with a `<SignInButton />` prompting the user to sign the SIWE message. |
| **Redirect specified** (not logged in) | `<PageLoading message="Redirecting..." />` while `router.push(redirectTo)` executes. |
| **Custom fallback** (not logged in) | Your `fallback` ReactNode. |
| **Authenticated** | Your `children`. |

#### Usage

```tsx
import { AuthGuard } from '@/components/auth/AuthGuard';

// Wrap an entire page
export default function ProfilePage() {
  return (
    <AuthGuard>
      <h1>Your Profile</h1>
      {/* only renders when authenticated */}
    </AuthGuard>
  );
}

// With redirect
<AuthGuard redirectTo="/login">
  <DashboardContent />
</AuthGuard>

// With custom fallback
<AuthGuard fallback={<p>Please sign in to view this content.</p>}>
  <ProtectedContent />
</AuthGuard>
```

#### Dependencies

- `useAuth()` hook from `@/hooks/useAuth` (provides `isLoggedIn`, `isLoading`, `isWalletConnected`, `walletAddress`).
- `SignInButton` from `@/components/auth/SignInButton`.

---

## Wallet Components

### TransactionButtonWrapper

**Import:** `import { TransactionButtonWrapper } from '@/components/wallet/TransactionButton';`

A wrapper around the OnchainKit `Transaction` component that provides a consistent interface for submitting on-chain transactions. It handles transaction lifecycle status, sponsored transactions, and success/error callbacks. This is a client component.

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `calls` | `ContractFunctionParameters[]` | Yes | -- | Array of contract call parameters (from `viem`). Each object specifies the contract address, ABI, function name, and arguments. |
| `onSuccess` | `(txHash: string) => void` | No | `undefined` | Called with the transaction hash when the transaction succeeds. |
| `onError` | `(error: Error) => void` | No | `undefined` | Called with an `Error` object when the transaction fails. |
| `buttonText` | `string` | No | `'Submit Transaction'` | Label displayed on the button. |
| `disabled` | `boolean` | No | `false` | Disables the transaction button. |
| `className` | `string` | No | `undefined` | Additional CSS classes for the button. |

#### What It Renders

The component composes several OnchainKit subcomponents:

1. `<TransactionButton>` -- the clickable submit button.
2. `<TransactionSponsor>` -- enables gas sponsorship (Paymaster) when configured.
3. `<TransactionStatus>` -- shows the current status label and an action link (e.g., "View on Explorer").

#### Usage

```tsx
import { TransactionButtonWrapper } from '@/components/wallet/TransactionButton';
import { parseAbi } from 'viem';

const calls = [
  {
    address: '0xYourContractAddress' as `0x${string}`,
    abi: parseAbi(['function mint(address to, uint256 quantity)']),
    functionName: 'mint',
    args: [userAddress, 1n],
  },
];

<TransactionButtonWrapper
  calls={calls}
  buttonText="Mint NFT"
  onSuccess={(txHash) => {
    console.log('Minted:', txHash);
  }}
  onError={(error) => {
    console.error('Mint failed:', error.message);
  }}
/>
```

#### Dependencies

- `@coinbase/onchainkit/transaction` -- provides the `Transaction`, `TransactionButton`, `TransactionSponsor`, and `TransactionStatus` components.
- `CHAIN` from `@/lib/tokens` -- the target chain configuration.

---

## NFT Components

These live in `components/nft/` and handle NFT display, minting, and collection browsing. They depend on types from `@/types/nft`.

### Key Types

Before using NFT components, you should be aware of these shared types defined in `types/nft.ts`:

```ts
type NFTProvider = 'onchainkit' | 'zora_protocol' | 'zora_coins';
type TokenStandard = 'erc721' | 'erc1155' | 'erc20';
type MintStatus = 'pending' | 'confirmed' | 'failed';
```

See `types/nft.ts` for the full `NFTCollection`, `NFTToken`, and `NFTMetadata` interfaces.

---

### NFTDisplay

**Import:** `import { NFTDisplay } from '@/components/nft/NFTDisplay';`

Renders an NFT card with image, name, description, and metadata badges. Fetches metadata from the chain via the `useNFTMetadata` hook. This is a client component.

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `collection` | `NFTCollection` | Yes | -- | The collection object. Used to resolve the contract address, provider, and fallback display values. |
| `token` | `NFTToken` | No | `undefined` | A specific token within the collection. When provided, its name/description/image take priority over collection-level values. |
| `className` | `string` | No | `undefined` | Additional CSS classes for the outer card container. |

#### What It Renders

- **Loading state:** A centered `LoadingSpinner` inside a bordered card.
- **Image:** Aspect-square container with `next/image` (or a gray placeholder with "NFT" text when no image URL is available).
- **Name and description:** Below the image, with `line-clamp-2` on the description.
- **Badges:** Provider name and token standard (e.g., "ERC-721") displayed as colored pills.

#### Usage

```tsx
import { NFTDisplay } from '@/components/nft/NFTDisplay';

<NFTDisplay collection={myCollection} />

// With a specific token
<NFTDisplay collection={myCollection} token={selectedToken} />
```

---

### NFTMintButton

**Import:** `import { NFTMintButton } from '@/components/nft/NFTMintButton';`

A mint action button that manages the full mint lifecycle: idle, pending, confirmed, and failed. Uses the `useNFTMint` hook internally. This is a client component.

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `collectionId` | `string` | Yes | -- | The ID of the collection to mint from. |
| `tokenId` | `string` | No | `undefined` | Specific token ID within the collection (for ERC-1155). |
| `quantity` | `number` | No | `1` | Number of tokens to mint. When greater than 1, the count is shown on the button label. |
| `buttonText` | `string` | No | `'Mint'` | Label on the button in idle state. |
| `className` | `string` | No | `undefined` | Additional CSS classes for the wrapper. |
| `onSuccess` | `(txHash: string) => void` | No | `undefined` | Called with the transaction hash after a successful mint. |
| `onError` | `(error: string) => void` | No | `undefined` | Called with an error message after a failed mint. |

#### State Behavior

| State | What Renders |
|-------|-------------|
| **Idle** | A `<Button>` with the `buttonText` label. |
| **Pending / Confirmed / Failed** | A `<MintStatus>` component showing progress, success, or error. |
| **After confirmed** | A "Mint Another" outline button that resets to idle. |
| **After failed** | A "Try Again" outline button that resets to idle. |

#### Usage

```tsx
import { NFTMintButton } from '@/components/nft/NFTMintButton';

<NFTMintButton
  collectionId="clx1234..."
  buttonText="Mint for Free"
  onSuccess={(hash) => console.log('TX:', hash)}
  onError={(err) => console.error(err)}
/>

// Mint multiple
<NFTMintButton collectionId="clx1234..." quantity={3} />
```

---

### NFTCollectionCard

**Import:** `import { NFTCollectionCard } from '@/components/nft/NFTCollectionCard';`

A clickable card that displays a collection's image, name, description, and metadata badges. Used inside `NFTGrid` and on listing pages. This is a client component.

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `collection` | `NFTCollection` | Yes | -- | The collection data to display. |
| `onClick` | `() => void` | No | `undefined` | Click handler. When provided, the card gets `role="button"`, `tabIndex={0}`, and Enter key support. |
| `className` | `string` | No | `undefined` | Additional CSS classes for the outer container. |

#### What It Renders

- **Image area:** Aspect-video container with `next/image` or a gradient placeholder.
- **Text:** Collection name (truncated) and description (`line-clamp-2`).
- **Badges:** Provider name and token standard.
- **Hover effect:** Subtle shadow elevation on hover.

#### Usage

```tsx
import { NFTCollectionCard } from '@/components/nft/NFTCollectionCard';

<NFTCollectionCard
  collection={collection}
  onClick={() => router.push(`/collections/${collection.id}`)}
/>
```

#### Accessibility

- When `onClick` is provided, the card receives `role="button"` and `tabIndex={0}`.
- Enter key triggers the `onClick` handler via `onKeyDown`.
- When `onClick` is not provided, the card is a static display element with no interactive ARIA attributes.

---

### NFTGrid

**Import:** `import { NFTGrid } from '@/components/nft/NFTGrid';`

A responsive grid of `NFTCollectionCard` components. Fetches all collections via the `useNFTCollections` hook and handles loading, error, and empty states. This is a client component.

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `onCollectionClick` | `(collectionId: string) => void` | No | `undefined` | Called with the collection ID when a card is clicked. When not provided, cards are not interactive. |
| `className` | `string` | No | `undefined` | Additional CSS classes for the grid container. |

#### What It Renders

| State | Output |
|-------|--------|
| **Loading** | Centered large `LoadingSpinner`. |
| **Error** | Red error message with the error text. |
| **Empty** | Gray text "No NFT collections available." |
| **Collections loaded** | Responsive grid: 1 column on mobile, 2 on `sm`, 3 on `lg`. |

#### Usage

```tsx
import { NFTGrid } from '@/components/nft/NFTGrid';

// Browseable grid with navigation
<NFTGrid onCollectionClick={(id) => router.push(`/mint/${id}`)} />

// Static display grid
<NFTGrid />
```

---

### MintStatus

**Import:** `import { MintStatus } from '@/components/nft/MintStatus';`

Displays the current state of a mint transaction. Typically used inside `NFTMintButton`, but you can also use it standalone. This is a client component.

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `status` | `'idle' \| 'pending' \| 'confirmed' \| 'failed'` | Yes | -- | Current mint state. Returns `null` when `'idle'`. |
| `txHash` | `string` | No | `undefined` | Transaction hash, shown as a link to BaseScan when the status is `'confirmed'`. |
| `error` | `string \| null` | No | `undefined` | Error message displayed when the status is `'failed'`. |

#### State Rendering

| Status | Appearance |
|--------|-----------|
| `idle` | Renders nothing (`null`). |
| `pending` | Yellow banner with spinner: "Minting in progress..." / "Please confirm the transaction in your wallet." |
| `confirmed` | Green banner: "Mint successful!" with a "View transaction" link to `https://basescan.org/tx/{txHash}`. |
| `failed` | Red banner: "Mint failed" with the error message below. |

#### Usage

```tsx
import { MintStatus } from '@/components/nft/MintStatus';

<MintStatus status="pending" />
<MintStatus status="confirmed" txHash="0xabc123..." />
<MintStatus status="failed" error="Insufficient funds" />
```

---

## Admin Components

These live in `components/admin/` and are used on the `/admin` pages. Most require admin-level authentication.

---

### AdminGuard

**Import:** `import { AdminGuard } from '@/components/admin/AdminGuard';`

A two-layer guard that first checks wallet authentication (via `AuthGuard`) and then checks admin role permissions (via the `useAdmin` hook). This is a client component.

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `children` | `ReactNode` | Yes | -- | Content to render when the user has the required admin role. |
| `requireSuperAdmin` | `boolean` | No | `false` | When `true`, requires `superadmin` role instead of `admin`. |

#### State Behavior

| State | What Renders |
|-------|-------------|
| **Not authenticated** | Delegates to `AuthGuard` (shows sign-in prompt or redirect). |
| **Auth loading** | `<PageLoading message="Checking authentication..." />` |
| **Role loading** | `<PageLoading message="Checking permissions..." />` |
| **Not admin** | "Access Denied -- Admin access is required for this page." |
| **Not super admin** (when `requireSuperAdmin` is `true`) | "Access Denied -- Super admin access is required for this page." |
| **Authorized** | Your `children`. |

#### Usage

```tsx
import { AdminGuard } from '@/components/admin/AdminGuard';

// Standard admin page
export default function AdminDashboard() {
  return (
    <AdminGuard>
      <h1>Dashboard</h1>
      {/* admin content */}
    </AdminGuard>
  );
}

// Super admin only
export default function UserManagementPage() {
  return (
    <AdminGuard requireSuperAdmin>
      <UserManagement users={users} onUpdateRole={handleRoleUpdate} />
    </AdminGuard>
  );
}
```

---

### AdminNav

**Import:** `import { AdminNav } from '@/components/admin/AdminNav';`

A sidebar navigation component for the admin area. Automatically shows additional nav items for super admins. This is a client component.

#### Props

This component takes no props. It reads the current pathname from `usePathname()` and admin role from `useAdmin()`.

#### Navigation Items

| Route | Label | Visible To |
|-------|-------|-----------|
| `/admin` | Dashboard | All admins |
| `/admin/collections` | Collections | All admins |
| `/admin/settings` | Settings | All admins |
| `/admin/users` | Users | Super admins only |

#### Usage

```tsx
import { AdminNav } from '@/components/admin/AdminNav';
import { AdminGuard } from '@/components/admin/AdminGuard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="flex min-h-screen">
        <AdminNav />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </AdminGuard>
  );
}
```

#### Accessibility

- The `<nav>` element has `aria-label="Admin navigation"`.
- Active link is visually distinguished with a blue background (`bg-blue-100 text-blue-800`).
- All nav links meet the 44px minimum touch target (`min-h-[44px]`).

---

### StatCard

**Import:** `import { StatCard } from '@/components/admin/StatCard';`

A simple metric display card with a label and value. This is a client component.

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `label` | `string` | Yes | -- | Metric label (e.g., "Total Mints"). Rendered in small gray text. |
| `value` | `string \| number` | Yes | -- | Metric value. Rendered in large bold text. |
| `className` | `string` | No | `undefined` | Additional CSS classes for the card container. |

#### Usage

```tsx
import { StatCard } from '@/components/admin/StatCard';

<StatCard label="Total Mints" value={1234} />
<StatCard label="Revenue" value="$12,345" />

// In a grid
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
  <StatCard label="Total Mints" value={stats.totalMints} />
  <StatCard label="Unique Minters" value={stats.uniqueMinters} />
  <StatCard label="Total Quantity" value={stats.totalQuantity} />
</div>
```

---

### CollectionForm

**Import:** `import { CollectionForm } from '@/components/admin/CollectionForm';`

A form for creating or editing NFT collections. Includes fields for name, description, provider, contract address, chain, token standard, images, and provider-specific configuration. This is a client component.

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `initialData` | `Partial<CollectionFormData>` | No | `undefined` | Pre-fills the form for editing an existing collection. |
| `onSubmit` | `(data: CollectionFormData) => Promise<void>` | Yes | -- | Called with the complete form data when the user submits. |
| `isLoading` | `boolean` | No | `false` | Shows a loading spinner on the submit button and disables it. |
| `submitLabel` | `string` | No | `'Create Collection'` | Label for the submit button. |

#### CollectionFormData Shape

```ts
interface CollectionFormData {
  name: string;
  description: string;
  provider: NFTProvider;          // 'onchainkit' | 'zora_protocol' | 'zora_coins'
  contractAddress: string;
  chainId: number;                // 8453 (Base Mainnet) or 84532 (Base Sepolia)
  tokenStandard: TokenStandard | '';
  imageUrl: string;
  externalUrl: string;
  providerConfig: Record<string, unknown>;
}
```

#### Provider-Specific Fields

The form conditionally shows extra fields based on the selected provider:

| Provider | Extra Field | Description |
|----------|------------|-------------|
| `zora_protocol` | Mint Referral Address | `0x` address for the mint referral. |
| `zora_coins` | Starting Market Cap | Dropdown: `LOW` or `HIGH`. |

#### Usage

```tsx
import { CollectionForm } from '@/components/admin/CollectionForm';

// Create mode
<CollectionForm
  onSubmit={async (data) => {
    await fetch('/api/admin/collections', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }}
/>

// Edit mode
<CollectionForm
  initialData={existingCollection}
  onSubmit={async (data) => {
    await fetch(`/api/admin/collections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }}
  submitLabel="Update Collection"
  isLoading={isSaving}
/>
```

---

### CollectionList

**Import:** `import { CollectionList } from '@/components/admin/CollectionList';`

A table listing all NFT collections with their provider, token standard, active status, and an edit link. This is a client component.

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `collections` | `NFTCollection[]` | Yes | -- | Array of collection objects to display. |
| `onToggleActive` | `(id: string, isActive: boolean) => void` | No | `undefined` | Called when the active/inactive status badge is clicked. |
| `className` | `string` | No | `undefined` | Additional CSS classes for the table container. |

#### What It Renders

- **Empty state:** A card with "No collections yet." and a link to create the first collection.
- **Populated:** A table with columns: Name (with contract address), Provider, Standard, Status (toggle button), and Actions (edit link).

#### Usage

```tsx
import { CollectionList } from '@/components/admin/CollectionList';

<CollectionList
  collections={collections}
  onToggleActive={async (id, isActive) => {
    await fetch(`/api/admin/collections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
    refreshCollections();
  }}
/>
```

---

### MintAnalytics

**Import:** `import { MintAnalytics } from '@/components/admin/MintAnalytics';`

A row of `StatCard` components showing mint statistics. This is a client component.

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `totalMints` | `number` | Yes | -- | Total number of mint transactions. |
| `totalQuantity` | `number` | Yes | -- | Total quantity of tokens minted across all transactions. |
| `uniqueMinters` | `number` | Yes | -- | Count of unique minter wallet addresses. |
| `className` | `string` | No | `undefined` | Additional CSS classes for the grid container. |

#### Usage

```tsx
import { MintAnalytics } from '@/components/admin/MintAnalytics';

<MintAnalytics
  totalMints={stats.totalMints}
  totalQuantity={stats.totalQuantity}
  uniqueMinters={stats.uniqueMinters}
/>
```

---

### MintActivityFeed

**Import:** `import { MintActivityFeed } from '@/components/admin/MintActivityFeed';`

A feed showing the 10 most recent mint events with minter address, date, provider, quantity, status badge, and a transaction link. This is a client component.

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `mints` | `MintActivity[]` | Yes | -- | Array of mint activity records. Only the first 10 are displayed. |
| `className` | `string` | No | `undefined` | Additional CSS classes for the container. |

#### MintActivity Shape

```ts
interface MintActivity {
  id: string;
  minterAddress: string;
  quantity: number;
  txHash: string | null;
  provider: string;
  status: string;             // 'pending' | 'confirmed' | 'failed'
  createdAt: string;          // ISO date string
}
```

#### Usage

```tsx
import { MintActivityFeed } from '@/components/admin/MintActivityFeed';

<MintActivityFeed mints={recentMints} />
```

#### What It Renders

- **Empty state:** "No mint activity yet."
- **Populated:** A list of rows showing truncated minter address (`0x1234...abcd`), date, provider, quantity (`x3`), a colored status badge, and a "tx" link to BaseScan for confirmed transactions.

---

### SettingsPanel

**Import:** `import { SettingsPanel } from '@/components/admin/SettingsPanel';`

An editable key-value settings display. Each setting shows its key, description, and current JSON value. Clicking "Edit" opens an inline textarea for modifying the value. This is a client component.

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `settings` | `AppSetting[]` | Yes | -- | Array of setting objects from `@/types/admin`. |
| `onSave` | `(key: string, value: unknown) => Promise<void>` | Yes | -- | Called with the setting key and parsed JSON value when the user saves. |
| `className` | `string` | No | `undefined` | Additional CSS classes for the container. |

#### AppSetting Shape

```ts
interface AppSetting {
  id: string;
  key: string;
  value: unknown;
  description?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### Usage

```tsx
import { SettingsPanel } from '@/components/admin/SettingsPanel';

<SettingsPanel
  settings={appSettings}
  onSave={async (key, value) => {
    await fetch('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify({ key, value }),
    });
    refreshSettings();
  }}
/>
```

---

### UserManagement

**Import:** `import { UserManagement } from '@/components/admin/UserManagement';`

A table of users with inline role editing via dropdown. Typically protected behind `AdminGuard` with `requireSuperAdmin`. This is a client component.

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `users` | `UserWithRole[]` | Yes | -- | Array of user objects from `@/types/admin`. |
| `onUpdateRole` | `(address: string, role: UserRole) => Promise<void>` | Yes | -- | Called with the user's wallet address and the new role when the dropdown changes. |
| `className` | `string` | No | `undefined` | Additional CSS classes for the table container. |

#### UserWithRole Shape

```ts
type UserRole = 'user' | 'admin' | 'superadmin';

interface UserWithRole {
  id: string;
  address: string;
  username?: string;
  avatarUrl?: string;
  role: UserRole;
  createdAt: string;
  lastSeenAt: string;
}
```

#### Table Columns

| Column | Content |
|--------|---------|
| Address | Truncated wallet address (`0x1234...abcd`). |
| Username | Display name or `-`. |
| Role | Dropdown with `user`, `admin`, `superadmin` options. Disabled while saving. |
| Last Seen | Formatted date. |

#### Usage

```tsx
import { UserManagement } from '@/components/admin/UserManagement';
import { AdminGuard } from '@/components/admin/AdminGuard';

export default function UsersPage() {
  return (
    <AdminGuard requireSuperAdmin>
      <UserManagement
        users={users}
        onUpdateRole={async (address, role) => {
          await fetch('/api/admin/users/role', {
            method: 'PUT',
            body: JSON.stringify({ address, role }),
          });
          refreshUsers();
        }}
      />
    </AdminGuard>
  );
}
```

---

## Design System

### Tailwind Configuration

The project uses a minimal Tailwind config defined in `tailwind.config.ts`. It extends the default Tailwind theme with two custom brand colors:

```ts
theme: {
  extend: {
    colors: {
      brand: {
        primary: '#0052FF',    // Coinbase blue
        secondary: '#1a1a3e',  // Dark navy
      },
    },
  },
},
```

**Content paths:** The config scans `./pages/`, `./components/`, and `./app/` for class names.

**Plugins:** None are included by default. Add Tailwind plugins in the `plugins` array as needed.

All other values (spacing, breakpoints, fonts, colors) use Tailwind's defaults:

| Token | Values |
|-------|--------|
| **Breakpoints** | `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`, `2xl: 1536px` |
| **Font families** | System font stack (Tailwind default sans) |
| **Border radius** | Primarily `rounded-lg` (8px) and `rounded-xl` (12px) across components |

### Spacing Conventions

The template follows consistent spacing patterns across all components:

| Context | Pattern |
|---------|---------|
| Card padding | `p-4` or `p-6` |
| Section gaps | `gap-4` or `gap-6` |
| Form field spacing | `space-y-6` |
| Inline element gaps | `gap-2` or `gap-3` |
| Page section margins | `py-12` for empty states, `min-h-[50vh]` for centered layouts |

### Touch Target Requirements

All interactive elements meet the WCAG 2.5.5 minimum touch target of **44 x 44 CSS pixels**:

- `Button` (`md` and `lg` sizes): `min-h-[44px]`
- `Input`: `min-h-[44px]`
- `AdminNav` links: `min-h-[44px]`
- `CollectionList` status toggle: `min-h-[44px]`
- `UserManagement` role dropdown: `min-h-[44px]`
- Select elements in `CollectionForm`: `min-h-[44px]`

The `Button` `sm` size has `min-h-[32px]` and should only be used for secondary inline actions (e.g., "Edit", "Cancel") that are not the primary action on the page.

### Accessibility Standards

The template targets **WCAG 2.1 Level AA** compliance. Here is a summary of the patterns used across components:

| Requirement | Implementation |
|------------|---------------|
| **Focus visibility** | All interactive elements have `focus:ring-2` with a visible offset ring. |
| **Color contrast** | Text colors follow Tailwind's defaults, which meet AA contrast ratios against white backgrounds. |
| **ARIA roles** | `role="dialog"` on modals, `role="alert"` on errors and toasts, `role="status"` on spinners, `role="button"` on clickable cards. |
| **ARIA labels** | Close buttons use `aria-label`, nav elements use `aria-label`, form inputs use `aria-describedby`. |
| **ARIA state** | `aria-invalid` on inputs with errors, `aria-modal` on modals, `aria-hidden` on decorative elements. |
| **Keyboard navigation** | Escape closes modals, Enter activates card buttons, focus trapping in modals. |
| **Screen reader text** | `sr-only` class used for visually hidden but announced text (e.g., "Loading..."). |
| **Live regions** | `aria-live="polite"` on toasts for non-intrusive announcements. |

### Common Layout Patterns

#### Card Layout

Most data display uses the card pattern: white background, rounded corners, subtle border.

```tsx
<div className="bg-white rounded-xl border border-gray-200 p-6">
  <h3 className="font-semibold text-gray-900 mb-4">Card Title</h3>
  <p className="text-gray-600">Card content here.</p>
</div>
```

#### Form Layout

Forms use vertical stacking with consistent label/input/error structure.

```tsx
<form className="space-y-6 max-w-2xl">
  <div>
    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
      Name *
    </label>
    <Input id="name" required />
  </div>

  <div className="grid grid-cols-2 gap-4">
    {/* Side-by-side fields */}
  </div>

  <Button type="submit">Save</Button>
</form>
```

#### Table Layout

Admin tables use a consistent bordered container with a gray header row.

```tsx
<div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
  <table className="w-full">
    <thead>
      <tr className="border-b border-gray-200 bg-gray-50">
        <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Column</th>
      </tr>
    </thead>
    <tbody>
      <tr className="border-b border-gray-100 last:border-0">
        <td className="px-4 py-3 text-sm text-gray-600">Value</td>
      </tr>
    </tbody>
  </table>
</div>
```

#### Responsive Grid

Collection and card grids use a progressive column layout.

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Cards */}
</div>
```

#### Centered Empty/Loading State

Used for page-level loading and empty states.

```tsx
<div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
  <LoadingSpinner size="lg" />
  <p className="text-gray-500 text-sm">Loading...</p>
</div>
```

---

## Adding New Components

Follow these patterns to keep your components consistent with the rest of the template.

### File Location

| Component Type | Directory |
|---------------|-----------|
| General-purpose UI primitives | `components/ui/` |
| Authentication-related | `components/auth/` |
| Wallet/transaction-related | `components/wallet/` |
| NFT-specific | `components/nft/` |
| Admin-only | `components/admin/` |

### Component Pattern

Use this checklist when creating a new component:

1. **Use `forwardRef` for leaf-level interactive elements** (buttons, inputs, links) so consumers can attach refs.
2. **Declare an explicit props interface** with JSDoc or clear naming. Extend standard HTML attributes where appropriate (e.g., `ButtonHTMLAttributes<HTMLButtonElement>`).
3. **Use named exports**, not default exports.
4. **Set `displayName`** on `forwardRef` components so React DevTools show a readable name.
5. **Use explicit return types** (`React.ReactElement`, `ReactNode`, or `null`).
6. **Mark client components** with `'use client';` at the top of the file when they use hooks, browser APIs, or event handlers.

### Example Skeleton

```tsx
'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
  size?: 'sm' | 'md';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, size = 'md', className, ...props }, ref) => {
    const sizes = {
      sm: 'w-8 h-8',
      md: 'w-11 h-11', // 44px touch target
    };

    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-lg
          hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          transition-colors ${sizes[size]} ${className || ''}`}
        aria-label={label}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
```

### Accessibility Checklist for New Components

- [ ] Interactive elements have a minimum 44px touch target (use `min-h-[44px]` or equivalent).
- [ ] Focus is visible with a ring (`focus:ring-2 focus:ring-offset-2`).
- [ ] Decorative elements (icons, spinners) have `aria-hidden="true"`.
- [ ] Form inputs are linked to labels via `id`/`htmlFor`.
- [ ] Error messages use `role="alert"` and are connected to inputs via `aria-describedby`.
- [ ] Modal-like components trap focus and support Escape to close.
- [ ] Dynamic status messages use `aria-live="polite"` or `role="status"`.
- [ ] Clickable non-button elements have `role="button"`, `tabIndex={0}`, and keyboard event handlers.
