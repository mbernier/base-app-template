# NFT Abstraction Layer

The NFT abstraction layer lets you mint, create, and query NFTs across multiple providers without coupling your application code to any single SDK. You configure collections with a provider name, and the abstraction layer routes every operation -- minting, metadata retrieval, collection creation -- through the correct provider implementation automatically.

This means you can support OnchainKit ERC-721/1155 contracts, Zora Protocol 1155 editions, and Zora Coins (ERC-20 bonding curve tokens) side by side. Switching a collection from one provider to another is a configuration change, not a code change.

---

## Architecture

The layer follows the **Strategy pattern** with three components:

```
INFTProvider (interface)        # Contract every provider must fulfill
    |
    |--- OnchainKitProvider     # Raw ERC-721/1155 mint calls
    |--- ZoraProtocolProvider   # @zoralabs/protocol-sdk for 721/1155
    |--- ZoraCoinsProvider      # @zoralabs/coins-sdk for ERC-20 coins
    |
NFTProviderRegistry             # Lazy-singleton map of provider instances
    |
Public Facade (lib/nft/index)   # High-level functions for the rest of the app
```

### INFTProvider Interface

Every provider implements `INFTProvider` (defined in `lib/nft/types.ts`):

```typescript
export interface INFTProvider {
  readonly providerType: NFTProvider;

  getTokenMetadata(
    contractAddress: Address,
    tokenId?: string
  ): Promise<NFTMetadata>;

  buildMintTransaction(params: ProviderMintParams): Promise<MintTransactionData>;

  buildCreateCollectionTransaction?(
    params: ProviderCreateParams
  ): Promise<MintTransactionData>;

  validateConfig(config: Record<string, unknown>): boolean;
}
```

| Method | Required | Purpose |
|---|---|---|
| `getTokenMetadata` | Yes | Return normalized `NFTMetadata` for any token |
| `buildMintTransaction` | Yes | Return `MintTransactionData` (contract calls) the client executes via wagmi |
| `buildCreateCollectionTransaction` | No | Build a deploy/create transaction. Not all providers support this. |
| `validateConfig` | Yes | Validate provider-specific config stored on a collection record |

### Provider Registry

`lib/nft/registry.ts` maintains a `Map<NFTProvider, INFTProvider>` that lazy-instantiates providers on first access:

```typescript
import { getProvider, getAllProviderTypes } from '@/lib/nft/registry';

const provider = getProvider('zora_protocol'); // creates once, returns cached
const allTypes = getAllProviderTypes();         // ['onchainkit', 'zora_protocol', 'zora_coins']
```

### Public Facade

`lib/nft/index.ts` exports high-level functions that the API routes call. These functions look up the collection record in the database, resolve the provider, and delegate:

- `getTokenMetadata(contractAddress, tokenId?, provider?)` -- fetches normalized metadata
- `buildMintTransaction({ collectionId, tokenId?, minterAddress, quantity? })` -- looks up the collection, validates it is active, builds tx data
- `buildCreateCollectionTransaction(providerType, params)` -- builds a deploy transaction for providers that support it

---

## Provider Comparison

| Feature | OnchainKit | Zora Protocol | Zora Coins |
|---|---|---|---|
| **Token standard** | ERC-721, ERC-1155 | ERC-721, ERC-1155 | ERC-20 |
| **SDK** | Raw ABI calls | `@zoralabs/protocol-sdk` | `@zoralabs/coins-sdk` |
| **Collection creation** | No (external) | Yes (`create1155`) | Yes (`createCoinCall`) |
| **Mint mechanism** | Direct `mint()` / `safeTransferFrom()` | Protocol SDK `mint()` | Buy on bonding curve (`createTradeCall`) |
| **Referral support** | No | `createReferral`, `mintReferral` | `platformReferrer` |
| **Pricing** | Free or contract-defined | Protocol-defined | Bonding curve (ETH in) |
| **Best for** | Simple ERC-721/1155 public mints | Zora ecosystem editions | Social/fungible token launches |

---

## Provider-Specific Configuration

Each collection record stores a `providerConfig` JSON object whose shape depends on the provider. The types are defined in `types/nft.ts`.

### OnchainKitConfig

```typescript
interface OnchainKitConfig {
  tokenId?: string;  // For ERC-1155 mints
}
```

Minimal config. If `tokenId` is present, the provider builds an ERC-1155 `safeTransferFrom` call. Otherwise, it builds ERC-721 `mint` calls (one per quantity).

### ZoraProtocolConfig

```typescript
interface ZoraProtocolConfig {
  createReferral?: string;   // Address that earns create referral rewards
  mintReferral?: string;     // Address that earns mint referral rewards
  salesConfig?: Record<string, unknown>;
}
```

Referral addresses are wired into the Zora Protocol SDK calls automatically. The provider also reads global referral addresses from environment variables (see the Referral Configuration section below).

### ZoraCoinsConfig

```typescript
interface ZoraCoinsConfig {
  platformReferrer?: string;    // Platform referrer address
  initialPurchaseWei?: string;  // Initial buy amount in wei
}
```

When creating a Zora Coin, you can also set `startingMarketCap` to `'LOW'` or `'HIGH'` via the `providerConfig`.

---

## Mint Flow End-to-End

Minting follows a four-step flow that keeps transaction building on the server and transaction signing on the client.

```
Client (useNFTMint)          Server (API routes)          Blockchain
       |                            |                          |
       |-- POST /mint/prepare ----->|                          |
       |                            |-- buildMintTransaction() |
       |                            |   (resolve provider,     |
       |                            |    build contract calls)  |
       |<--- { calls[] } ----------|                          |
       |                            |                          |
       |-- POST /mint/record ------>|                          |
       |   (status: 'pending')      |-- recordMint() -------->|
       |<--- { mint.id } ----------|                          |
       |                            |                          |
       |-- writeContractAsync(call) =========================>|
       |   (wagmi sends tx)         |                          |
       |<== tx hash =======================================|
       |                            |                          |
       |-- POST /mint/record ------>|                          |
       |   (mintId, 'confirmed',    |-- updateMintStatus() -->|
       |    txHash)                  |                          |
```

### Step 1: Prepare

The client calls `POST /api/nft/mint/prepare` with `{ collectionId, tokenId?, quantity }`. The server looks up the collection, resolves the provider, and calls `provider.buildMintTransaction()`. The result is an array of serialized contract calls (with `BigInt` values converted to strings for JSON transport).

### Step 2: Record (pending)

The client immediately calls `POST /api/nft/mint/record` with `{ collectionId, tokenId, quantity, status: 'pending' }` to create a mint record in the database. This gives you an audit trail even if the transaction fails.

### Step 3: Execute

The client uses wagmi's `writeContractAsync` to send the first call from the array to the blockchain. The call includes the contract address, ABI, function name, args, and optional ETH value.

### Step 4: Confirm

Once `useWaitForTransactionReceipt` reports success, the hook calls `POST /api/nft/mint/record` again with `{ mintId, status: 'confirmed', txHash }` to update the database record.

If the transaction fails, the hook updates the record to `status: 'failed'`.

---

## Provider Implementation Details

### OnchainKit Provider

**File:** `lib/nft/providers/onchainkit.ts`

- Uses raw ABI calls from `lib/nft/abis.ts` (minimal ERC-721 and ERC-1155 ABIs)
- Determines ERC-721 vs ERC-1155 based on `tokenId` presence in the mint params
- ERC-721: generates one `mint(to)` call per token in `quantity`
- ERC-1155: generates a single `safeTransferFrom` call
- Metadata is a placeholder on the server -- OnchainKit metadata is typically fetched client-side via the `<NFTCard>` component
- Does **not** support `buildCreateCollectionTransaction` -- collections must be deployed externally (Coinbase NFT, Hardhat, etc.)

### Zora Protocol Provider

**File:** `lib/nft/providers/zora-protocol.ts`

- Uses `@zoralabs/protocol-sdk` (`mint`, `getToken`, `create1155`)
- Creates a viem `PublicClient` targeting Base Mainnet or Base Sepolia based on `blockchain.chainId`
- Determines `mintType` (`'721'` or `'1155'`) from `tokenId` presence
- Wires `nftConfig.zoraMintReferral` into mint calls for protocol rewards
- Supports `buildCreateCollectionTransaction` using `create1155()` from the SDK
- Uses `nftConfig.zoraCreateReferral` as the `createReferral` for new collections
- The `payoutRecipient` is set to the creator's address

### Zora Coins Provider

**File:** `lib/nft/providers/zora-coins.ts`

- Uses `@zoralabs/coins-sdk` (`createTradeCall`, `createCoinCall`, `getCoin`)
- "Minting" a Zora Coin is actually **buying** the ERC-20 token on its bonding curve
- Quantity maps to ETH spent: `quantity * 0.001 ETH` (the `amountIn` calculation)
- Default slippage tolerance is 5%
- Supports `buildCreateCollectionTransaction` using `createCoinCall()`
- The symbol defaults to the first 6 characters of the name, uppercased
- `startingMarketCap` can be `'LOW'` or `'HIGH'`
- Wires `nftConfig.zoraPlatformReferrer` into create calls

---

## Client Hooks Reference

All hooks are in the `hooks/` directory and marked `'use client'`.

### useNFTMint

**File:** `hooks/useNFTMint.ts`

Manages the full mint lifecycle.

```typescript
const { mint, status, txHash, mintId, isLoading, error, reset } = useNFTMint();

// Trigger a mint
await mint(collectionId, tokenId, quantity);
```

| Return value | Type | Description |
|---|---|---|
| `mint` | `(collectionId, tokenId?, quantity?) => Promise<void>` | Start the mint flow |
| `status` | `'idle' \| 'pending' \| 'confirmed' \| 'failed'` | Current mint status |
| `txHash` | `string \| undefined` | Transaction hash once submitted |
| `mintId` | `string \| undefined` | Database mint record ID |
| `isLoading` | `boolean` | True while preparing, submitting, or waiting for confirmation |
| `error` | `string \| null` | Error message if the mint failed |
| `reset` | `() => void` | Reset state to idle |

Uses wagmi's `useWriteContract` and `useWaitForTransactionReceipt` internally.

### useNFTCollection

**File:** `hooks/useNFTCollection.ts`

Fetches a single collection with its tokens.

```typescript
const { collection, tokens, isLoading, error, refetch } = useNFTCollection(collectionId);
```

Calls `GET /api/nft/collections/{id}` on mount and when `collectionId` changes.

### useNFTCollections

**File:** `hooks/useNFTCollection.ts` (same file, second export)

Fetches all active collections.

```typescript
const { collections, isLoading, error, refetch } = useNFTCollections();
```

Calls `GET /api/nft/collections` on mount.

### useNFTMetadata

**File:** `hooks/useNFTMetadata.ts`

Fetches normalized metadata for a specific token.

```typescript
const { metadata, isLoading, error, refetch } = useNFTMetadata(
  contractAddress,
  tokenId,    // optional
  provider    // optional, defaults to 'onchainkit'
);
```

Calls `GET /api/nft/metadata?contractAddress=...&tokenId=...&provider=...`.

### useOwnedNFTs

**File:** `hooks/useOwnedNFTs.ts`

Fetches all mint records for the currently authenticated user.

```typescript
const { mints, isLoading, error, refetch } = useOwnedNFTs();
```

Calls `GET /api/nft/owned`. Returns an array of `NFTMintEvent` objects. Requires authentication -- returns an empty array if the user is not logged in.

---

## Zora Referral and Revenue Configuration

Three environment variables control referral addresses for Zora providers:

| Env Variable | Used By | Purpose |
|---|---|---|
| `ZORA_CREATE_REFERRAL_ADDRESS` | Zora Protocol | Earns referral rewards when new 1155 collections are created |
| `ZORA_MINT_REFERRAL_ADDRESS` | Zora Protocol | Earns referral rewards on every mint |
| `ZORA_PLATFORM_REFERRER_ADDRESS` | Zora Coins | Earns platform referral rewards on coin creation |

These are read from `lib/config.ts` and injected into provider SDK calls automatically. You can also override referral addresses per-collection via the `providerConfig` fields (`mintReferral`, `createReferral`, `platformReferrer`).

Set your own wallet addresses in `.env.local` to earn protocol rewards:

```bash
ZORA_CREATE_REFERRAL_ADDRESS=0xYourAddress
ZORA_MINT_REFERRAL_ADDRESS=0xYourAddress
ZORA_PLATFORM_REFERRER_ADDRESS=0xYourAddress
```

---

## How to Add a New NFT Provider

Follow these steps to add support for a new NFT minting service.

### Step 1: Register the provider type

Add your provider name to the `NFTProvider` union in `types/nft.ts`:

```typescript
export type NFTProvider = 'onchainkit' | 'zora_protocol' | 'zora_coins' | 'your_provider';
```

### Step 2: Define the config shape

Add a config interface in `types/nft.ts`:

```typescript
export interface YourProviderConfig {
  apiKey?: string;
  // provider-specific fields
}

export type ProviderConfig =
  | OnchainKitConfig
  | ZoraProtocolConfig
  | ZoraCoinsConfig
  | YourProviderConfig;
```

### Step 3: Create the provider class

Create `lib/nft/providers/your-provider.ts`:

```typescript
import type { Address } from 'viem';
import type { NFTMetadata, MintTransactionData } from '@/types/nft';
import type { INFTProvider, ProviderMintParams, ProviderCreateParams } from '../types';

export class YourProvider implements INFTProvider {
  readonly providerType = 'your_provider' as const;

  async getTokenMetadata(
    contractAddress: Address,
    tokenId?: string
  ): Promise<NFTMetadata> {
    // Fetch and normalize metadata from your provider
    return {
      name: 'Token Name',
      description: 'Description',
      imageUrl: 'https://...',
      attributes: [],
    };
  }

  async buildMintTransaction(params: ProviderMintParams): Promise<MintTransactionData> {
    // Build contract call(s) that wagmi can execute
    return {
      calls: [
        {
          address: params.contractAddress,
          abi: YOUR_ABI,
          functionName: 'mint',
          args: [params.minterAddress, BigInt(params.quantity)],
          value: undefined,
        },
      ],
    };
  }

  // Optional: implement buildCreateCollectionTransaction if your provider
  // supports deploying new contracts
  async buildCreateCollectionTransaction(
    params: ProviderCreateParams
  ): Promise<MintTransactionData> {
    // ...
  }

  validateConfig(config: Record<string, unknown>): boolean {
    // Return false if config has invalid fields
    return true;
  }
}
```

### Step 4: Register in the registry

Update `lib/nft/registry.ts`:

```typescript
import { YourProvider } from './providers/your-provider';

function initProvider(type: NFTProvider): INFTProvider {
  switch (type) {
    case 'onchainkit':
      return new OnchainKitProvider();
    case 'zora_protocol':
      return new ZoraProtocolProvider();
    case 'zora_coins':
      return new ZoraCoinsProvider();
    case 'your_provider':
      return new YourProvider();
    default:
      throw new Error(`Unknown NFT provider: ${type}`);
  }
}

export function getAllProviderTypes(): NFTProvider[] {
  return ['onchainkit', 'zora_protocol', 'zora_coins', 'your_provider'];
}
```

### Step 5: Add admin UI config fields (optional)

If your provider has config fields admins should set, add a conditional section in `components/admin/CollectionForm.tsx`:

```tsx
{formData.provider === 'your_provider' && (
  <div className="border-t border-gray-200 pt-4">
    <h4 className="text-sm font-semibold text-gray-700 mb-3">Your Provider Config</h4>
    {/* Config fields here */}
  </div>
)}
```

### Step 6: Write tests

Test that your provider correctly implements the `INFTProvider` interface. Test `validateConfig` with valid and invalid inputs. Test `buildMintTransaction` returns the expected call structure.

---

## Known Limitations

### wagmi typing workaround

The `useNFTMint` hook uses `any` for the `txParams` object passed to `writeContractAsync`. This is an intentional workaround because wagmi's `writeContract` has strict generic typing that requires a concrete ABI type at compile time, but the abstraction layer returns dynamic ABIs from different providers. The `eslint-disable` comment marks this explicitly:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const txParams: any = { ... };
```

### viem version alignment

The Zora Protocol SDK and OnchainKit may depend on different versions of `viem`. If you encounter type conflicts, check that your `viem` version satisfies all peer dependency ranges. The `Address` type from viem is used throughout the abstraction layer, so a version mismatch can surface as TypeScript errors on `0x${string}` types.

### Single-call execution

The `useNFTMint` hook currently executes only the **first** call from the `calls` array. If a provider returns multiple calls (for example, ERC-721 mints with `quantity > 1` via OnchainKit), only the first token will be minted. For multi-call execution, you would need to extend the hook to iterate through all calls or use a batching mechanism.

### Server-side metadata limitations

OnchainKit's `getTokenMetadata` returns placeholder data on the server because OnchainKit is designed for client-side rendering via its React components. If you need rich server-side metadata for OnchainKit collections, you will need to fetch it from the contract's `tokenURI` directly.
