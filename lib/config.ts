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

  if (!auth.sessionSecret) {
    throw new Error(
      'SESSION_SECRET environment variable is required. Generate one with: openssl rand -base64 32'
    );
  }

  if (!database.supabaseUrl || !database.supabaseAnonKey) {
    console.warn('[Config] Warning: Supabase configuration incomplete');
  }
}

// Run validation on server-side module load
if (typeof window === 'undefined') {
  validateServerConfig();
}
