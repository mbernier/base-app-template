import { NextRequest, NextResponse } from 'next/server';
import { apiMiddleware } from '@/lib/middleware';
import { getSession } from '@/lib/auth';
import { revokePermission, getAccountIdByAddress } from '@/lib/admin-permissions';
import { AdminPermission } from '@/types/admin';

/**
 * DELETE /api/admin/permissions/[id]
 * Revoke a permission from an account.
 * Body: { accountId: string, permission: AdminPermission }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const middlewareResult = await apiMiddleware(request, {
    requireAdmin: true,
    requirePermission: AdminPermission.MANAGE_PERMISSIONS,
  });
  if (middlewareResult) return middlewareResult;

  const session = await getSession();
  const { id: accountId } = await params;
  const body = await request.json();

  const { permission } = body as { permission: AdminPermission };

  if (!permission) {
    return NextResponse.json({ error: 'permission is required' }, { status: 400 });
  }

  if (!Object.values(AdminPermission).includes(permission)) {
    return NextResponse.json({ error: 'Invalid permission value' }, { status: 400 });
  }

  const revokerAccountId = await getAccountIdByAddress(session.address!);
  if (!revokerAccountId) {
    return NextResponse.json({ error: 'Revoker account not found' }, { status: 400 });
  }

  await revokePermission(accountId, permission, revokerAccountId);
  return NextResponse.json({ success: true });
}
