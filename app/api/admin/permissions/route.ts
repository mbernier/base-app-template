import { NextRequest, NextResponse } from 'next/server';
import { apiMiddleware } from '@/lib/middleware';
import { getSession } from '@/lib/auth';
import {
  getPermissionGrants,
  grantPermission,
  getAccountIdByAddress,
} from '@/lib/admin-permissions';
import { AdminPermission } from '@/types/admin';

/**
 * GET /api/admin/permissions?accountId=<uuid>
 * List permission grants for an account.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const middlewareResult = await apiMiddleware(request, {
    requireAdmin: true,
    requirePermission: AdminPermission.MANAGE_PERMISSIONS,
  });
  if (middlewareResult) return middlewareResult;

  const accountId = request.nextUrl.searchParams.get('accountId');
  if (!accountId) {
    return NextResponse.json({ error: 'accountId query parameter required' }, { status: 400 });
  }

  const grants = await getPermissionGrants(accountId);
  return NextResponse.json({ grants });
}

/**
 * POST /api/admin/permissions
 * Grant a permission to an account.
 * Body: { accountId: string, permission: AdminPermission, signature?: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const middlewareResult = await apiMiddleware(request, {
    requireAdmin: true,
    requirePermission: AdminPermission.MANAGE_PERMISSIONS,
  });
  if (middlewareResult) return middlewareResult;

  const session = await getSession();
  const body = await request.json();

  const { accountId, permission, signature } = body as {
    accountId: string;
    permission: AdminPermission;
    signature?: string;
  };

  if (!accountId || !permission) {
    return NextResponse.json({ error: 'accountId and permission are required' }, { status: 400 });
  }

  // Validate permission value
  if (!Object.values(AdminPermission).includes(permission)) {
    return NextResponse.json({ error: 'Invalid permission value' }, { status: 400 });
  }

  const granterAccountId = await getAccountIdByAddress(session.address!);
  if (!granterAccountId) {
    return NextResponse.json({ error: 'Granter account not found' }, { status: 400 });
  }

  const grant = await grantPermission(accountId, permission, granterAccountId, signature);
  return NextResponse.json({ grant }, { status: 201 });
}
