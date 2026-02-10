import { NextResponse } from 'next/server';
import { app, farcaster } from '@/lib/config';

export async function GET() {
  const manifest = {
    accountAssociation: {
      header: farcaster.accountHeader,
      payload: farcaster.accountPayload,
      signature: farcaster.accountSignature,
    },
    miniapp: {
      version: '1',
      name: app.name,
      homeUrl: app.url,
      iconUrl: farcaster.iconUrl || `${app.url}/icon.png`,
      splashImageUrl: farcaster.splashImageUrl || `${app.url}/splash.png`,
      splashBackgroundColor: farcaster.splashBgColor,
      webhookUrl: `${app.url}/api/farcaster/webhook`,
      requiredChains: ['eip155:8453'],
    },
  };

  return NextResponse.json(manifest, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
