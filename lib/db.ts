import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { database } from './config';

// Database types (extend these based on your schema)
export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string;
          address: string;
          chain_id: number;
          username: string | null;
          avatar_url: string | null;
          tos_accepted_version: string | null;
          tos_accepted_at: string | null;
          created_at: string;
          updated_at: string;
          last_seen_at: string;
        };
        Insert: {
          id?: string;
          address: string;
          chain_id?: number;
          username?: string | null;
          avatar_url?: string | null;
          tos_accepted_version?: string | null;
          tos_accepted_at?: string | null;
          created_at?: string;
          updated_at?: string;
          last_seen_at?: string;
        };
        Update: {
          id?: string;
          address?: string;
          chain_id?: number;
          username?: string | null;
          avatar_url?: string | null;
          tos_accepted_version?: string | null;
          tos_accepted_at?: string | null;
          created_at?: string;
          updated_at?: string;
          last_seen_at?: string;
        };
      };
      page_visits: {
        Row: {
          id: string;
          anonymous_id: string;
          account_id: string | null;
          path: string;
          referrer: string | null;
          query_params: Record<string, unknown> | null;
          user_agent: string | null;
          screen_width: number | null;
          screen_height: number | null;
          session_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          anonymous_id: string;
          account_id?: string | null;
          path: string;
          referrer?: string | null;
          query_params?: Record<string, unknown> | null;
          user_agent?: string | null;
          screen_width?: number | null;
          screen_height?: number | null;
          session_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          anonymous_id?: string;
          account_id?: string | null;
          path?: string;
          referrer?: string | null;
          query_params?: Record<string, unknown> | null;
          user_agent?: string | null;
          screen_width?: number | null;
          screen_height?: number | null;
          session_id?: string | null;
          created_at?: string;
        };
      };
      analytics_events: {
        Row: {
          id: string;
          event_type: string;
          anonymous_id: string;
          account_id: string | null;
          properties: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_type: string;
          anonymous_id: string;
          account_id?: string | null;
          properties?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_type?: string;
          anonymous_id?: string;
          account_id?: string | null;
          properties?: Record<string, unknown> | null;
          created_at?: string;
        };
      };
    };
  };
}

// Create Supabase client for client-side usage
export function createBrowserClient(): SupabaseClient<Database> {
  return createClient<Database>(database.supabaseUrl, database.supabaseAnonKey);
}

// Create Supabase client for server-side usage (with service role)
export function createServerClient(): SupabaseClient<Database> {
  return createClient<Database>(database.supabaseUrl, database.supabaseServiceRoleKey);
}

// Create untyped Supabase client for analytics (simpler to use)
export function createUntypedServerClient(): SupabaseClient {
  return createClient(database.supabaseUrl, database.supabaseServiceRoleKey);
}

// User operations
export interface UpsertUserInput {
  address: string;
  chainId: number;
}

export async function upsertUser(
  input: UpsertUserInput
): Promise<Database['public']['Tables']['accounts']['Row']> {
  const supabase = createUntypedServerClient();

  const { data, error } = await supabase
    .from('accounts')
    .upsert(
      {
        address: input.address.toLowerCase(),
        chain_id: input.chainId,
        last_seen_at: new Date().toISOString(),
      },
      {
        onConflict: 'address',
      }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to upsert user: ${error.message}`);
  }

  return data as Database['public']['Tables']['accounts']['Row'];
}

export async function getUserByAddress(
  address: string
): Promise<Database['public']['Tables']['accounts']['Row'] | null> {
  const supabase = createUntypedServerClient();

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('address', address.toLowerCase())
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get user: ${error.message}`);
  }

  return data as Database['public']['Tables']['accounts']['Row'] | null;
}

export async function updateTosAcceptance(
  address: string,
  version: string
): Promise<Database['public']['Tables']['accounts']['Row']> {
  const supabase = createUntypedServerClient();

  const { data, error } = await supabase
    .from('accounts')
    .update({
      tos_accepted_version: version,
      tos_accepted_at: new Date().toISOString(),
    })
    .eq('address', address.toLowerCase())
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update ToS acceptance: ${error.message}`);
  }

  return data as Database['public']['Tables']['accounts']['Row'];
}
