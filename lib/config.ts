/**
 * Application configuration loaded from environment variables.
 * Hard fails at boot time if required variables are missing.
 *
 * NOTE: NEXT_PUBLIC_* variables must be accessed directly (not through functions)
 * for Next.js to properly inline them at build time for client-side usage.
 */

// Blockchain configuration
export const blockchain = {
  tokenAddress: process.env.NEXT_PUBLIC_TOKEN_ADDRESS as `0x${string}` | undefined,
  tokenSymbol: process.env.NEXT_PUBLIC_TOKEN_SYMBOL || 'TOKEN',
  tokenDecimals: parseInt(process.env.NEXT_PUBLIC_TOKEN_DECIMALS || '18'),
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '84532'),
  treasuryWallet: process.env.NEXT_PUBLIC_TREASURY_WALLET as `0x${string}` | undefined,
};

// OnchainKit configuration
export const onchainKit = {
  cdpApiKey: process.env.NEXT_PUBLIC_CDP_API_KEY,
  paymasterUrl: process.env.NEXT_PUBLIC_PAYMASTER_URL,
};

// Application configuration
export const app = {
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100',
  name: process.env.NEXT_PUBLIC_APP_NAME || 'Base App',
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

// Feature flags
export const features = {
  showUserAuditLog: process.env.NEXT_PUBLIC_SHOW_USER_AUDIT_LOG === 'true',
};

// Database configuration (only validate on server side)
export const database = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
};

// Auth configuration (server-side only)
export const auth = {
  sessionSecret: process.env.SESSION_SECRET || '',
  sessionDuration: parseInt(process.env.SESSION_DURATION || '86400'),
  siweDomain: process.env.SIWE_DOMAIN || 'localhost',
  siweStatement: process.env.SIWE_STATEMENT || 'Sign in to this app',
};

// NFT configuration
export const nft = {
  defaultProvider: process.env.NEXT_PUBLIC_DEFAULT_NFT_PROVIDER || 'onchainkit',
  zoraCreateReferral: process.env.ZORA_CREATE_REFERRAL_ADDRESS as `0x${string}` | undefined,
  zoraMintReferral: process.env.ZORA_MINT_REFERRAL_ADDRESS as `0x${string}` | undefined,
  zoraPlatformReferrer: process.env.ZORA_PLATFORM_REFERRER_ADDRESS as `0x${string}` | undefined,
};

// Farcaster Mini-App configuration
export const farcaster = {
  enabled: process.env.NEXT_PUBLIC_FARCASTER_ENABLED === 'true',
  // SIWF (Sign In With Farcaster) domain for message verification
  domain: process.env.FARCASTER_SIWF_DOMAIN || process.env.SIWE_DOMAIN || 'localhost',
  // Manifest - account association (generated via Farcaster/Base tools)
  accountHeader: process.env.FARCASTER_ACCOUNT_HEADER || '',
  accountPayload: process.env.FARCASTER_ACCOUNT_PAYLOAD || '',
  accountSignature: process.env.FARCASTER_ACCOUNT_SIGNATURE || '',
  // Manifest - mini-app metadata
  iconUrl: process.env.NEXT_PUBLIC_FARCASTER_ICON_URL || '',
  imageUrl: process.env.NEXT_PUBLIC_FARCASTER_IMAGE_URL || '',
  splashImageUrl: process.env.NEXT_PUBLIC_FARCASTER_SPLASH_IMAGE_URL || '',
  splashBgColor: process.env.NEXT_PUBLIC_FARCASTER_SPLASH_BG_COLOR || '#ffffff',
  buttonTitle: process.env.NEXT_PUBLIC_FARCASTER_BUTTON_TITLE || 'Launch',
};

// Admin configuration
export const admin = {
  initialSuperAdminAddress: process.env.INITIAL_SUPER_ADMIN_ADDRESS as string | undefined,
};

// Rate limiting configuration
export const rateLimit = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  // Standard Redis (Railway, Redis Cloud, self-hosted)
  redisUrl: process.env.REDIS_URL || '',
  // Upstash Redis (HTTP-based, for serverless)
  upstashUrl: process.env.UPSTASH_REDIS_REST_URL || '',
  upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN || '',
};

// Validate server-side configuration at boot
export function validateServerConfig(): void {
  if (typeof window !== 'undefined') {
    return; // Skip validation on client
  }

  if (!auth.sessionSecret) {
    throw new Error(
      'SESSION_SECRET environment variable is required. Generate one with: openssl rand -base64 32'
    );
  }

  if (!database.supabaseUrl || !database.supabaseAnonKey) {
    console.warn('[Config] Warning: Supabase configuration incomplete');
  }

  if (farcaster.enabled) {
    if (!farcaster.accountHeader || !farcaster.accountPayload || !farcaster.accountSignature) {
      console.warn(
        '[Config] Warning: Farcaster enabled but account association values are missing. ' +
          'The manifest at /.well-known/farcaster.json will be incomplete.'
      );
    }

    if (blockchain.chainId !== 8453) {
      console.warn(
        '[Config] Farcaster is enabled on testnet (chain ' +
          blockchain.chainId +
          '). ' +
          'Identity features (FID, SIWF) will work, but onchain transactions will FAIL -- ' +
          'Farcaster wallets connect to Base mainnet only. ' +
          'Set NEXT_PUBLIC_CHAIN_ID=8453 for full functionality.'
      );
    }
  }
}

// Run validation on server-side module load (skip during build)
if (typeof window === 'undefined' && process.env.NEXT_PHASE !== 'phase-production-build') {
  validateServerConfig();
}
