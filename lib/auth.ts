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

// Session options
const sessionOptions = {
  password: auth.sessionSecret || 'fallback-dev-secret-do-not-use-in-production',
  cookieName: 'base_app_session',
  cookieOptions: {
    secure: app.isProduction,
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: auth.sessionDuration,
  },
};

// Get session
export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
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

// Verify SIWE signature
export async function verifySiweSignature(
  message: string,
  signature: string
): Promise<{ success: boolean; address?: string; chainId?: number; error?: string }> {
  try {
    const siweMessage = new SiweMessage(message);
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
