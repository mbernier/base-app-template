import { createUntypedServerClient, Database } from './db';
import type { NFTProvider, MintStatus } from '@/types/nft';

type CollectionRow = Database['public']['Tables']['nft_collections']['Row'];
type TokenRow = Database['public']['Tables']['nft_tokens']['Row'];
type MintRow = Database['public']['Tables']['nft_mints']['Row'];
type SettingRow = Database['public']['Tables']['app_settings']['Row'];

// =============================================================================
// COLLECTIONS
// =============================================================================

export async function getCollections(options?: {
  activeOnly?: boolean;
  provider?: NFTProvider;
}): Promise<CollectionRow[]> {
  const supabase = createUntypedServerClient();

  let query = supabase.from('nft_collections').select('*').order('created_at', { ascending: false });

  if (options?.activeOnly) {
    query = query.eq('is_active', true);
  }
  if (options?.provider) {
    query = query.eq('provider', options.provider);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get collections: ${error.message}`);
  }

  return (data ?? []) as CollectionRow[];
}

export async function getCollectionById(id: string): Promise<CollectionRow | null> {
  const supabase = createUntypedServerClient();

  const { data, error } = await supabase
    .from('nft_collections')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get collection: ${error.message}`);
  }

  return (data as CollectionRow) ?? null;
}

export async function createCollection(
  input: Database['public']['Tables']['nft_collections']['Insert']
): Promise<CollectionRow> {
  const supabase = createUntypedServerClient();

  const { data, error } = await supabase
    .from('nft_collections')
    .insert(input)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create collection: ${error.message}`);
  }

  return data as CollectionRow;
}

export async function updateCollection(
  id: string,
  input: Database['public']['Tables']['nft_collections']['Update']
): Promise<CollectionRow> {
  const supabase = createUntypedServerClient();

  const { data, error } = await supabase
    .from('nft_collections')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update collection: ${error.message}`);
  }

  return data as CollectionRow;
}

export async function deleteCollection(id: string): Promise<void> {
  const supabase = createUntypedServerClient();

  const { error } = await supabase
    .from('nft_collections')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete collection: ${error.message}`);
  }
}

// =============================================================================
// TOKENS
// =============================================================================

export async function getTokensByCollection(
  collectionId: string,
  options?: { activeOnly?: boolean }
): Promise<TokenRow[]> {
  const supabase = createUntypedServerClient();

  let query = supabase
    .from('nft_tokens')
    .select('*')
    .eq('collection_id', collectionId)
    .order('created_at', { ascending: true });

  if (options?.activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get tokens: ${error.message}`);
  }

  return (data ?? []) as TokenRow[];
}

export async function createToken(
  input: Database['public']['Tables']['nft_tokens']['Insert']
): Promise<TokenRow> {
  const supabase = createUntypedServerClient();

  const { data, error } = await supabase
    .from('nft_tokens')
    .insert(input)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create token: ${error.message}`);
  }

  return data as TokenRow;
}

export async function updateToken(
  id: string,
  input: Database['public']['Tables']['nft_tokens']['Update']
): Promise<TokenRow> {
  const supabase = createUntypedServerClient();

  const { data, error } = await supabase
    .from('nft_tokens')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update token: ${error.message}`);
  }

  return data as TokenRow;
}

// =============================================================================
// MINTS
// =============================================================================

export async function recordMint(
  input: Database['public']['Tables']['nft_mints']['Insert']
): Promise<MintRow> {
  const supabase = createUntypedServerClient();

  const { data, error } = await supabase
    .from('nft_mints')
    .insert(input)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to record mint: ${error.message}`);
  }

  return data as MintRow;
}

export async function updateMintStatus(
  id: string,
  status: MintStatus,
  txHash?: string
): Promise<MintRow> {
  const supabase = createUntypedServerClient();

  const update: Database['public']['Tables']['nft_mints']['Update'] = { status };
  if (txHash) {
    update.tx_hash = txHash;
  }

  const { data, error } = await supabase
    .from('nft_mints')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update mint status: ${error.message}`);
  }

  return data as MintRow;
}

export async function getMintsByAccount(accountId: string): Promise<MintRow[]> {
  const supabase = createUntypedServerClient();

  const { data, error } = await supabase
    .from('nft_mints')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get mints: ${error.message}`);
  }

  return (data ?? []) as MintRow[];
}

export async function getMintsByCollection(
  collectionId: string,
  options?: { limit?: number }
): Promise<MintRow[]> {
  const supabase = createUntypedServerClient();

  let query = supabase
    .from('nft_mints')
    .select('*')
    .eq('collection_id', collectionId)
    .order('created_at', { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to get mints: ${error.message}`);
  }

  return (data ?? []) as MintRow[];
}

export async function getMintStats(): Promise<{
  totalMints: number;
  totalQuantity: number;
  uniqueMinters: number;
  recentMints: MintRow[];
}> {
  const supabase = createUntypedServerClient();

  // Get total counts
  const { count: totalMints } = await supabase
    .from('nft_mints')
    .select('*', { count: 'exact', head: true });

  // Get total quantity
  const { data: quantityData } = await supabase
    .from('nft_mints')
    .select('quantity');

  const totalQuantity = (quantityData ?? []).reduce(
    (sum: number, row: { quantity: number }) => sum + row.quantity,
    0
  );

  // Get unique minters
  const { data: minterData } = await supabase
    .from('nft_mints')
    .select('minter_address');

  const uniqueMinters = new Set(
    (minterData ?? []).map((row: { minter_address: string }) => row.minter_address)
  ).size;

  // Get recent mints
  const { data: recentMints } = await supabase
    .from('nft_mints')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  return {
    totalMints: totalMints ?? 0,
    totalQuantity,
    uniqueMinters,
    recentMints: (recentMints ?? []) as MintRow[],
  };
}

// =============================================================================
// SETTINGS
// =============================================================================

export async function getSetting(key: string): Promise<SettingRow | null> {
  const supabase = createUntypedServerClient();

  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('key', key)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get setting: ${error.message}`);
  }

  return (data as SettingRow) ?? null;
}

export async function setSetting(
  key: string,
  value: unknown,
  updatedBy?: string
): Promise<SettingRow> {
  const supabase = createUntypedServerClient();

  const { data, error } = await supabase
    .from('app_settings')
    .upsert(
      {
        key,
        value: value as Record<string, unknown>,
        updated_by: updatedBy ?? null,
      },
      { onConflict: 'key' }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to set setting: ${error.message}`);
  }

  return data as SettingRow;
}

export async function getAllSettings(): Promise<SettingRow[]> {
  const supabase = createUntypedServerClient();

  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .order('key', { ascending: true });

  if (error) {
    throw new Error(`Failed to get settings: ${error.message}`);
  }

  return (data ?? []) as SettingRow[];
}
