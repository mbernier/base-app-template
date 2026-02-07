import { NextResponse } from 'next/server';
import { createUntypedServerClient } from '@/lib/db';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: {
      status: 'connected' | 'disconnected';
      latencyMs?: number;
    };
  };
  version: string;
}

/**
 * Health check endpoint for monitoring and deployment verification.
 * Returns service status including database connectivity.
 */
export async function GET(): Promise<NextResponse<HealthStatus>> {
  const timestamp = new Date().toISOString();
  let dbStatus: 'connected' | 'disconnected' = 'disconnected';
  let dbLatency: number | undefined;

  try {
    const start = Date.now();
    const supabase = createUntypedServerClient();
    // Simple query to check connectivity
    await supabase.from('accounts').select('id').limit(1);
    dbLatency = Date.now() - start;
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  const overallStatus = dbStatus === 'connected' ? 'healthy' : 'degraded';

  return NextResponse.json({
    status: overallStatus,
    timestamp,
    services: {
      database: {
        status: dbStatus,
        latencyMs: dbLatency,
      },
    },
    version: process.env.npm_package_version || '1.0.0',
  });
}
