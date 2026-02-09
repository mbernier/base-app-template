import { NextRequest, NextResponse } from 'next/server';
import { apiMiddleware } from '@/lib/middleware';
import { getAuditLog } from '@/lib/admin-audit';
import { AdminPermission } from '@/types/admin';
import type { AdminAction, AdminResourceType } from '@/types/admin';

/**
 * GET /api/admin/audit
 * Query the enhanced admin audit log.
 * Query params: accountId, action, resourceType, resourceId, limit, offset
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const middlewareResult = await apiMiddleware(request, {
    requireAdmin: true,
    requirePermission: AdminPermission.VIEW_AUDIT_LOG,
  });
  if (middlewareResult) return middlewareResult;

  const searchParams = request.nextUrl.searchParams;

  const entries = await getAuditLog({
    accountId: searchParams.get('accountId') ?? undefined,
    action: (searchParams.get('action') as AdminAction) ?? undefined,
    resourceType: (searchParams.get('resourceType') as AdminResourceType) ?? undefined,
    resourceId: searchParams.get('resourceId') ?? undefined,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
    offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
  });

  return NextResponse.json({ entries });
}
