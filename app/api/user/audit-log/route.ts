import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createUntypedServerClient } from '@/lib/db';
import { features } from '@/lib/config';
import { logApiRequest } from '@/lib/audit';

export interface AuditLogEntry {
  id: string;
  endpoint: string;
  method: string;
  response_status: number;
  response_time_ms: number | null;
  created_at: string;
}

// GET - Fetch user's audit log entries
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Check if feature is enabled
  if (!features.showUserAuditLog) {
    return NextResponse.json({ error: 'Feature not enabled' }, { status: 404 });
  }

  const session = await getSession();

  if (!session.isLoggedIn || !session.address) {
    await logApiRequest({
      endpoint: '/api/user/audit-log',
      method: 'GET',
      responseStatus: 401,
      responseTimeMs: Date.now() - startTime,
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');

  const supabase = createUntypedServerClient();

  // First get the account ID for this address (addresses are stored lowercase)
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id')
    .eq('address', session.address.toLowerCase())
    .single();

  if (accountError || !account) {
    await logApiRequest({
      endpoint: '/api/user/audit-log',
      method: 'GET',
      responseStatus: 200,
      responseTimeMs: Date.now() - startTime,
    });
    return NextResponse.json({ entries: [], total: 0 });
  }

  // Fetch audit log entries for this user
  const { data: entries, error: entriesError, count } = await supabase
    .from('api_audit_log')
    .select('id, endpoint, method, response_status, response_time_ms, created_at', { count: 'exact' })
    .eq('account_id', account.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (entriesError) {
    console.error('Error fetching audit log:', entriesError);
    await logApiRequest({
      endpoint: '/api/user/audit-log',
      method: 'GET',
      accountId: account.id,
      responseStatus: 500,
      responseTimeMs: Date.now() - startTime,
    });
    return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 });
  }

  await logApiRequest({
    endpoint: '/api/user/audit-log',
    method: 'GET',
    accountId: account.id,
    responseStatus: 200,
    responseTimeMs: Date.now() - startTime,
  });

  return NextResponse.json({
    entries: entries as AuditLogEntry[],
    total: count || 0,
    limit,
    offset,
  });
}
