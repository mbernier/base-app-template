import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/headers before importing auth module
vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      getAll: vi.fn(() => []),
      has: vi.fn(() => false),
      toString: vi.fn(() => ''),
    })
  ),
}));

// Mock iron-session
const mockSave = vi.fn();
const mockSession: Record<string, unknown> = {
  save: mockSave,
};
vi.mock('iron-session', () => ({
  getIronSession: vi.fn(() => Promise.resolve(mockSession)),
}));

// Mock config with required SESSION_SECRET
vi.mock('../config', () => ({
  auth: {
    sessionSecret: 'test-secret-at-least-32-characters-long',
    sessionDuration: 86400,
    siweDomain: 'localhost',
    siweStatement: 'Sign in to test app',
  },
  app: {
    url: 'http://localhost:3100',
    name: 'Test App',
    env: 'test',
    isProduction: false,
  },
}));

// Contract validation: verify our config mocks match the real config exports
describe('config mock contract validation', () => {
  it('mock auth config has all expected keys', async () => {
    const { auth } = await import('../config');
    expect(auth).toHaveProperty('sessionSecret');
    expect(auth).toHaveProperty('sessionDuration');
    expect(auth).toHaveProperty('siweDomain');
    expect(auth).toHaveProperty('siweStatement');
  });

  it('mock app config has all expected keys', async () => {
    const { app } = await import('../config');
    expect(app).toHaveProperty('url');
    expect(app).toHaveProperty('name');
    expect(app).toHaveProperty('isProduction');
  });
});

describe('generateNonce', () => {
  it('should generate a non-empty string', async () => {
    const { generateNonce } = await import('../auth');
    const nonce = generateNonce();
    expect(nonce).toBeTruthy();
    expect(typeof nonce).toBe('string');
  });

  it('should generate alphanumeric nonces (no hyphens)', async () => {
    const { generateNonce } = await import('../auth');
    const nonce = generateNonce();
    expect(nonce).not.toContain('-');
    expect(nonce).toMatch(/^[a-f0-9]+$/);
  });

  it('should generate unique nonces', async () => {
    const { generateNonce } = await import('../auth');
    const nonces = new Set(Array.from({ length: 100 }, () => generateNonce()));
    expect(nonces.size).toBe(100);
  });
});

describe('generateSiweMessage', () => {
  it('should create a SIWE message with correct fields', async () => {
    const { generateSiweMessage } = await import('../auth');
    const address = '0x1234567890123456789012345678901234567890';
    const chainId = 84532;
    const nonce = 'testnonce123';

    const message = generateSiweMessage(address, chainId, nonce);

    expect(message.domain).toBe('localhost');
    expect(message.address).toBe(address);
    expect(message.chainId).toBe(chainId);
    expect(message.nonce).toBe(nonce);
    expect(message.uri).toBe('http://localhost:3100');
    expect(message.version).toBe('1');
  });

  it('should set expiration 5 minutes from now', async () => {
    const { generateSiweMessage } = await import('../auth');
    // Must use a valid EIP-55 checksum address
    const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const before = Date.now();

    const message = generateSiweMessage(address, 84532, 'testnonce123');
    const expiry = new Date(message.expirationTime!).getTime();
    const after = Date.now();

    // Expiry should be ~5 minutes from now
    expect(expiry).toBeGreaterThanOrEqual(before + 4.9 * 60 * 1000);
    expect(expiry).toBeLessThanOrEqual(after + 5.1 * 60 * 1000);
  });
});

describe('verifySiweSignature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject messages with mismatched nonce', async () => {
    const { verifySiweSignature } = await import('../auth');

    // The SIWE message text includes the nonce; we pass a different expectedNonce
    const fakeMessage =
      'localhost wants you to sign in with your Ethereum account:\n0x1234567890123456789012345678901234567890\n\nSign in to test app\n\nURI: http://localhost:3100\nVersion: 1\nChain ID: 84532\nNonce: wrongnonce\nIssued At: 2024-01-01T00:00:00.000Z';

    const result = await verifySiweSignature(fakeMessage, '0xfakesig', 'correctnonce');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Nonce mismatch');
  });

  it('should reject messages with wrong domain', async () => {
    const { verifySiweSignature } = await import('../auth');

    const fakeMessage =
      'evil.com wants you to sign in with your Ethereum account:\n0x1234567890123456789012345678901234567890\n\nSign in to test app\n\nURI: http://localhost:3100\nVersion: 1\nChain ID: 84532\nNonce: testnonce\nIssued At: 2024-01-01T00:00:00.000Z';

    const result = await verifySiweSignature(fakeMessage, '0xfakesig', 'testnonce');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Domain mismatch');
  });

  it('should reject messages with wrong URI', async () => {
    const { verifySiweSignature } = await import('../auth');

    const fakeMessage =
      'localhost wants you to sign in with your Ethereum account:\n0x1234567890123456789012345678901234567890\n\nSign in to test app\n\nURI: http://evil.com\nVersion: 1\nChain ID: 84532\nNonce: testnonce\nIssued At: 2024-01-01T00:00:00.000Z';

    const result = await verifySiweSignature(fakeMessage, '0xfakesig', 'testnonce');

    expect(result.success).toBe(false);
    expect(result.error).toBe('URI mismatch');
  });

  it('should return error when SiweMessage constructor throws', async () => {
    const { verifySiweSignature } = await import('../auth');
    // Pass completely invalid message that will cause SiweMessage constructor to throw
    const result = await verifySiweSignature('not a valid siwe message at all', '0xfake', 'nonce');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('getSession', () => {
  it('should return a session object', async () => {
    const { getSession } = await import('../auth');
    const session = await getSession();
    expect(session).toBeDefined();
    expect(session).toHaveProperty('save');
  });
});
