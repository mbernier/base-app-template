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

// Admin configuration
export const admin = {
  initialSuperAdminAddress: process.env.INITIAL_SUPER_ADMIN_ADDRESS as string | undefined,
};

// Rate limiting configuration
export const rateLimit = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
};

// Validate server-side configuration at boot
export function validateServerConfig(): void {
  if (typeof window !== 'undefined') {
    return; // Skip validation on client
  }

  if (!auth.sessionSecret || auth.sessionSecret === 'CHANGE_ME_GENERATE_A_REAL_SECRET_WITH_OPENSSL') {
    if (app.isProduction) {
      throw new Error('SESSION_SECRET must be set in production');
    }
    console.warn('[Config] Warning: SESSION_SECRET not properly set');
  }

  if (!database.supabaseUrl || !database.supabaseAnonKey) {
    console.warn('[Config] Warning: Supabase configuration incomplete');
  }
}
