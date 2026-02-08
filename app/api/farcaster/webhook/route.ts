import { NextRequest, NextResponse } from 'next/server';
import { apiMiddleware } from '@/lib/middleware';
import {
  upsertFarcasterUser,
  updateNotificationToken,
  markFarcasterUserRemoved,
  getFarcasterUserByFid,
} from '@/lib/farcaster';
import { upsertUser } from '@/lib/db';
import { logApiRequest } from '@/lib/audit';
import { blockchain } from '@/lib/config';
import type { FarcasterWebhookEvent } from '@/types/farcaster';

// TODO: Add JFS (JSON Farcaster Signature) verification for production.
// See: https://miniapps.farcaster.xyz/docs/guides/webhooks#verifying-webhook-signatures

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // No auth required — webhooks are server-to-server
  const middlewareResult = await apiMiddleware(request, { requireAuth: false });
  if (middlewareResult) return middlewareResult;

  try {
    const body = (await request.json()) as FarcasterWebhookEvent;
    const { event, fid, notificationDetails } = body;

    if (!event || !fid) {
      const status = 400;
      await logApiRequest({
        endpoint: '/api/farcaster/webhook',
        method: 'POST',
        responseStatus: status,
        responseTimeMs: Date.now() - startTime,
      });
      return NextResponse.json({ error: 'event and fid are required' }, { status });
    }

    switch (event) {
      case 'miniapp_added': {
        // Ensure the user exists in accounts (using a placeholder address if we don't have one)
        const existingUser = await getFarcasterUserByFid(fid);
        if (!existingUser) {
          // Create a minimal account — address will be updated on first auth
          const account = await upsertUser({
            address: `0x${'0'.repeat(40)}`, // Placeholder
            chainId: blockchain.chainId,
          });
          await upsertFarcasterUser(account.id, fid);
        }

        // Store notification token if provided
        if (notificationDetails) {
          await updateNotificationToken(fid, notificationDetails, true);
        }
        break;
      }

      case 'miniapp_removed': {
        await markFarcasterUserRemoved(fid);
        break;
      }

      case 'notifications_enabled': {
        if (notificationDetails) {
          await updateNotificationToken(fid, notificationDetails, true);
        }
        break;
      }

      case 'notifications_disabled': {
        await updateNotificationToken(fid, null, false);
        break;
      }

      default: {
        const status = 400;
        await logApiRequest({
          endpoint: '/api/farcaster/webhook',
          method: 'POST',
          responseStatus: status,
          responseTimeMs: Date.now() - startTime,
        });
        return NextResponse.json({ error: `Unknown event: ${event}` }, { status });
      }
    }

    const status = 200;
    await logApiRequest({
      endpoint: '/api/farcaster/webhook',
      method: 'POST',
      responseStatus: status,
      responseTimeMs: Date.now() - startTime,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Farcaster webhook error:', error);
    const status = 500;
    await logApiRequest({
      endpoint: '/api/farcaster/webhook',
      method: 'POST',
      responseStatus: status,
      responseTimeMs: Date.now() - startTime,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status });
  }
}
