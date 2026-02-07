/**
 * Integration tests for lib/nft-db.ts
 *
 * These tests use a REAL Supabase database -- no mocking.
 * vitest.setup.ts loads .env.local so DB credentials are available.
 *
 * Test data is prefixed with a timestamp to avoid collisions with parallel
 * runs and is cleaned up in afterAll (FK order: mints -> tokens -> collections -> settings).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getCollections,
  getCollectionById,
  createCollection,
  updateCollection,
  deleteCollection,
  getTokensByCollection,
  createToken,
  updateToken,
  recordMint,
  updateMintStatus,
  getMintsByAccount,
  getMintsByCollection,
  getMintStats,
  getSetting,
  setSetting,
  getAllSettings,
} from '@/lib/nft-db';
import { createUntypedServerClient } from '@/lib/db';

const TEST_PREFIX = `test-${Date.now()}`;

describe('nft-db', () => {
  // IDs tracked for cleanup
  let testCollectionId: string;
  let testCollectionAllFieldsId: string;
  let testTokenId: string;
  let testMintId: string;
  let testMintWithTokenId: string;
  const testSettingKey = `${TEST_PREFIX}-setting`;

  afterAll(async () => {
    const supabase = createUntypedServerClient();

    // Delete mints first (references tokens and collections)
    if (testMintId) {
      await supabase.from('nft_mints').delete().eq('id', testMintId);
    }
    if (testMintWithTokenId) {
      await supabase.from('nft_mints').delete().eq('id', testMintWithTokenId);
    }

    // Delete tokens (references collections)
    if (testTokenId) {
      await supabase.from('nft_tokens').delete().eq('id', testTokenId);
    }

    // Delete collections
    if (testCollectionId) {
      await supabase.from('nft_collections').delete().eq('id', testCollectionId);
    }
    if (testCollectionAllFieldsId) {
      await supabase.from('nft_collections').delete().eq('id', testCollectionAllFieldsId);
    }

    // Delete settings
    await supabase.from('app_settings').delete().eq('key', testSettingKey);
  });

  // ---------------------------------------------------------------------------
  // COLLECTIONS
  // ---------------------------------------------------------------------------
  describe('collections', () => {
    it('creates a collection with minimal fields', async () => {
      const collection = await createCollection({
        name: `${TEST_PREFIX}-collection`,
        provider: 'onchainkit',
      });

      testCollectionId = collection.id;

      expect(collection.id).toBeDefined();
      expect(collection.name).toBe(`${TEST_PREFIX}-collection`);
      expect(collection.provider).toBe('onchainkit');
      expect(collection.is_active).toBe(true);
      expect(collection.chain_id).toBe(8453);
      expect(collection.description).toBeNull();
      expect(collection.contract_address).toBeNull();
      expect(collection.provider_config).toEqual({});
    });

    it('creates a collection with all fields', async () => {
      const collection = await createCollection({
        name: `${TEST_PREFIX}-full-collection`,
        provider: 'zora_protocol',
        description: 'A fully specified collection',
        contract_address: '0x1234567890abcdef1234567890abcdef12345678',
        chain_id: 84532,
        token_standard: 'erc1155',
        is_active: false,
        provider_config: { createReferral: '0xref' },
        image_url: 'https://example.com/image.png',
        external_url: 'https://example.com',
      });

      testCollectionAllFieldsId = collection.id;

      expect(collection.name).toBe(`${TEST_PREFIX}-full-collection`);
      expect(collection.provider).toBe('zora_protocol');
      expect(collection.description).toBe('A fully specified collection');
      expect(collection.contract_address).toBe('0x1234567890abcdef1234567890abcdef12345678');
      expect(collection.chain_id).toBe(84532);
      expect(collection.token_standard).toBe('erc1155');
      expect(collection.is_active).toBe(false);
      expect(collection.provider_config).toEqual({ createReferral: '0xref' });
      expect(collection.image_url).toBe('https://example.com/image.png');
      expect(collection.external_url).toBe('https://example.com');
    });

    it('getCollections returns the created collections', async () => {
      const collections = await getCollections();

      const ourCollection = collections.find((c) => c.id === testCollectionId);
      expect(ourCollection).toBeDefined();
      expect(ourCollection!.name).toBe(`${TEST_PREFIX}-collection`);
    });

    it('getCollectionById returns the collection when found', async () => {
      const collection = await getCollectionById(testCollectionId);

      expect(collection).not.toBeNull();
      expect(collection!.id).toBe(testCollectionId);
      expect(collection!.name).toBe(`${TEST_PREFIX}-collection`);
    });

    it('getCollectionById returns null for non-existent id', async () => {
      const collection = await getCollectionById('00000000-0000-0000-0000-000000000000');

      expect(collection).toBeNull();
    });

    it('updateCollection changes the specified fields', async () => {
      const updated = await updateCollection(testCollectionId, {
        name: `${TEST_PREFIX}-updated`,
        description: 'Updated description',
      });

      expect(updated.id).toBe(testCollectionId);
      expect(updated.name).toBe(`${TEST_PREFIX}-updated`);
      expect(updated.description).toBe('Updated description');
      // Provider should remain unchanged
      expect(updated.provider).toBe('onchainkit');
    });

    it('getCollections with activeOnly filters inactive collections', async () => {
      const activeCollections = await getCollections({ activeOnly: true });

      // Our "full collection" was created with is_active: false
      const inactiveFound = activeCollections.find((c) => c.id === testCollectionAllFieldsId);
      expect(inactiveFound).toBeUndefined();

      // Our main collection was created with default is_active: true
      const activeFound = activeCollections.find((c) => c.id === testCollectionId);
      expect(activeFound).toBeDefined();
    });

    it('getCollections with provider filter returns only matching', async () => {
      const zoraCollections = await getCollections({ provider: 'zora_protocol' });

      const found = zoraCollections.find((c) => c.id === testCollectionAllFieldsId);
      expect(found).toBeDefined();

      // Our main collection is onchainkit, should not appear
      const notFound = zoraCollections.find((c) => c.id === testCollectionId);
      expect(notFound).toBeUndefined();
    });

    it('deleteCollection removes the collection', async () => {
      // Delete the "all fields" collection; we verify and then recreate awareness for cleanup
      await deleteCollection(testCollectionAllFieldsId);

      const deleted = await getCollectionById(testCollectionAllFieldsId);
      expect(deleted).toBeNull();

      // Mark as cleaned up so afterAll does not try to delete it again
      testCollectionAllFieldsId = '';
    });
  });

  // ---------------------------------------------------------------------------
  // TOKENS
  // ---------------------------------------------------------------------------
  describe('tokens', () => {
    it('creates a token for a collection', async () => {
      const token = await createToken({
        collection_id: testCollectionId,
        name: `${TEST_PREFIX}-token`,
        description: 'A test token',
        token_id: '1',
        max_supply: 100,
        metadata: { trait: 'value' },
      });

      testTokenId = token.id;

      expect(token.id).toBeDefined();
      expect(token.collection_id).toBe(testCollectionId);
      expect(token.name).toBe(`${TEST_PREFIX}-token`);
      expect(token.token_id).toBe('1');
      expect(token.max_supply).toBe(100);
      expect(token.total_minted).toBe(0);
      expect(token.is_active).toBe(true);
      expect(token.metadata).toEqual({ trait: 'value' });
    });

    it('getTokensByCollection returns tokens for the collection', async () => {
      const tokens = await getTokensByCollection(testCollectionId);

      expect(tokens.length).toBeGreaterThanOrEqual(1);
      const ourToken = tokens.find((t) => t.id === testTokenId);
      expect(ourToken).toBeDefined();
      expect(ourToken!.name).toBe(`${TEST_PREFIX}-token`);
    });

    it('updateToken changes the specified fields', async () => {
      const updated = await updateToken(testTokenId, {
        name: `${TEST_PREFIX}-updated-token`,
        is_active: false,
      });

      expect(updated.id).toBe(testTokenId);
      expect(updated.name).toBe(`${TEST_PREFIX}-updated-token`);
      expect(updated.is_active).toBe(false);
    });

    it('getTokensByCollection with activeOnly excludes inactive tokens', async () => {
      // The token was just set to is_active: false in the previous test
      const activeTokens = await getTokensByCollection(testCollectionId, { activeOnly: true });

      const found = activeTokens.find((t) => t.id === testTokenId);
      expect(found).toBeUndefined();
    });

    // Restore token for subsequent mint tests
    afterAll(async () => {
      if (testTokenId) {
        await updateToken(testTokenId, { is_active: true });
      }
    });
  });

  // ---------------------------------------------------------------------------
  // MINTS
  // ---------------------------------------------------------------------------
  describe('mints', () => {
    it('records a mint without a token reference', async () => {
      const mint = await recordMint({
        collection_id: testCollectionId,
        minter_address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        provider: 'onchainkit',
        quantity: 2,
        account_id: null,
      });

      testMintId = mint.id;

      expect(mint.id).toBeDefined();
      expect(mint.collection_id).toBe(testCollectionId);
      expect(mint.minter_address).toBe('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
      expect(mint.quantity).toBe(2);
      expect(mint.status).toBe('pending');
      expect(mint.token_id).toBeNull();
      expect(mint.tx_hash).toBeNull();
    });

    it('records a mint with a token reference', async () => {
      const mint = await recordMint({
        collection_id: testCollectionId,
        token_id: testTokenId,
        minter_address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        provider: 'onchainkit',
        quantity: 1,
        account_id: null,
      });

      testMintWithTokenId = mint.id;

      expect(mint.token_id).toBe(testTokenId);
      expect(mint.minter_address).toBe('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
    });

    it('updateMintStatus changes status and optionally sets tx_hash', async () => {
      const updated = await updateMintStatus(
        testMintId,
        'confirmed',
        '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
      );

      expect(updated.id).toBe(testMintId);
      expect(updated.status).toBe('confirmed');
      expect(updated.tx_hash).toBe(
        '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
      );
    });

    it('getMintsByAccount returns empty array for a non-existent account', async () => {
      const fakeAccountId = '00000000-0000-0000-0000-000000000099';
      const mints = await getMintsByAccount(fakeAccountId);

      expect(mints).toEqual([]);
    });

    it('getMintsByCollection returns mints for the collection', async () => {
      const mints = await getMintsByCollection(testCollectionId);

      expect(mints.length).toBeGreaterThanOrEqual(2);
      const ids = mints.map((m) => m.id);
      expect(ids).toContain(testMintId);
      expect(ids).toContain(testMintWithTokenId);
    });

    it('getMintsByCollection respects the limit option', async () => {
      const mints = await getMintsByCollection(testCollectionId, { limit: 1 });

      expect(mints.length).toBe(1);
    });

    it('getMintStats returns aggregate statistics', async () => {
      const stats = await getMintStats();

      // We have at least 2 mints from this test run (quantities 2 and 1)
      expect(stats.totalMints).toBeGreaterThanOrEqual(2);
      expect(stats.totalQuantity).toBeGreaterThanOrEqual(3);
      expect(stats.uniqueMinters).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(stats.recentMints)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // SETTINGS
  // ---------------------------------------------------------------------------
  describe('settings', () => {
    it('setSetting creates a new setting', async () => {
      const setting = await setSetting(testSettingKey, { enabled: true, count: 42 });

      expect(setting.key).toBe(testSettingKey);
      expect(setting.value).toEqual({ enabled: true, count: 42 });
      expect(setting.id).toBeDefined();
    });

    it('getSetting retrieves the setting by key', async () => {
      const setting = await getSetting(testSettingKey);

      expect(setting).not.toBeNull();
      expect(setting!.key).toBe(testSettingKey);
      expect(setting!.value).toEqual({ enabled: true, count: 42 });
    });

    it('getSetting returns null for non-existent key', async () => {
      const setting = await getSetting('non-existent-key-that-should-not-exist');

      expect(setting).toBeNull();
    });

    it('setSetting upserts an existing setting', async () => {
      const updated = await setSetting(testSettingKey, { enabled: false, count: 99 });

      expect(updated.key).toBe(testSettingKey);
      expect(updated.value).toEqual({ enabled: false, count: 99 });
    });

    it('getAllSettings includes our test setting', async () => {
      const allSettings = await getAllSettings();

      const found = allSettings.find((s) => s.key === testSettingKey);
      expect(found).toBeDefined();
      expect(found!.value).toEqual({ enabled: false, count: 99 });
    });
  });
});
