import { SiweMessage } from 'siwe';
import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { auth, app } from './config';

// Session data type
export interface SessionData {
  address?: string;
  chainId?: number;
  isLoggedIn: boolean;
  nonce?: string;
  tosAcceptedVersion?: string;
  tosAcceptedAt?: string;
  fid?: number;
  authMethod?: 'wallet' | 'farcaster';
}

// Validate session secret at module load time - hard fail if missing
function getSessionPassword(): string {
  const secret = auth.sessionSecret;
  if (!secret) {
    throw new Error(
      'SESSION_SECRET environment variable is required. Generate one with: openssl rand -base64 32'
    );
  }
  return secret;
}

// Session options — built lazily to avoid hard-fail during next build page collection
function getSessionOptions() {
  return {
    password: getSessionPassword(),
    cookieName: 'base_app_session',
    cookieOptions: {
      secure: app.isProduction,
      httpOnly: true,
      sameSite: 'lax' as const,
      maxAge: auth.sessionDuration,
    },
  };
}

// Get session
export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, getSessionOptions());
}

// Generate SIWE message
export function generateSiweMessage(address: string, chainId: number, nonce: string): SiweMessage {
  return new SiweMessage({
    domain: auth.siweDomain,
    address,
    statement: auth.siweStatement,
    uri: app.url,
    version: '1',
    chainId,
    nonce,
    expirationTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min
  });
}

// Verify SIWE signature with nonce, domain, and URI validation
export async function verifySiweSignature(
  message: string,
  signature: string,
  expectedNonce: string
): Promise<{ success: boolean; address?: string; chainId?: number; error?: string }> {
  try {
    const siweMessage = new SiweMessage(message);

    // Validate nonce matches session nonce
    if (siweMessage.nonce !== expectedNonce) {
      return { success: false, error: 'Nonce mismatch' };
    }

    // Validate domain matches expected SIWE domain
    if (siweMessage.domain !== auth.siweDomain) {
      return { success: false, error: 'Domain mismatch' };
    }

    // Validate URI matches expected app URL
    if (siweMessage.uri !== app.url) {
      return { success: false, error: 'URI mismatch' };
    }

    const result = await siweMessage.verify({ signature });

    if (result.success) {
      return {
        success: true,
        address: siweMessage.address,
        chainId: siweMessage.chainId,
      };
    }

    return { success: false, error: 'Verification failed' };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Generate nonce (alphanumeric, no hyphens - required by SIWE)
export function generateNonce(): string {
  return crypto.randomUUID().replace(/-/g, '');
}
