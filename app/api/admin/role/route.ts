import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserRole } from '@/lib/admin';
import { apiMiddleware } from '@/lib/middleware';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const middlewareResult = await apiMiddleware(request, { requireAuth: true });
  if (middlewareResult) return middlewareResult;

  try {
    const session = await getSession();
    if (!session.address) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const role = await getUserRole(session.address);

    return NextResponse.json({
      role,
      isAdmin: role === 'admin' || role === 'superadmin',
      isSuperAdmin: role === 'superadmin',
    });
  } catch (error) {
    console.error('Get role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
