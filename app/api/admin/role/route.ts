import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { apiMiddleware } from '@/lib/middleware';
import { getAdminPermissions } from '@/lib/admin-permissions';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const middlewareResult = await apiMiddleware(request, { requireAuth: true });
  if (middlewareResult) return middlewareResult;

  try {
    const session = await getSession();
    if (!session.address) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { role, permissions } = await getAdminPermissions(session.address);

    return NextResponse.json({
      role,
      isAdmin: role === 'admin' || role === 'superadmin',
      isSuperAdmin: role === 'superadmin',
      permissions,
    });
  } catch (error) {
    console.error('Get role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
