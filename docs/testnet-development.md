# Testnet Development

This guide covers chain switching, Farcaster testnet limitations, and the recommended development workflow.

## Chain Switching

The active chain is controlled by a single environment variable:

```bash
# Base Sepolia (testnet) -- default
NEXT_PUBLIC_CHAIN_ID=84532

# Base Mainnet
NEXT_PUBLIC_CHAIN_ID=8453
```

All chain-dependent code reads from `lib/chain.ts`, which provides:

- `CHAIN` / `CHAIN_META.chain` -- the viem `Chain` object
- `isTestnet` / `isMainnet` -- convenience booleans
- `BLOCK_EXPLORER_URL` -- `basescan.org` or `sepolia.basescan.org`
- `FAUCET_URL` -- faucet link (testnet only, `null` on mainnet)

### Custom RPC

Set `NEXT_PUBLIC_RPC_URL` in your `.env.local` to use a private RPC endpoint (Alchemy, Infura, etc.). This is recommended for production and useful in development when the public RPC rate-limits you.

```bash
NEXT_PUBLIC_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
```

## Dev-Mode Chain Banner

In development (`NODE_ENV=development`), a yellow banner appears at the top of the page showing:

- The active chain name (e.g., "Base Sepolia")
- A link to the block explorer
- A faucet link (testnet only)
- A Farcaster testnet warning (when Farcaster is enabled on testnet)

The banner is dismissible and does not render in production. It only appears in standalone mode (not inside Farcaster mini-app chrome).

## Farcaster on Testnet

### Why Transactions Fail

Farcaster mini-apps run inside the Farcaster client, which provides a wallet connected to **Base mainnet only**. There are no Farcaster contracts deployed on any testnet. This means:

1. The Farcaster wallet provider always connects to chain 8453 (Base mainnet).
2. If your app is configured for chain 84532 (Base Sepolia), any transaction sent through the Farcaster wallet will fail with a chain mismatch error.
3. Farcaster-specific contracts (e.g., ID Registry, Key Registry) only exist on mainnet.

### What Works on Testnet

| Feature                              | Testnet | Mainnet |
| ------------------------------------ | ------- | ------- |
| FID lookup / user identity           | Yes     | Yes     |
| SIWF (Sign In With Farcaster)        | Yes     | Yes     |
| User profile data (username, pfp)    | Yes     | Yes     |
| Push notifications (delivery)        | Yes     | Yes     |
| Wallet transactions (mint, transfer) | **No**  | Yes     |
| Farcaster Coins / protocol calls     | **No**  | Yes     |
| Onchain actions from notifications   | **No**  | Yes     |

### Warning System

When Farcaster is enabled on testnet, warnings appear at multiple points:

1. **Server startup** (`validateServerConfig`): Console warning with recommendation to set `NEXT_PUBLIC_CHAIN_ID=8453`.
2. **Farcaster auto-auth** (`useAuth`): Console warning when the auto-auth flow runs inside a mini-app on testnet.
3. **Notifications** (`sendNotification` / `broadcastNotification`): Console warning that recipients' wallets connect to mainnet.
4. **Dev banner** (`ChainBanner`): Visual warning in the UI.

### Farcaster Manifest

The manifest at `/.well-known/farcaster.json` always declares `requiredChains: ['eip155:8453']` regardless of your `NEXT_PUBLIC_CHAIN_ID` setting. This is correct -- the Farcaster client needs to know the app requires Base mainnet.

## Recommended Development Workflow

### For identity-only features (profiles, auth, notifications):

1. Set `NEXT_PUBLIC_CHAIN_ID=84532` (testnet).
2. Set `NEXT_PUBLIC_FARCASTER_ENABLED=true`.
3. Develop and test identity features freely.
4. Ignore the testnet warnings -- they are informational for this workflow.

### For onchain features (minting, transfers, coins):

1. Set `NEXT_PUBLIC_CHAIN_ID=8453` (mainnet).
2. Use a small amount of real ETH on Base mainnet for testing.
3. Or: develop the transaction logic on testnet without Farcaster, then switch to mainnet for integration testing inside the Farcaster client.

### For full integration testing:

1. Set `NEXT_PUBLIC_CHAIN_ID=8453`.
2. Set `NEXT_PUBLIC_FARCASTER_ENABLED=true`.
3. Deploy to a staging environment.
4. Test inside the Farcaster client using the Farcaster Developer Tools.

## Useful Links

- **Base Sepolia Faucet**: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- **Base Sepolia Block Explorer**: https://sepolia.basescan.org
- **Base Mainnet Block Explorer**: https://basescan.org
- **Farcaster Developer Tools**: https://docs.farcaster.xyz/developers/

## Production Checklist

Before deploying to production with Farcaster enabled:

- [ ] `NEXT_PUBLIC_CHAIN_ID` is `8453` (Base Mainnet)
- [ ] `NEXT_PUBLIC_FARCASTER_ENABLED` is `true`
- [ ] All `FARCASTER_ACCOUNT_*` values are set (account association)
- [ ] `NEXT_PUBLIC_RPC_URL` points to a reliable RPC provider
- [ ] Manifest at `/.well-known/farcaster.json` returns valid JSON with `requiredChains`
- [ ] Tested inside the Farcaster client on mainnet

## Troubleshooting

### "Chain mismatch" or transaction failures in Farcaster

Your app is configured for testnet but the Farcaster wallet connects to mainnet. Set `NEXT_PUBLIC_CHAIN_ID=8453`.

### Console warnings about Farcaster on testnet

These are informational. If you are intentionally developing identity-only features on testnet, the warnings are expected and can be ignored.

### Transactions work in standalone mode but fail in Farcaster

In standalone mode, the user's own wallet (e.g., Coinbase Wallet, MetaMask) connects to whatever chain you configure. In Farcaster mini-app mode, the wallet is always mainnet. Ensure your app targets mainnet when deploying as a Farcaster mini-app.

### Banner not showing in development

The `ChainBanner` only renders when `NODE_ENV === 'development'` and only in standalone mode (not mini-app mode). If you dismissed it, refresh the page.
