/**
 * Enhanced admin audit logging with before/after value tracking.
 */

import { createUntypedServerClient } from './db';
import type { AdminAction, AdminResourceType, AdminAuditEntry } from '@/types/admin';

interface LogAdminAuditParams {
  accountId: string;
  action: AdminAction;
  resourceType: AdminResourceType;
  resourceId?: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  success?: boolean;
  errorMessage?: string;
  ipHash?: string;
  requestId?: string;
}

/**
 * Write one entry to the admin audit log.
 */
export async function logAdminAudit(params: LogAdminAuditParams): Promise<void> {
  const supabase = createUntypedServerClient();

  const { error } = await supabase.from('admin_audit_log').insert({
    account_id: params.accountId,
    action: params.action,
    resource_type: params.resourceType,
    resource_id: params.resourceId ?? null,
    previous_value: params.previousValue ?? null,
    new_value: params.newValue ?? null,
    metadata: params.metadata ?? {},
    success: params.success ?? true,
    error_message: params.errorMessage ?? null,
    ip_hash: params.ipHash ?? null,
    request_id: params.requestId ?? null,
  });

  if (error) {
    // Audit log failures should not break the caller
    console.error('[AdminAudit] Failed to log:', error.message);
  }
}

/**
 * Wrap an async operation with automatic audit logging.
 * Captures previous_value before and new_value after execution.
 *
 * @param params  Audit metadata (action, resource, account, etc.)
 * @param getPreviousValue  Optional fn that returns the value before mutation
 * @param operation  The mutation to execute. Its return value becomes new_value.
 */
export async function withAuditLog<T extends Record<string, unknown>>(
  params: Omit<LogAdminAuditParams, 'previousValue' | 'newValue' | 'success' | 'errorMessage'>,
  getPreviousValue: (() => Promise<Record<string, unknown> | undefined>) | undefined,
  operation: () => Promise<T>
): Promise<T> {
  const previousValue = getPreviousValue ? await getPreviousValue() : undefined;

  try {
    const result = await operation();
    await logAdminAudit({
      ...params,
      previousValue,
      newValue: result,
      success: true,
    });
    return result;
  } catch (err) {
    await logAdminAudit({
      ...params,
      previousValue,
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Query the admin audit log with optional filters.
 */
export async function getAuditLog(options: {
  accountId?: string;
  action?: AdminAction;
  resourceType?: AdminResourceType;
  resourceId?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminAuditEntry[]> {
  const supabase = createUntypedServerClient();

  let query = supabase
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false });

  if (options.accountId) {
    query = query.eq('account_id', options.accountId);
  }
  if (options.action) {
    query = query.eq('action', options.action);
  }
  if (options.resourceType) {
    query = query.eq('resource_type', options.resourceType);
  }
  if (options.resourceId) {
    query = query.eq('resource_id', options.resourceId);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch audit log: ${error.message}`);
  }

  return (data ?? []).map(mapAuditRow);
}

/**
 * Get a single audit log entry by ID.
 */
export async function getAuditEntry(id: string): Promise<AdminAuditEntry | null> {
  const supabase = createUntypedServerClient();

  const { data, error } = await supabase.from('admin_audit_log').select('*').eq('id', id).single();

  if (error || !data) return null;
  return mapAuditRow(data);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAuditRow(row: any): AdminAuditEntry {
  return {
    id: row.id,
    accountId: row.account_id,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id ?? undefined,
    previousValue: row.previous_value ?? undefined,
    newValue: row.new_value ?? undefined,
    metadata: row.metadata ?? undefined,
    success: row.success,
    errorMessage: row.error_message ?? undefined,
    ipHash: row.ip_hash ?? undefined,
    requestId: row.request_id ?? undefined,
    createdAt: row.created_at,
  };
}
