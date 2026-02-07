import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isSuperAdmin, updateUserRole } from '@/lib/admin';
import { createUntypedServerClient } from '@/lib/db';
import { apiMiddleware } from '@/lib/middleware';
import type { UserRole } from '@/types/admin';

const VALID_ROLES: UserRole[] = ['user', 'admin', 'superadmin'];

export async function GET(request: NextRequest): Promise<NextResponse> {
  const middlewareResult = await apiMiddleware(request, { requireAdmin: true });
  if (middlewareResult) return middlewareResult;

  try {
    const supabase = createUntypedServerClient();

    const { data, error } = await supabase
      .from('accounts')
      .select('id, address, username, avatar_url, role, created_at, last_seen_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const users = (data ?? []).map((user: Record<string, unknown>) => ({
      id: user.id,
      address: user.address,
      username: user.username,
      avatarUrl: user.avatar_url,
      role: user.role,
      createdAt: user.created_at,
      lastSeenAt: user.last_seen_at,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('List users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const middlewareResult = await apiMiddleware(request, { requireAdmin: true });
  if (middlewareResult) return middlewareResult;

  try {
    const session = await getSession();
    if (!session.address) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Only superadmins can change roles
    const superAdmin = await isSuperAdmin(session.address);
    if (!superAdmin) {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { address, role } = body;

    if (!address || !role) {
      return NextResponse.json({ error: 'Address and role required' }, { status: 400 });
    }

    if (!VALID_ROLES.includes(role as UserRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    await updateUserRole(address, role as UserRole);

    return NextResponse.json({ success: true, address, role });
  } catch (error) {
    console.error('Update user role error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
