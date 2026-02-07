import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { logApiRequest, getAccountIdByAddress } from '@/lib/audit';

export async function POST() {
  const startTime = Date.now();

  try {
    const session = await getSession();
    const address = session.address;

    // Get account ID before destroying session
    let accountId: string | undefined;
    if (address) {
      accountId = (await getAccountIdByAddress(address)) || undefined;
    }

    session.destroy();

    await logApiRequest({
      endpoint: '/api/auth/logout',
      method: 'POST',
      accountId,
      responseStatus: 200,
      responseTimeMs: Date.now() - startTime,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    await logApiRequest({
      endpoint: '/api/auth/logout',
      method: 'POST',
      responseStatus: 500,
      responseTimeMs: Date.now() - startTime,
    });
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}
