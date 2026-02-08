import { createUntypedServerClient, type Database } from './db';

type FarcasterUserRow = Database['public']['Tables']['farcaster_users']['Row'];

export async function upsertFarcasterUser(
  accountId: string,
  fid: number,
  username?: string,
  displayName?: string,
  pfpUrl?: string
): Promise<FarcasterUserRow> {
  const supabase = createUntypedServerClient();

  const { data, error } = await supabase
    .from('farcaster_users')
    .upsert(
      {
        account_id: accountId,
        fid,
        username: username || null,
        display_name: displayName || null,
        pfp_url: pfpUrl || null,
        removed_at: null, // Clear removal if re-adding
      },
      { onConflict: 'fid' }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to upsert Farcaster user: ${error.message}`);
  }

  return data as FarcasterUserRow;
}

export async function getFarcasterUserByFid(
  fid: number
): Promise<FarcasterUserRow | null> {
  const supabase = createUntypedServerClient();

  const { data, error } = await supabase
    .from('farcaster_users')
    .select('*')
    .eq('fid', fid)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get Farcaster user: ${error.message}`);
  }

  return data as FarcasterUserRow | null;
}

export async function updateNotificationToken(
  fid: number,
  details: { url: string; token: string } | null,
  enabled: boolean
): Promise<void> {
  const supabase = createUntypedServerClient();

  const { error } = await supabase
    .from('farcaster_users')
    .update({
      notification_url: details?.url || null,
      notification_token: details?.token || null,
      notifications_enabled: enabled,
    })
    .eq('fid', fid);

  if (error) {
    throw new Error(`Failed to update notification token: ${error.message}`);
  }
}

export async function markFarcasterUserRemoved(fid: number): Promise<void> {
  const supabase = createUntypedServerClient();

  const { error } = await supabase
    .from('farcaster_users')
    .update({
      removed_at: new Date().toISOString(),
      notifications_enabled: false,
      notification_url: null,
      notification_token: null,
    })
    .eq('fid', fid);

  if (error) {
    throw new Error(`Failed to mark Farcaster user removed: ${error.message}`);
  }
}

export async function getNotificationEnabledUsers(): Promise<FarcasterUserRow[]> {
  const supabase = createUntypedServerClient();

  const { data, error } = await supabase
    .from('farcaster_users')
    .select('*')
    .eq('notifications_enabled', true)
    .is('removed_at', null);

  if (error) {
    throw new Error(`Failed to get notification-enabled users: ${error.message}`);
  }

  return (data || []) as FarcasterUserRow[];
}
