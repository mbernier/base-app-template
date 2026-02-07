import { createUntypedServerClient } from './db';
import { headers } from 'next/headers';
import crypto from 'crypto';

interface AuditLogParams {
  endpoint: string;
  method: string;
  accountId?: string;
  anonymousId?: string;
  responseStatus: number;
  responseTimeMs?: number;
}

/**
 * Log an API request to the audit log.
 * This is fire-and-forget - errors are logged but don't affect the response.
 */
export async function logApiRequest(params: AuditLogParams): Promise<void> {
  console.log('[Audit] Starting log for:', params.endpoint, params.method);

  try {
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';

    // Hash IP for privacy
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex').substring(0, 64);

    const supabase = createUntypedServerClient();

    const { error: insertError } = await supabase.from('api_audit_log').insert({
      endpoint: params.endpoint,
      method: params.method,
      account_id: params.accountId || null,
      anonymous_id: params.anonymousId || null,
      response_status: params.responseStatus,
      response_time_ms: params.responseTimeMs || null,
      ip_hash: ipHash,
    });

    if (insertError) {
      console.error('[Audit] Insert error:', insertError);
    } else {
      console.log('[Audit] Logged:', params.endpoint, params.method, params.responseStatus);
    }
  } catch (error) {
    // Log error but don't throw - audit logging shouldn't break the API
    console.error('[Audit] Failed to log request:', error);
  }
}

/**
 * Helper to get account ID from address
 */
export async function getAccountIdByAddress(address: string): Promise<string | null> {
  try {
    const supabase = createUntypedServerClient();
    const { data } = await supabase
      .from('accounts')
      .select('id')
      .eq('address', address.toLowerCase())
      .single();

    return data?.id || null;
  } catch {
    return null;
  }
}
