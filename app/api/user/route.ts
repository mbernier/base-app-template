import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserByAddress, createUntypedServerClient, Database } from '@/lib/db';
import { apiMiddleware } from '@/lib/middleware';

// GET - Get current user
export async function GET(request: NextRequest) {
  const middlewareResult = await apiMiddleware(request, { requireAuth: true });
  if (middlewareResult) return middlewareResult;

  try {
    const session = await getSession();
    if (!session.address) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await getUserByAddress(session.address);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        address: user.address,
        username: user.username,
        avatarUrl: user.avatar_url,
        tosAcceptedVersion: user.tos_accepted_version,
        tosAcceptedAt: user.tos_accepted_at,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update current user
export async function PATCH(request: NextRequest) {
  const middlewareResult = await apiMiddleware(request, { requireAuth: true });
  if (middlewareResult) return middlewareResult;

  try {
    const session = await getSession();
    if (!session.address) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { username, avatarUrl } = body;

    // Validate username if provided
    if (username !== undefined) {
      if (username !== null && (typeof username !== 'string' || username.length > 50)) {
        return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
      }
    }

    const supabase = createUntypedServerClient();
    const { data, error } = await supabase
      .from('accounts')
      .update({
        username: username ?? undefined,
        avatar_url: avatarUrl ?? undefined,
      })
      .eq('address', session.address.toLowerCase())
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const userData = data as Database['public']['Tables']['accounts']['Row'];

    return NextResponse.json({
      user: {
        id: userData.id,
        address: userData.address,
        username: userData.username,
        avatarUrl: userData.avatar_url,
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
