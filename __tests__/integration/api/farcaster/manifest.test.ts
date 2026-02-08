/**
 * Integration tests for GET /.well-known/farcaster.json
 *
 * This route is pure config -- no DB operations. We mock @/lib/config
 * to provide deterministic values and verify the JSON manifest shape.
 *
 * Validates that:
 * - Returns 200 with JSON
 * - accountAssociation uses farcaster config values
 * - miniapp includes correct name, URLs, and webhook URL
 * - Cache-Control header is set to public, max-age=3600
 */
import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock config — must happen BEFORE route import
// ---------------------------------------------------------------------------
vi.mock('@/lib/config', () => ({
  app: {
    name: 'Test Farcaster App',
    url: 'https://test.example.com',
    env: 'test',
    isProduction: false,
  },
  farcaster: {
    enabled: true,
    accountHeader: 'test-header-value',
    accountPayload: 'test-payload-value',
    accountSignature: 'test-signature-value',
    iconUrl: 'https://test.example.com/custom-icon.png',
    imageUrl: 'https://test.example.com/image.png',
    splashImageUrl: 'https://test.example.com/custom-splash.png',
    splashBgColor: '#1a1a2e',
    buttonTitle: 'Open App',
  },
}));

// Import route handler AFTER mocks are set up
import { GET } from '@/app/.well-known/farcaster.json/route';

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe('GET /.well-known/farcaster.json', () => {
  it('returns 200', async () => {
    const response = await GET();
    expect(response.status).toBe(200);
  });

  it('returns valid JSON', async () => {
    const response = await GET();
    const body = await response.json();
    expect(body).toBeDefined();
    expect(typeof body).toBe('object');
  });

  it('returns JSON with accountAssociation object', async () => {
    const response = await GET();
    const body = await response.json();

    expect(body).toHaveProperty('accountAssociation');
    expect(body.accountAssociation).toHaveProperty('header');
    expect(body.accountAssociation).toHaveProperty('payload');
    expect(body.accountAssociation).toHaveProperty('signature');
  });

  it('accountAssociation uses farcaster config values', async () => {
    const response = await GET();
    const body = await response.json();

    expect(body.accountAssociation.header).toBe('test-header-value');
    expect(body.accountAssociation.payload).toBe('test-payload-value');
    expect(body.accountAssociation.signature).toBe('test-signature-value');
  });

  it('returns miniapp object with name from app.name', async () => {
    const response = await GET();
    const body = await response.json();

    expect(body).toHaveProperty('miniapp');
    expect(body.miniapp.name).toBe('Test Farcaster App');
  });

  it('miniapp contains correct version', async () => {
    const response = await GET();
    const body = await response.json();

    expect(body.miniapp.version).toBe('1');
  });

  it('miniapp contains correct URLs from config', async () => {
    const response = await GET();
    const body = await response.json();

    expect(body.miniapp.homeUrl).toBe('https://test.example.com');
    expect(body.miniapp.iconUrl).toBe('https://test.example.com/custom-icon.png');
    expect(body.miniapp.splashImageUrl).toBe('https://test.example.com/custom-splash.png');
    expect(body.miniapp.splashBackgroundColor).toBe('#1a1a2e');
    expect(body.miniapp.webhookUrl).toBe('https://test.example.com/api/farcaster/webhook');
  });

  it('sets Cache-Control: public, max-age=3600', async () => {
    const response = await GET();
    const cacheControl = response.headers.get('Cache-Control');

    expect(cacheControl).toBe('public, max-age=3600');
  });
});
