import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllSettings, setSetting } from '@/lib/nft-db';
import { getUserByAddress } from '@/lib/db';
import { apiMiddleware } from '@/lib/middleware';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const middlewareResult = await apiMiddleware(request, { requireAdmin: true });
  if (middlewareResult) return middlewareResult;

  try {
    const settings = await getAllSettings();

    const formatted = settings.map((s) => ({
      id: s.id,
      key: s.key,
      value: s.value,
      description: s.description,
      updatedBy: s.updated_by,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));

    return NextResponse.json({ settings: formatted });
  } catch (error) {
    console.error('Get settings error:', error);
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

    const user = await getUserByAddress(session.address);
    const body = await request.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const setting = await setSetting(key, value, user?.id);

    return NextResponse.json({
      setting: {
        id: setting.id,
        key: setting.key,
        value: setting.value,
        description: setting.description,
        updatedBy: setting.updated_by,
        createdAt: setting.created_at,
        updatedAt: setting.updated_at,
      },
    });
  } catch (error) {
    console.error('Update setting error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
